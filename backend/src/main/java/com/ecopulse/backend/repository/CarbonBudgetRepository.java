package com.ecopulse.backend.repository;

import com.ecopulse.backend.model.CarbonBudget;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface CarbonBudgetRepository extends JpaRepository<CarbonBudget, UUID> {
    List<CarbonBudget> findByUserIdOrderByPeriodStartDesc(UUID userId);
}
