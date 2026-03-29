package com.brampeerdeman.api;

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

    // Dit is het "geheugen" van Java. Hij onthoudt hierin per munt hoe laat hij voor het laatst is opgeslagen.
    private final Map<String, Instant> lastSavedTimes = new ConcurrentHashMap<>();

    public RedisPriceReceiver(CryptoPriceRepository repository) {
        this.repository = repository;
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            String rawPrice = new String(message.getBody());
            String symbol = new String(message.getChannel()).replace("price.", "").toUpperCase();

            // --- DE COOLDOWN CHECK ---
            Instant now = Instant.now();
            Instant lastSaved = lastSavedTimes.getOrDefault(symbol, Instant.MIN);

            // Is het minder dan 5 seconden geleden? Dan stoppen we hier en slaan we niet op.
            if (Duration.between(lastSaved, now).getSeconds() < 5) {
                return;
            }

            // Als we hier zijn, is de cooldown voorbij! Update de timer.
            lastSavedTimes.put(symbol, now);
            // --------------------------

            Double price = Double.parseDouble(rawPrice);
            CryptoPrice record = new CryptoPrice();
            record.setSymbol(symbol);
            record.setPrice(price);
            record.setTimestamp(LocalDateTime.now());

            repository.save(record);
            log.info("💾 Opgeslagen in DB (Cooldown verstreken): {} - ${}", symbol, price);

        } catch (Exception e) {
            log.error("Fout bij het opslaan van de prijs", e);
        }
    }
}