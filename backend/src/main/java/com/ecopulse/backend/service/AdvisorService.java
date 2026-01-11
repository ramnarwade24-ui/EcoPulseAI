package com.ecopulse.backend.service;

import com.ecopulse.backend.client.AiEngineClient;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

@Service
public class AdvisorService {
    private final AiEngineClient aiEngineClient;

    public AdvisorService(AiEngineClient aiEngineClient) {
        this.aiEngineClient = aiEngineClient;
    }

    @Cacheable(cacheNames = "advisor", key = "#request.model + ':' + #request.region + ':' + #request.tokens")
    public AiEngineClient.AdvisorResponse advise(AdvisorRequest request) {
        var api = aiEngineClient.advisor(new AiEngineClient.AdvisorRequest(
                request.model(),
                request.region(),
                request.tokens(),
                request.runtimeSeconds(),
                request.co2Grams(),
                request.energyKwh()
        ));

        return api.orElseGet(() -> new AiEngineClient.AdvisorResponse(
                List.of(
                        "Use a smaller model for simple tasks",
                        "Batch requests and enable caching for repeated prompts",
                        "Prefer low-carbon regions during off-peak hours"
                ),
                List.of("gpt-4o-mini", "gemini-1.5-flash"),
                List.of("Trim context window", "Summarize history", "Use system prompts sparingly")
        ));
    }

    public record AdvisorRequest(
            String model,
            String region,
            long tokens,
            double runtimeSeconds,
            BigDecimal co2Grams,
            BigDecimal energyKwh
    ) {}
}
