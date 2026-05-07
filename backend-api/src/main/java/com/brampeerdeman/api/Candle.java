package com.brampeerdeman.api;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Data
@Table(
    uniqueConstraints = @UniqueConstraint(
        columnNames = {"symbol", "interval", "open_time"}
    ),
    indexes = {
        @Index(columnList = "symbol, interval, open_time")
    }
)
public class Candle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String symbol;

    @Column(name = "interval")
    private String interval;

    private LocalDateTime openTime;
    private LocalDateTime closeTime;

    private Double open;
    private Double high;
    private Double low;
    private Double close;
    private Double volume;
}