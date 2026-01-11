package com.ecopulse.backend.service.cache;

import com.ecopulse.backend.model.Role;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

@Service
public class RoleCacheService {
    private static final Duration TTL = Duration.ofHours(1);
    private final StringRedisTemplate redis;

    public RoleCacheService(StringRedisTemplate redis) {
        this.redis = redis;
    }

    public Optional<Role> getRole(UUID userId) {
        var value = redis.opsForValue().get(key(userId));
        if (value == null || value.isBlank()) return Optional.empty();
        try {
            return Optional.of(Role.valueOf(value));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    public void putRole(UUID userId, Role role) {
        redis.opsForValue().set(key(userId), role.name(), TTL);
    }

    public void evict(UUID userId) {
        redis.delete(key(userId));
    }

    private static String key(UUID userId) {
        return "role:" + userId;
    }
}
