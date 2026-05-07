package com.brampeerdeman.api;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/candles")
@Slf4j
@CrossOrigin(origins = "*")
public class CandleController {

    private final CandleRepository repository;

    public CandleController(CandleRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/{symbol}/{interval}")
    public ResponseEntity<List<Candle>> getCandles(
            @PathVariable String symbol,
            @PathVariable String interval,
            @RequestParam(defaultValue = "100") int limit) {

        int clampedLimit = Math.min(Math.max(limit, 1), 1000);

        log.debug("Fetching candles: symbol={}, interval={}, limit={}", 
            symbol, interval, clampedLimit);

        List<Candle> candles = repository.findBySymbolAndIntervalOrderByOpenTimeDesc(
            symbol.toUpperCase(),
            interval,
            PageRequest.of(0, clampedLimit)
        );

        log.debug("Found {} candles", candles.size());

        return ResponseEntity.ok(candles);
    }
}