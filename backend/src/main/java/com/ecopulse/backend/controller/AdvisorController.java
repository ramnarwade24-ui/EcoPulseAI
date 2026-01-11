package com.ecopulse.backend.controller;

import com.ecopulse.backend.client.AiEngineClient;
import com.ecopulse.backend.service.AdvisorService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;

@RestController
@RequestMapping("/api/advisor")
public class AdvisorController {
    private final AdvisorService advisorService;

    public AdvisorController(AdvisorService advisorService) {
        this.advisorService = advisorService;
    }

    @PostMapping
    public AiEngineClient.AdvisorResponse advise(@Valid @RequestBody AdvisorRequest request) {
        return advisorService.advise(new AdvisorService.AdvisorRequest(
                request.model(),
                request.region(),
                request.tokens(),
                request.runtimeSeconds(),
                request.co2Grams(),
                request.energyKwh()
        ));
    }

    public record AdvisorRequest(
            @NotBlank String model,
            @NotBlank String region,
            long tokens,
            double runtimeSeconds,
            @NotNull BigDecimal co2Grams,
            @NotNull BigDecimal energyKwh
    ) {}
}
