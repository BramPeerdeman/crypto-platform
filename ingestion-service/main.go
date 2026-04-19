package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

type PriceTracker struct {
	rdb        		 *redis.Client
	lastPrices 		 map[string]float64
	mu         		 sync.RWMutex
	candleTracker *CandleTracker
}

func NewPriceTracker() *PriceTracker {
	redisAddr := os.Getenv("REDIS_URL")
	if redisAddr == "" {
		redisAddr = "localhost:6379" 
	}

	rdb := redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: "",
		DB:       0,
	})

	return &PriceTracker{
		rdb:        rdb,
		lastPrices: make(map[string]float64),
		candleTracker: NewCandleTracker(rdb),
	}
}

type BinanceTrade struct {
	Symbol string `json:"s"`
	Price  string `json:"p"`
	Quantity string `json:"q"`
}

type CombinedResponse struct {
	Stream string       `json:"stream"`
	Data   BinanceTrade `json:"data"`
}

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelDebug,
	}))
	slog.SetDefault(logger)

	tracker := NewPriceTracker()
	symbols := []string{"btcusdt", "ethusdt", "solusdt", "bnbusdt"}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, syscall.SIGINT)
	defer stop()

	runWithReconnect(ctx, tracker, symbols)

	slog.Info("Shutting down, closing Redis connection...")

	if err := tracker.rdb.Close(); err != nil {
		slog.Error("Error closing Redis", "error", err)
	}

	slog.Info("Shutdown complete")
}

func runWithReconnect(ctx context.Context, tracker *PriceTracker, symbols []string) {
	const (
		initialBackoff  = 1 * time.Second
		maxBackoff      = 30 * time.Second
		stableThreshold = 60 * time.Second
	)

	backoff := initialBackoff

	for {
		if ctx.Err() != nil {
			slog.Info("Context cancelled, stopping reconnect loop")
			return
		}

		slog.Info("Connecting to Binance WebSocket...")

		connectedAt := time.Now()
		err := runConnection(ctx, tracker, symbols)

		if ctx.Err() != nil {
			slog.Info("Shutting down cleanly")
			return
		}

		if time.Since(connectedAt) > stableThreshold {
			slog.Info("Connection was stable, resetting backoff")
			backoff = initialBackoff
		}

		if err != nil {
			slog.Error("Connection lost", "error", err, "next_retry", backoff)
		}

		select {
		case <-ctx.Done():
			slog.Info("Shutdown signal received during backoff")
			return
		case <-time.After(backoff):
		}

		backoff *= 2
		if backoff > maxBackoff {
			backoff = maxBackoff
		}
	}
}

func runConnection(ctx context.Context, tracker *PriceTracker, symbols []string) error {
	conn, err := connectWebSocket(symbols)
	if err != nil {
		return err
	}
	defer conn.Close()

	slog.Info("Connected successfully")

	go func() {
		<-ctx.Done()
		slog.Info("Closing WebSocket connection...")
		conn.WriteMessage(
			websocket.CloseMessage,
			websocket.FormatCloseMessage(websocket.CloseNormalClosure, "shutdown"),
		)
		conn.Close()
	}()

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			slog.Error("read error", "error", err)
			return err
		}
		handleMessage(message, tracker)
	}
}

func (pt *PriceTracker) ProcessTrade(symbol string, price float64, quantity float64) {
	pt.mu.Lock()
	defer pt.mu.Unlock()

	oldPrice, exists := pt.lastPrices[symbol]

	if exists && oldPrice == price {
		return
	}

	diff := 0.0
	if exists {
		diff = ((price - oldPrice) / oldPrice) * 100
	}
	pt.lastPrices[symbol] = price

	channel := "price." + symbol
	payload := fmt.Sprintf("%.2f", price)

	err := pt.rdb.Publish(context.Background(), channel, payload).Err()
	if err != nil {
		slog.Error("Redis Publish failed", "error", err)
	}

	pt.candleTracker.ProcessTick(symbol, price, quantity)

	pt.display(symbol, price, diff)
}

func handleMessage(message []byte, pt *PriceTracker) {
	var res CombinedResponse

	if err := json.Unmarshal(message, &res); err != nil {
		slog.Error("Failed to unmarshal message", "error", err)
		return
	}

	symbol := res.Data.Symbol
	newPrice, err := strconv.ParseFloat(res.Data.Price, 64)
	if err != nil {
		slog.Error("Failed to parse price", "error", err)
		return
	}

	quantity, err := strconv.ParseFloat(res.Data.Quantity, 64)
	if err != nil {
		slog.Error("Failed to parse quantity", "error", err)
		return
	}

	pt.ProcessTrade(symbol, newPrice, quantity)
}

func (pt *PriceTracker) display(symbol string, price float64, diff float64) {
	direction := "   "
	if diff > 0 {
		direction = "🚀 +"
	} else if diff < 0 {
		direction = "📉 "
	}

	slog.Debug("Price update",
    "symbol", symbol,
    "price", price,
    "change_pct", diff,
		"direction", direction,
		)}

func connectWebSocket(symbols []string) (*websocket.Conn, error) {
	endpoint := strings.Join(symbols, "@trade/") + "@trade"
	socketUrl := "wss://stream.binance.com:9443/stream?streams=" + endpoint

	conn, _, err := websocket.DefaultDialer.Dial(socketUrl, nil)
	if err != nil {
		slog.Error("dial failed", "error", err)
		return nil, err
	}

	return conn, nil
}
