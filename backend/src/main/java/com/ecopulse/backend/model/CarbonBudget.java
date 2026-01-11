package com.ecopulse.backend.model;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "carbon_budgets", indexes = {
        @Index(name = "idx_carbon_budgets_user", columnList = "user_id"),
        @Index(name = "idx_carbon_budgets_period", columnList = "period_start,period_end")
})
public class CarbonBudget {
    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "period_start", nullable = false)
    private Instant periodStart;

    @Column(name = "period_end", nullable = false)
    private Instant periodEnd;

    @Column(name = "co2_grams_limit", nullable = false, precision = 18, scale = 8)
    private BigDecimal co2GramsLimit;

    @Column(name = "co2_grams_used", nullable = false, precision = 18, scale = 8)
    private BigDecimal co2GramsUsed = BigDecimal.ZERO;

    protected CarbonBudget() {}

    public CarbonBudget(User user, Instant periodStart, Instant periodEnd, BigDecimal co2GramsLimit) {
        this.user = user;
        this.periodStart = periodStart;
        this.periodEnd = periodEnd;
        this.co2GramsLimit = co2GramsLimit;
    }

    public UUID getId() { return id; }
    public User getUser() { return user; }
    public Instant getPeriodStart() { return periodStart; }
    public Instant getPeriodEnd() { return periodEnd; }
    public BigDecimal getCo2GramsLimit() { return co2GramsLimit; }
    public BigDecimal getCo2GramsUsed() { return co2GramsUsed; }

    public void setCo2GramsUsed(BigDecimal co2GramsUsed) { this.co2GramsUsed = co2GramsUsed; }
}
