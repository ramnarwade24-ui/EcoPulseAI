package com.ecopulse.backend.service;

import com.ecopulse.backend.client.AiEngineClient;
import com.ecopulse.backend.model.EmissionLog;
import com.ecopulse.backend.model.GreenScore;
import com.ecopulse.backend.model.User;
import com.ecopulse.backend.repository.EmissionRepository;
import com.ecopulse.backend.repository.GreenScoreRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
public class EmissionService {
    private static final BigDecimal DEFAULT_WATER_FACTOR_L_PER_KWH = new BigDecimal("1.8");

    private final EmissionRepository emissionRepository;
    private final GreenScoreRepository greenScoreRepository;
    private final RegionCarbonService regionCarbonService;
    private final AiEngineClient aiEngineClient;

    public EmissionService(
            EmissionRepository emissionRepository,
            GreenScoreRepository greenScoreRepository,
            RegionCarbonService regionCarbonService,
            AiEngineClient aiEngineClient
    ) {
        this.emissionRepository = emissionRepository;
        this.greenScoreRepository = greenScoreRepository;
        this.regionCarbonService = regionCarbonService;
        this.aiEngineClient = aiEngineClient;
    }

    public EmissionLog createLog(User user, CreateEmissionRequest request) {
        var regionIntensity = Optional.ofNullable(request.regionCarbonIntensity())
                .orElseGet(() -> regionCarbonService.lookup(request.region()).carbonIntensityGPerKwh());

        var waterFactor = Optional.ofNullable(request.waterFactor()).orElse(DEFAULT_WATER_FACTOR_L_PER_KWH);

        var calc = aiEngineClient.calculateEmissions(new AiEngineClient.EmissionCalcRequest(
                request.model(),
                request.region(),
                request.tokens(),
                request.runtimeSeconds(),
                request.modelPowerFactor(),
                regionIntensity,
                waterFactor
        ));

        var computed = calc.orElseGet(() -> fallbackCompute(
                request.tokens(),
                request.modelPowerFactor(),
                request.runtimeSeconds(),
                regionIntensity,
                waterFactor
        ));

        var log = new EmissionLog(user);
        log.setModel(request.model());
        log.setRegion(request.region());
        log.setTokens(request.tokens());
        log.setRuntimeSeconds(request.runtimeSeconds());
        log.setModelPowerFactor(request.modelPowerFactor());
        log.setRegionCarbonIntensity(regionIntensity);
        log.setWaterFactor(waterFactor);
        log.setEnergyKwh(computed.energyKwh());
        log.setCo2Grams(computed.co2Grams());
        log.setWaterLiters(computed.waterLiters());

        int score = computed.greenScore() != null ? computed.greenScore() : greenScore(computed.co2Grams(), request.tokens());
        log.setGreenScore(score);

        var saved = emissionRepository.save(log);
        greenScoreRepository.save(new GreenScore(user, score, "derived from emissions"));
        return saved;
    }

    public Page<EmissionLog> history(UUID userId, Pageable pageable) {
        return emissionRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
    }

    public Summary summary(UUID userId, Instant from, Instant to) {
        // Lightweight: page through recent logs if needed; for now compute using repository find-by-user and filter.
        // For production scale, use a dedicated aggregate query.
        var all = emissionRepository.findByUserIdOrderByCreatedAtDesc(userId, Pageable.ofSize(500)).getContent();
        var totalEnergy = BigDecimal.ZERO;
        var totalCo2 = BigDecimal.ZERO;
        var totalWater = BigDecimal.ZERO;
        long totalTokens = 0;

        for (var log : all) {
            var ts = log.getCreatedAt();
            if ((from != null && ts.isBefore(from)) || (to != null && ts.isAfter(to))) continue;
            totalEnergy = totalEnergy.add(log.getEnergyKwh());
            totalCo2 = totalCo2.add(log.getCo2Grams());
            totalWater = totalWater.add(log.getWaterLiters());
            totalTokens += log.getTokens();
        }

        return new Summary(totalTokens, totalEnergy, totalCo2, totalWater);
    }

    private static AiEngineClient.EmissionCalcResponse fallbackCompute(
            long tokens,
            BigDecimal modelPowerFactor,
            double runtimeSeconds,
            BigDecimal regionCarbonIntensity,
            BigDecimal waterFactor
    ) {
        // Formula (given):
        // Energy (kWh) = Tokens × ModelPowerFactor × Runtime
        // CO2 (g) = Energy × RegionCarbonIntensity
        // Water (L) = Energy × WaterFactor
        // We interpret runtime as hours, derived from seconds.

        var runtimeHours = BigDecimal.valueOf(runtimeSeconds).divide(BigDecimal.valueOf(3600), 12, RoundingMode.HALF_UP);
        var energy = BigDecimal.valueOf(tokens)
                .multiply(modelPowerFactor)
                .multiply(runtimeHours)
                .setScale(8, RoundingMode.HALF_UP);

        var co2 = energy.multiply(regionCarbonIntensity).setScale(8, RoundingMode.HALF_UP);
        var water = energy.multiply(waterFactor).setScale(8, RoundingMode.HALF_UP);
        return new AiEngineClient.EmissionCalcResponse(energy, co2, water, greenScore(co2, tokens), null);
    }

    private static int greenScore(BigDecimal co2Grams, long tokens) {
        // Simple heuristic score: penalize high CO2 per 1k tokens.
        // Target <= 50g per 1k tokens => near 100; >= 500g per 1k tokens => near 0.
        var denom = Math.max(1L, tokens);
        var per1k = co2Grams.divide(BigDecimal.valueOf(denom), 12, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(1000));
        var x = per1k.doubleValue();
        var score = (int) Math.round(100 - ((x - 50) / (500 - 50)) * 100);
        return Math.max(0, Math.min(100, score));
    }

    public record CreateEmissionRequest(
            String model,
            String region,
            long tokens,
            double runtimeSeconds,
            BigDecimal modelPowerFactor,
            BigDecimal regionCarbonIntensity,
            BigDecimal waterFactor
    ) {}

    public record Summary(long totalTokens, BigDecimal totalEnergyKwh, BigDecimal totalCo2Grams, BigDecimal totalWaterLiters) {}
}
