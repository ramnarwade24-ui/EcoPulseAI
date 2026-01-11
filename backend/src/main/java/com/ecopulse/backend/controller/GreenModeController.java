package com.ecopulse.backend.controller;

import com.ecopulse.backend.service.GreenModeService;
import com.ecopulse.backend.service.security.SecurityUserDetails;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/green-mode")
public class GreenModeController {
    private final GreenModeService greenModeService;

    public GreenModeController(GreenModeService greenModeService) {
        this.greenModeService = greenModeService;
    }

    @GetMapping
    public Status get(@AuthenticationPrincipal Object principal) {
        var userId = ((SecurityUserDetails) principal).id();
        return new Status(greenModeService.isEnabled(userId));
    }

    @PostMapping
    public Status set(@AuthenticationPrincipal Object principal, @Valid @RequestBody SetRequest request) {
        var userId = ((SecurityUserDetails) principal).id();
        return new Status(greenModeService.setEnabled(userId, request.enabled()));
    }

    @PostMapping("/optimize")
    public Object optimize(@AuthenticationPrincipal Object principal, @Valid @RequestBody OptimizeRequest request) {
        var userId = ((SecurityUserDetails) principal).id();
        return greenModeService.optimize(userId, new GreenModeService.OptimizeRequest(
                request.model(), request.region(), request.tokens(), request.runtimeSeconds(), request.constraints()
        ));
    }

    public record Status(boolean enabled) {}
    public record SetRequest(@NotNull Boolean enabled) {}

    public record OptimizeRequest(
            @NotBlank String model,
            @NotBlank String region,
            long tokens,
            double runtimeSeconds,
            List<String> constraints
    ) {}
}
