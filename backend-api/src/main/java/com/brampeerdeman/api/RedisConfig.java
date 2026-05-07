package com.brampeerdeman.api;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

@Configuration
public class RedisConfig {

    @Bean
    RedisMessageListenerContainer container(
            RedisConnectionFactory connectionFactory,
            RedisPriceReceiver priceReceiver,
            CandleReceiver candleReceiver) {

        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);

        container.addMessageListener(priceReceiver, new PatternTopic("price.*"));
        container.addMessageListener(candleReceiver, new PatternTopic("candle.*"));

        return container;
    }
}