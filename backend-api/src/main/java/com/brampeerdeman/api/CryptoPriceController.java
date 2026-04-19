package com.brampeerdeman.api;

import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/prices")
@Slf4j
public class CryptoPriceController {

    private final CryptoPriceRepository repository;

    public CryptoPriceController(CryptoPriceRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/{symbol}")
    public ResponseEntity<List<CryptoPrice>> getLatestPrices(
            @PathVariable String symbol,
            @RequestParam(defaultValue = "10") int limit) {

        // Clamp between 1 and 100 — don't let clients request unlimited data
        int clampedLimit = Math.min(Math.max(limit, 1), 100);

        String upperSymbol = symbol.toUpperCase();
        log.debug("Fetching prices for symbol={}, limit={}", upperSymbol, clampedLimit);

        Pageable pageable = PageRequest.of(0, clampedLimit);
        List<CryptoPrice> prices = repository.findBySymbolOrderByTimestampDesc(upperSymbol, pageable);

        log.debug("Found {} records for symbol={}", prices.size(), upperSymbol);

        return ResponseEntity.ok(prices);
    }
}