package com.brampeerdeman.api;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Service
@Slf4j
public class CandleReceiver implements MessageListener {

    private final CandleRepository repository;
    private final ObjectMapper objectMapper;

    public CandleReceiver(CandleRepository repository) {
        this.repository = repository;
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        try {
            String json = new String(message.getBody());
            log.debug("Received candle message: {}", json);

            CandleMessage msg = objectMapper.readValue(json, CandleMessage.class);

            Candle candle = new Candle();
            candle.setSymbol(msg.getSymbol());
            candle.setInterval(msg.getInterval());
            candle.setOpenTime(LocalDateTime.ofInstant(msg.getOpenTime(), ZoneOffset.UTC));
            candle.setCloseTime(LocalDateTime.ofInstant(msg.getCloseTime(), ZoneOffset.UTC));
            candle.setOpen(msg.getOpen());
            candle.setHigh(msg.getHigh());
            candle.setLow(msg.getLow());
            candle.setClose(msg.getClose());
            candle.setVolume(msg.getVolume());

            repository.save(candle);

            log.info("Candle saved: symbol={}, interval={}, open={}, close={}, volume={}",
                candle.getSymbol(),
                candle.getInterval(),
                candle.getOpen(),
                candle.getClose(),
                candle.getVolume()
            );

        } catch (Exception e) {
            log.error("Failed to process candle message", e);
        }
    }
}