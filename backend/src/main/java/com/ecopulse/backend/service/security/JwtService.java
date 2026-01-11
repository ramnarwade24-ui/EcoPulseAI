package com.ecopulse.backend.service.security;

import com.ecopulse.backend.config.JwtConfig;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.Map;

@Service
public class JwtService {
    private final JwtConfig jwtConfig;
    private final SecretKey key;

    public JwtService(JwtConfig jwtConfig) {
        this.jwtConfig = jwtConfig;

        // For production: use a long, random secret (>= 256-bit) stored in a secret manager.
        // We derive a HMAC key from the configured string for simplicity.
        this.key = Keys.hmacShaKeyFor(jwtConfig.secret().getBytes(StandardCharsets.UTF_8));
    }

    public String issueAccessToken(String subject, Map<String, Object> claims) {
        var now = Instant.now();
        var exp = now.plusSeconds(jwtConfig.accessTokenTtlSeconds());

        return Jwts.builder()
                .issuer(jwtConfig.issuer())
                .subject(subject)
                .issuedAt(Date.from(now))
                .expiration(Date.from(exp))
                .claims(claims)
                .signWith(key)
                .compact();
    }

    public Claims parseAndValidate(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .requireIssuer(jwtConfig.issuer())
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
