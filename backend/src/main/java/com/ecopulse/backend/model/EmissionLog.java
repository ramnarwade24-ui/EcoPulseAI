package com.ecopulse.backend.model;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "emission_logs", indexes = {
        @Index(name = "idx_emission_logs_user_time", columnList = "user_id,created_at")
})
public class EmissionLog {
    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(nullable = false, length = 120)
    private String model;

    @Column(nullable = false, length = 80)
    private String region;

    @Column(nullable = false)
    private long tokens;

    @Column(nullable = false)
    private double runtimeSeconds;

    @Column(nullable = false, precision = 18, scale = 8)
    private BigDecimal modelPowerFactor;

    @Column(nullable = false, precision = 18, scale = 8)
    private BigDecimal regionCarbonIntensity;

    @Column(nullable = false, precision = 18, scale = 8)
    private BigDecimal waterFactor;

    @Column(nullable = false, precision = 18, scale = 8)
    private BigDecimal energyKwh;

    @Column(nullable = false, precision = 18, scale = 8)
    private BigDecimal co2Grams;

    @Column(nullable = false, precision = 18, scale = 8)
    private BigDecimal waterLiters;

    @Column(nullable = false)
    private int greenScore;

    protected EmissionLog() {}

    public EmissionLog(User user) {
        this.user = user;
    }

    public UUID getId() { return id; }
    public User getUser() { return user; }
    public Instant getCreatedAt() { return createdAt; }
    public String getModel() { return model; }
    public String getRegion() { return region; }
    public long getTokens() { return tokens; }
    public double getRuntimeSeconds() { return runtimeSeconds; }
    public BigDecimal getModelPowerFactor() { return modelPowerFactor; }
    public BigDecimal getRegionCarbonIntensity() { return regionCarbonIntensity; }
    public BigDecimal getWaterFactor() { return waterFactor; }
    public BigDecimal getEnergyKwh() { return energyKwh; }
    public BigDecimal getCo2Grams() { return co2Grams; }
    public BigDecimal getWaterLiters() { return waterLiters; }
    public int getGreenScore() { return greenScore; }

    public void setModel(String model) { this.model = model; }
    public void setRegion(String region) { this.region = region; }
    public void setTokens(long tokens) { this.tokens = tokens; }
    public void setRuntimeSeconds(double runtimeSeconds) { this.runtimeSeconds = runtimeSeconds; }
    public void setModelPowerFactor(BigDecimal modelPowerFactor) { this.modelPowerFactor = modelPowerFactor; }
    public void setRegionCarbonIntensity(BigDecimal regionCarbonIntensity) { this.regionCarbonIntensity = regionCarbonIntensity; }
    public void setWaterFactor(BigDecimal waterFactor) { this.waterFactor = waterFactor; }
    public void setEnergyKwh(BigDecimal energyKwh) { this.energyKwh = energyKwh; }
    public void setCo2Grams(BigDecimal co2Grams) { this.co2Grams = co2Grams; }
    public void setWaterLiters(BigDecimal waterLiters) { this.waterLiters = waterLiters; }
    public void setGreenScore(int greenScore) { this.greenScore = greenScore; }
}
