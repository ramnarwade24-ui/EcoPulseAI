package com.ecopulse.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "ecopulse")
public record BackendProperties(
        JwtConfig jwt,
        AiEngineProperties aiEngine,
        SecurityProperties security,
        EncryptionProperties encryption
) {
    @ConfigurationProperties(prefix = "ecopulse.aiEngine")
    public record AiEngineProperties(String baseUrl) {}

    @ConfigurationProperties(prefix = "ecopulse.security")
    public record SecurityProperties(int rateLimitPerMinute) {}

    @ConfigurationProperties(prefix = "ecopulse.encryption")
    public record EncryptionProperties(String fieldKeyB64) {}
}
