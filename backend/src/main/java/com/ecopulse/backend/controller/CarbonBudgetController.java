package com.ecopulse.backend.controller;

import com.ecopulse.backend.model.CarbonBudget;
import com.ecopulse.backend.repository.UserRepository;
import com.ecopulse.backend.service.BudgetService;
import com.ecopulse.backend.service.security.SecurityUserDetails;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/budget")
public class CarbonBudgetController {
    private final BudgetService budgetService;
    private final UserRepository userRepository;

    public CarbonBudgetController(BudgetService budgetService, UserRepository userRepository) {
        this.budgetService = budgetService;
        this.userRepository = userRepository;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BudgetView create(@AuthenticationPrincipal Object principal, @Valid @RequestBody CreateRequest request) {
        var user = userRepository.findById(((SecurityUserDetails) principal).id()).orElseThrow();
        var budget = budgetService.create(user, new BudgetService.CreateBudgetRequest(
                request.periodStart(), request.periodEnd(), request.co2GramsLimit()
        ));
        return BudgetView.from(budget);
    }

    @GetMapping
    public List<BudgetView> list(@AuthenticationPrincipal Object principal) {
        var userId = ((SecurityUserDetails) principal).id();
        return budgetService.list(userId).stream().map(BudgetView::from).toList();
    }

    @GetMapping("/{id}/status")
    public BudgetService.BudgetStatus status(@AuthenticationPrincipal Object principal, @PathVariable UUID id) {
        var userId = ((SecurityUserDetails) principal).id();
        return budgetService.status(userId, id);
    }

    public record CreateRequest(
            @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant periodStart,
            @NotNull @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant periodEnd,
            @NotNull BigDecimal co2GramsLimit
    ) {}

    public record BudgetView(String id, Instant periodStart, Instant periodEnd, BigDecimal co2GramsLimit) {
        static BudgetView from(CarbonBudget b) {
            return new BudgetView(b.getId().toString(), b.getPeriodStart(), b.getPeriodEnd(), b.getCo2GramsLimit());
        }
    }
}
