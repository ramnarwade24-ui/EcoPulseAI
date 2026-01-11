package com.ecopulse.backend.config;

import com.ecopulse.backend.model.Role;
import com.ecopulse.backend.model.User;
import com.ecopulse.backend.repository.UserRepository;
import com.ecopulse.backend.service.BudgetService;
import com.ecopulse.backend.service.EmissionService;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Component
public class DataSeeder implements ApplicationRunner {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmissionService emissionService;
    private final BudgetService budgetService;

    public DataSeeder(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            EmissionService emissionService,
            BudgetService budgetService
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emissionService = emissionService;
        this.budgetService = budgetService;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (userRepository.count() > 0) return;

        var admin = new User(
                "admin@ecopulse.ai",
                passwordEncoder.encode("admin123"),
                Role.ADMIN,
                "EcoPulse Admin"
        );

        var user = new User(
                "user@ecopulse.ai",
                passwordEncoder.encode("user123"),
                Role.USER,
                "EcoPulse User"
        );

        admin = userRepository.save(admin);
        user = userRepository.save(user);

        // Seed a small emission history for the demo user.
        var samples = List.of(
                new EmissionService.CreateEmissionRequest(
                        "gpt-4o-mini",
                        "europe-north1",
                        12_000,
                        18,
                        new BigDecimal("0.0000025"),
                        null,
                        null
                ),
                new EmissionService.CreateEmissionRequest(
                        "gpt-4o-mini",
                        "us-east1",
                        25_000,
                        35,
                        new BigDecimal("0.0000025"),
                        null,
                        null
                ),
                new EmissionService.CreateEmissionRequest(
                        "gpt-4o",
                        "us-central1",
                        40_000,
                        55,
                        new BigDecimal("0.0000040"),
                        null,
                        null
                ),
                new EmissionService.CreateEmissionRequest(
                        "gpt-4o",
                        "asia-east1",
                        60_000,
                        65,
                        new BigDecimal("0.0000040"),
                        null,
                        null
                )
        );

        for (var req : samples) {
            emissionService.createLog(user, req);
        }

        // Seed an active 30-day carbon budget.
        var now = Instant.now();
        budgetService.create(user, new BudgetService.CreateBudgetRequest(
                now.minus(5, ChronoUnit.DAYS),
                now.plus(25, ChronoUnit.DAYS),
                new BigDecimal("50000")
        ));
    }
}
