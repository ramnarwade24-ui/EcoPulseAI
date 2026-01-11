package com.ecopulse.backend.service;

import com.ecopulse.backend.client.AiEngineClient;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.Locale;
import java.util.Map;

@Service
public class RegionCarbonService {
    private static final Map<String, BigDecimal> FALLBACK_G_PER_KWH = Map.ofEntries(
            Map.entry("asia-south1", new BigDecimal("710")),
            Map.entry("asia-east1", new BigDecimal("520")),
            Map.entry("us-central1", new BigDecimal("410")),
            Map.entry("us-east1", new BigDecimal("360")),
            Map.entry("europe-west1", new BigDecimal("220")),
            Map.entry("europe-north1", new BigDecimal("110"))
    );

    private final AiEngineClient aiEngineClient;

    public RegionCarbonService(AiEngineClient aiEngineClient) {
        this.aiEngineClient = aiEngineClient;
    }

    @Cacheable(cacheNames = "region-carbon", key = "#region")
    public RegionCarbonResult lookup(String region) {
        var normalized = normalize(region);
        var api = aiEngineClient.regionCarbon(normalized);
        if (api.isPresent() && api.get().carbonIntensityGPerKwh() != null) {
            return new RegionCarbonResult(normalized, api.get().carbonIntensityGPerKwh(), api.get().source());
        }

        var fallback = FALLBACK_G_PER_KWH.getOrDefault(normalized, new BigDecimal("400"));
        return new RegionCarbonResult(normalized, fallback, "fallback");
    }

    private static String normalize(String region) {
        return region == null ? "" : region.trim().toLowerCase(Locale.ROOT);
    }

    public record RegionCarbonResult(String region, BigDecimal carbonIntensityGPerKwh, String source) {}
}
