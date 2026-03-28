package main

import (
	"encoding/json"
	"fmt"
	"log"
	"strconv"
	"strings"
	"sync"

	"github.com/gorilla/websocket"
)

type PriceTracker struct {
	lastPrices map[string]float64
	mu sync.RWMutex
}

func NewPriceTracker() *PriceTracker {
	return &PriceTracker{
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
	
	if !exists {
		pt.lastPrices[symbol] = price
		pt.display(symbol, price, 0)
		return
	}

	diff := ((price - oldPrice) / oldPrice) * 100

	if diff > 0.01 || diff < -0.01 {
		pt.lastPrices[symbol] = price
		pt.display(symbol, price, diff)
	}
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
