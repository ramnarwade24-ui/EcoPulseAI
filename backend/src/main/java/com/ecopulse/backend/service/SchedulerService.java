package com.ecopulse.backend.service;

import com.ecopulse.backend.client.AiEngineClient;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class SchedulerService {
    private final AiEngineClient aiEngineClient;
    private final RegionCarbonService regionCarbonService;

    public SchedulerService(AiEngineClient aiEngineClient, RegionCarbonService regionCarbonService) {
        this.aiEngineClient = aiEngineClient;
        this.regionCarbonService = regionCarbonService;
    }

    public AiEngineClient.SchedulerResponse recommend(UUID userId, Request request) {
        var api = aiEngineClient.schedule(new AiEngineClient.SchedulerRequest(
                request.model(),
                request.tokens(),
                request.runtimeSeconds(),
                request.candidateRegions(),
                request.notBefore(),
                request.notAfter()
        ));

        if (api.isPresent()) return api.get();

        var bestRegion = request.candidateRegions().stream()
                .min(Comparator.comparing(r -> regionCarbonService.lookup(r).carbonIntensityGPerKwh()))
                .orElse(request.regionFallback());

        return new AiEngineClient.SchedulerResponse(bestRegion, Instant.now(), "fallback: chose lowest carbon intensity region");
    }

    public record Request(
            String model,
            long tokens,
            double runtimeSeconds,
            List<String> candidateRegions,
            Instant notBefore,
            Instant notAfter,
            String regionFallback
    ) {}
}
