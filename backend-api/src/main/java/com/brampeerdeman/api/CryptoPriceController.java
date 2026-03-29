package com.brampeerdeman.api;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/prices")
public class CryptoPriceController {

    private final CryptoPriceRepository repository;

    public CryptoPriceController(CryptoPriceRepository repository) {
        this.repository = repository;
    }

    // Luistert naar: http://localhost:8080/api/prices/BTCUSDT
    @GetMapping("/{symbol}")
    public List<CryptoPrice> getLatestPrices(@PathVariable String symbol) {
        return repository.findTop10BySymbolOrderByTimestampDesc(symbol.toUpperCase());
    }
}