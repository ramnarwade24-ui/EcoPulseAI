package com.ecopulse.backend.controller;

import com.ecopulse.backend.model.EmissionLog;
import com.ecopulse.backend.repository.UserRepository;
import com.ecopulse.backend.service.EmissionService;
import com.ecopulse.backend.service.security.SecurityUserDetails;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.Instant;

@RestController
@RequestMapping("/api/emissions")
public class EmissionController {
    private final EmissionService emissionService;
    private final UserRepository userRepository;

    public EmissionController(EmissionService emissionService, UserRepository userRepository) {
        this.emissionService = emissionService;
        this.userRepository = userRepository;
    }

    @PostMapping("/calculate")
    @ResponseStatus(HttpStatus.CREATED)
    public EmissionView calculateAndLog(
            @AuthenticationPrincipal Object principal,
            @Valid @RequestBody CreateEmissionRequest request
    ) {
        var user = userRepository.findById(((SecurityUserDetails) principal).id()).orElseThrow();
        var saved = emissionService.createLog(user, new EmissionService.CreateEmissionRequest(
                request.model(),
                request.region(),
                request.tokens(),
                request.runtimeSeconds(),
                request.modelPowerFactor(),
                request.regionCarbonIntensity(),
                request.waterFactor()
        ));
        return EmissionView.from(saved);
    }

    @GetMapping("/history")
    public Page<EmissionView> history(
            @AuthenticationPrincipal Object principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        var userId = ((SecurityUserDetails) principal).id();
        return emissionService.history(userId, PageRequest.of(page, Math.min(100, size)))
                .map(EmissionView::from);
    }

    @GetMapping("/summary")
    public EmissionService.Summary summary(
            @AuthenticationPrincipal Object principal,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant to
    ) {
        var userId = ((SecurityUserDetails) principal).id();
        return emissionService.summary(userId, from, to);
    }

    public record CreateEmissionRequest(
            @NotBlank String model,
            @NotBlank String region,
            @Min(1) long tokens,
            @Positive double runtimeSeconds,
            @NotNull BigDecimal modelPowerFactor,
            BigDecimal regionCarbonIntensity,
            BigDecimal waterFactor
    ) {}

    public record EmissionView(
            String id,
            Instant createdAt,
            String model,
            String region,
            long tokens,
            double runtimeSeconds,
            BigDecimal energyKwh,
            BigDecimal co2Grams,
            BigDecimal waterLiters,
            int greenScore
    ) {
        static EmissionView from(EmissionLog log) {
            return new EmissionView(
                    log.getId().toString(),
                    log.getCreatedAt(),
                    log.getModel(),
                    log.getRegion(),
                    log.getTokens(),
                    log.getRuntimeSeconds(),
                    log.getEnergyKwh(),
                    log.getCo2Grams(),
                    log.getWaterLiters(),
                    log.getGreenScore()
            );
        }
    }
}

