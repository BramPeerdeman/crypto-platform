package com.brampeerdeman.api;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class RedisPriceReceiver implements MessageListener {

    private final CryptoPriceRepository repository;
    private final Map<String, Instant> lastSavedTimes = new ConcurrentHashMap<>();

    @Value("${crypto.cooldown-seconds:5}")
    private int cooldownSeconds;

    public RedisPriceReceiver(CryptoPriceRepository repository) {
        this.repository = repository;
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            String rawPrice = new String(message.getBody());
            String symbol = new String(message.getChannel()).replace("price.", "").toUpperCase();

            log.debug("Received price update: symbol={}, price={}", symbol, rawPrice);

            Instant now = Instant.now();
            Instant lastSaved = lastSavedTimes.getOrDefault(symbol, Instant.MIN);

            if (Duration.between(lastSaved, now).getSeconds() < cooldownSeconds) {
                log.debug("Skipping save for {} — cooldown active", symbol);
                return;
            }

            lastSavedTimes.put(symbol, now);

            Double price = Double.parseDouble(rawPrice);
            CryptoPrice record = new CryptoPrice();
            record.setSymbol(symbol);
            record.setPrice(price);
            record.setTimestamp(LocalDateTime.now());

            repository.save(record);
            log.info("Saved price: symbol={}, price={}", symbol, price);

        } catch (NumberFormatException e) {
            log.error("Failed to parse price from message: {}", new String(message.getBody()), e);
        } catch (Exception e) {
            log.error("Unexpected error processing message", e);
        }
    }
}