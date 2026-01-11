package com.ecopulse.backend.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties({BackendProperties.class, JwtConfig.class})
public class ConfigBootstrap {
}
