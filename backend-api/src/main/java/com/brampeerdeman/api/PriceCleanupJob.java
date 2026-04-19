package com.brampeerdeman.api;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

@Component
@Slf4j
public class PriceCleanupJob {

    private final CryptoPriceRepository repository;

    @Value("${crypto.retention-hours:24}")
    private int retentionHours;

    public PriceCleanupJob(CryptoPriceRepository repository) {
        this.repository = repository;
    }

    @Scheduled(fixedRateString = "${crypto.cleanup-interval-ms:300000}")
    public void cleanup() {
        LocalDateTime cutoff = LocalDateTime.now().minusHours(retentionHours);
        log.info("Running cleanup, deleting records before {}", cutoff);

        repository.deleteByTimestampBefore(cutoff);

        log.info("Cleanup complete");
    }
}