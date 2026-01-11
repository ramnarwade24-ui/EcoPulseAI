package com.ecopulse.backend.service;

import com.ecopulse.backend.client.AiEngineClient;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

@Service
public class GreenModeService {
    private final StringRedisTemplate redis;
    private final AiEngineClient aiEngineClient;

    public GreenModeService(StringRedisTemplate redis, AiEngineClient aiEngineClient) {
        this.redis = redis;
        this.aiEngineClient = aiEngineClient;
    }

    public boolean isEnabled(UUID userId) {
        var value = redis.opsForValue().get(key(userId));
        return "1".equals(value);
    }

    public boolean setEnabled(UUID userId, boolean enabled) {
        if (enabled) {
            redis.opsForValue().set(key(userId), "1");
        } else {
            redis.delete(key(userId));
        }
        return enabled;
    }

    public AiEngineClient.GreenModeOptimizeResponse optimize(UUID userId, OptimizeRequest request) {
        // If AI engine is down, provide a conservative recommendation.
        var api = aiEngineClient.greenModeOptimize(new AiEngineClient.GreenModeOptimizeRequest(
                request.model(), request.region(), request.tokens(), request.runtimeSeconds(), request.constraints()
        ));

        return api.orElseGet(() -> new AiEngineClient.GreenModeOptimizeResponse(
                request.model(),
                request.region(),
                Math.max(1L, Math.round(request.tokens() * 0.9)),
                "fallback: reduce tokens by 10%"
        ));
    }

    private static String key(UUID userId) {
        return "greenmode:" + userId;
    }

    public record OptimizeRequest(String model, String region, long tokens, double runtimeSeconds, List<String> constraints) {}
}
