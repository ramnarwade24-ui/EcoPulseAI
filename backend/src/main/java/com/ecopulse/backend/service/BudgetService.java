package com.ecopulse.backend.service;

import com.ecopulse.backend.model.CarbonBudget;
import com.ecopulse.backend.model.User;
import com.ecopulse.backend.repository.CarbonBudgetRepository;
import com.ecopulse.backend.repository.EmissionRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class BudgetService {
    private final CarbonBudgetRepository carbonBudgetRepository;
    private final EmissionRepository emissionRepository;

    public BudgetService(CarbonBudgetRepository carbonBudgetRepository, EmissionRepository emissionRepository) {
        this.carbonBudgetRepository = carbonBudgetRepository;
        this.emissionRepository = emissionRepository;
    }

    public CarbonBudget create(User user, CreateBudgetRequest request) {
        var budget = new CarbonBudget(user, request.periodStart(), request.periodEnd(), request.co2GramsLimit());
        return carbonBudgetRepository.save(budget);
    }

    public List<CarbonBudget> list(UUID userId) {
        return carbonBudgetRepository.findByUserIdOrderByPeriodStartDesc(userId);
    }

    public BudgetStatus status(UUID userId, UUID budgetId) {
        var budget = carbonBudgetRepository.findById(budgetId).orElseThrow();
        if (!budget.getUser().getId().equals(userId)) {
            throw new IllegalArgumentException("Not allowed");
        }

        // Compute usage from emission logs (simple approach). For production scale use aggregate query.
        var logs = emissionRepository.findByUserIdOrderByCreatedAtDesc(userId, org.springframework.data.domain.Pageable.ofSize(2000)).getContent();
        BigDecimal used = BigDecimal.ZERO;
        for (var log : logs) {
            var ts = log.getCreatedAt();
            if (ts.isBefore(budget.getPeriodStart()) || ts.isAfter(budget.getPeriodEnd())) continue;
            used = used.add(log.getCo2Grams());
        }

        var remaining = budget.getCo2GramsLimit().subtract(used);
        return new BudgetStatus(budget.getId(), budget.getPeriodStart(), budget.getPeriodEnd(), budget.getCo2GramsLimit(), used, remaining);
    }

    public record CreateBudgetRequest(Instant periodStart, Instant periodEnd, BigDecimal co2GramsLimit) {}

    public record BudgetStatus(UUID id, Instant periodStart, Instant periodEnd, BigDecimal limitCo2Grams, BigDecimal usedCo2Grams, BigDecimal remainingCo2Grams) {}
}
