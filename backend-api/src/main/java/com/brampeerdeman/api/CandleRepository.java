package com.brampeerdeman.api;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CandleRepository extends JpaRepository<Candle, Long> {

    List<Candle> findBySymbolAndIntervalOrderByOpenTimeDesc(
        String symbol, 
        String interval, 
        Pageable pageable
    );

    void deleteByIntervalAndOpenTimeBefore(String interval, LocalDateTime cutoff);
}