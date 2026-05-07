package com.brampeerdeman.api;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.time.Instant;

@Data
public class CandleMessage {

    @JsonProperty("symbol")
    private String symbol;

    @JsonProperty("interval")
    private String interval;

    @JsonProperty("open_time")
    private Instant openTime;

    @JsonProperty("close_time")
    private Instant closeTime;

    @JsonProperty("open")
    private Double open;

    @JsonProperty("high")
    private Double high;

    @JsonProperty("low")
    private Double low;

    @JsonProperty("close")
    private Double close;

    @JsonProperty("volume")
    private Double volume;
}