package com.ecopulse.backend.service.security;

import com.ecopulse.backend.config.BackendProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;

@Component
public class RateLimitFilter extends OncePerRequestFilter {
    private final StringRedisTemplate redis;
    private final int limitPerMinute;

    public RateLimitFilter(StringRedisTemplate redis, BackendProperties properties) {
        this.redis = redis;
        this.limitPerMinute = Math.max(1, properties.security().rateLimitPerMinute());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        // Keep auth endpoints usable even under tight limits; still rate limit them.
        var ip = clientIp(request);
        var bucketKey = "rl:" + ip + ":" + (System.currentTimeMillis() / 60000);

        var current = redis.opsForValue().increment(bucketKey);
        if (current != null && current == 1L) {
            redis.expire(bucketKey, Duration.ofMinutes(2));
        }

        if (current != null && current > limitPerMinute) {
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"rate_limit_exceeded\",\"message\":\"Too many requests\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private static String clientIp(HttpServletRequest request) {
        var forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return forwarded.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
