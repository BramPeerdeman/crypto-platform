package com.brampeerdeman.api;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@Slf4j
public class PriceCleanupJob {

    private final CryptoPriceRepository cryptoPriceRepository;
    private final CandleRepository candleRepository;

    @Value("${crypto.retention-hours:24}")
    private int retentionHours;

    public PriceCleanupJob(CryptoPriceRepository cryptoPriceRepository,
                           CandleRepository candleRepository) {
        this.cryptoPriceRepository = cryptoPriceRepository;
        this.candleRepository = candleRepository;
    }

    @Scheduled(fixedRateString = "${crypto.cleanup-interval-ms:300000}")
    public void cleanup() {
        // Raw ticks — aggressive cleanup
        LocalDateTime tickCutoff = LocalDateTime.now().minusHours(retentionHours);
        log.info("Cleaning ticks older than {}", tickCutoff);
        cryptoPriceRepository.deleteByTimestampBefore(tickCutoff);

        // 1m candles — keep 7 days
        LocalDateTime oneMinuteCutoff = LocalDateTime.now().minusDays(7);
        log.info("Cleaning 1m candles older than {}", oneMinuteCutoff);
        candleRepository.deleteByIntervalAndOpenTimeBefore("1m", oneMinuteCutoff);

        // 1h candles — keep 3 months
        LocalDateTime oneHourCutoff = LocalDateTime.now().minusDays(90);
        log.info("Cleaning 1h candles older than {}", oneHourCutoff);
        candleRepository.deleteByIntervalAndOpenTimeBefore("1h", oneHourCutoff);

        // 1d candles — keep forever, no cleanup

        log.info("Cleanup complete");
    }
}