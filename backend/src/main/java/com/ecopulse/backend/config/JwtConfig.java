package com.ecopulse.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ecopulse.jwt")
public record JwtConfig(
        String secret,
        String issuer,
        long accessTokenTtlSeconds
) {
}
