package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/redis/go-redis/v9"
)

type Interval string

const (
	Interval1m Interval = "1m"
	Interval1h Interval = "1h"
	Interval1d Interval = "1d"
)

func (i Interval) Duration() time.Duration {
	switch i {
	case Interval1m:
		return time.Minute
	case Interval1h:
		return time.Hour
	case Interval1d:
		return 24 * time.Hour
	default:
		return time.Minute
	}
}

type Candle struct {
	Symbol   string   `json:"symbol"`
	Interval Interval `json:"interval"`
	OpenTime time.Time `json:"open_time"`
	CloseTime time.Time `json:"close_time"`
	Open     float64  `json:"open"`
	High     float64  `json:"high"`
	Low      float64  `json:"low"`
	Close    float64  `json:"close"`
	Volume   float64  `json:"volume"`
}

// candleKey uniquely identifies a candle in progress
type candleKey struct {
	symbol   string
	interval Interval
}

type CandleTracker struct {
	rdb     *redis.Client
	candles map[candleKey]*Candle
	mu      sync.Mutex
}

func NewCandleTracker(rdb *redis.Client) *CandleTracker {
	return &CandleTracker{
		rdb:     rdb,
		candles: make(map[candleKey]*Candle),
	}
}

func intervalStart(t time.Time, interval Interval) time.Time {
	switch interval {
	case Interval1m:
		return t.Truncate(time.Minute)
	case Interval1h:
		return t.Truncate(time.Hour)
	case Interval1d:
		y, m, d := t.Date()
		return time.Date(y, m, d, 0, 0, 0, 0, t.Location())
	default:
		return t.Truncate(time.Minute)
	}
}

func (ct *CandleTracker) ProcessTick(symbol string, price float64, quantity float64) {
	now := time.Now()

	for _, interval := range []Interval{Interval1m, Interval1h, Interval1d} {
		ct.processTick(symbol, price, quantity, now, interval)
	}
}

func (ct *CandleTracker) processTick(symbol string, price float64, quantity float64, now time.Time, interval Interval) {
	ct.mu.Lock()
	defer ct.mu.Unlock()

	key := candleKey{symbol: symbol, interval: interval}
	openTime := intervalStart(now, interval)
	closeTime := openTime.Add(interval.Duration())

	candle, exists := ct.candles[key]

	if !exists || now.After(candle.CloseTime) {
		// Publish completed candle before starting new one
		if exists {
			ct.publish(candle)
		}

		// Start fresh candle
		ct.candles[key] = &Candle{
			Symbol:    symbol,
			Interval:  interval,
			OpenTime:  openTime,
			CloseTime: closeTime,
			Open:      price,
			High:      price,
			Low:       price,
			Close:     price,
			Volume:    quantity,
		}

		slog.Debug("New candle started",
			"symbol", symbol,
			"interval", interval,
			"open", price,
		)
		return
	}

	// Update existing candle
	if price > candle.High {
		candle.High = price
	}
	if price < candle.Low {
		candle.Low = price
	}
	candle.Close = price
	candle.Volume += quantity
}

func (ct *CandleTracker) publish(candle *Candle) {
	payload, err := json.Marshal(candle)
	if err != nil {
		slog.Error("Failed to marshal candle", "error", err)
		return
	}

	channel := fmt.Sprintf("candle.%s.%s", candle.Interval, candle.Symbol)

	err = ct.rdb.Publish(context.Background(), channel, payload).Err()
	if err != nil {
		slog.Error("Failed to publish candle",
			"symbol", candle.Symbol,
			"interval", candle.Interval,
			"error", err,
		)
		return
	}

	slog.Info("Candle published",
		"symbol", candle.Symbol,
		"interval", candle.Interval,
		"open", candle.Open,
		"high", candle.High,
		"low", candle.Low,
		"close", candle.Close,
		"volume", candle.Volume,
	)
}