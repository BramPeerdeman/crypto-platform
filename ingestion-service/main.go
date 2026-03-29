package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"strings"
	"sync"

	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

type PriceTracker struct {
	rdb *redis.Client
	lastPrices map[string]float64
	mu sync.RWMutex
}

func NewPriceTracker() *PriceTracker {
	rdb := redis.NewClient(&redis.Options{
		Addr:     "redis:6379", 
		Password: "", 
		DB:       0,
	})

	return &PriceTracker{
		rdb: rdb,
		lastPrices: make(map[string]float64),
	}
}

type BinanceTrade struct {
	Symbol string `json:"s"`
	Price  string `json:"p"`
}

type CombinedResponse struct {
	Stream string       `json:"stream"`
	Data   BinanceTrade `json:"data"`
}

func main() {
	tracker := NewPriceTracker()
	symbols := []string{"btcusdt", "ethusdt", "solusdt"}
	
	conn := connectWebSocket(symbols)
	defer conn.Close()

	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			break
		}
		
		handleMessage(message, tracker)
	}
}

func (pt *PriceTracker) ProcessTrade(symbol string, price float64) {
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
		
	ctx := context.Background() 
	err := pt.rdb.Publish(ctx, channel, payload).Err()
	if err != nil {
		log.Println("Redis Publish fout:", err)
	}

	pt.display(symbol, price, diff)
}

func handleMessage(message []byte, pt *PriceTracker) {
	var res CombinedResponse

	if err := json.Unmarshal(message, &res); err != nil {
		log.Println("Fout bij unmarshal:", err)
		return
	}

	symbol := res.Data.Symbol
	newPrice, err := strconv.ParseFloat(res.Data.Price, 64)
	if err != nil {
		return
	}

	pt.ProcessTrade(symbol, newPrice)
}

func (pt *PriceTracker) display(symbol string, price float64, diff float64) {
		direction := "   "
	if diff > 0 {
		direction = "🚀 +"
	} else if diff < 0 {
		direction = "📉 "
	}

	fmt.Printf("[%s] $%10.2f | %s%.4f%%\n", strings.ToUpper(symbol), price, direction, diff)
}

func connectWebSocket(symbols []string) *websocket.Conn {
	endpoint := strings.Join(symbols, "@trade/") + "@trade"
	socketUrl := "wss://stream.binance.com:9443/stream?streams=" + endpoint

	conn, _, err := websocket.DefaultDialer.Dial(socketUrl, nil)

	if err != nil {
		log.Fatal("kon niet verbinden met Binance", err)
	}

	return conn
}
