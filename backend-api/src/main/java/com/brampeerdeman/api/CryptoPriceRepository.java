package com.brampeerdeman.api;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CryptoPriceRepository extends JpaRepository<CryptoPrice, Long> {

    List<CryptoPrice> findTop10BySymbolOrderByTimestampDesc(String symbol);

    List<CryptoPrice> findBySymbolOrderByTimestampDesc(String symbol, Pageable pageable);

    void deleteByTimestampBefore(LocalDateTime cutoff);
}