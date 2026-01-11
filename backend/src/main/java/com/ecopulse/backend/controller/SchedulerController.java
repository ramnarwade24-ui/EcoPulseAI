package com.ecopulse.backend.controller;

import com.ecopulse.backend.client.AiEngineClient;
import com.ecopulse.backend.service.SchedulerService;
import com.ecopulse.backend.service.security.SecurityUserDetails;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;

@RestController
@RequestMapping("/api/scheduler")
public class SchedulerController {
    private final SchedulerService schedulerService;

    public SchedulerController(SchedulerService schedulerService) {
        this.schedulerService = schedulerService;
    }

    @PostMapping("/recommendation")
    public AiEngineClient.SchedulerResponse recommend(@AuthenticationPrincipal Object principal, @Valid @RequestBody RecommendRequest request) {
        var userId = ((SecurityUserDetails) principal).id();
        return schedulerService.recommend(userId, new SchedulerService.Request(
                request.model(),
                request.tokens(),
                request.runtimeSeconds(),
                request.candidateRegions(),
                request.notBefore(),
                request.notAfter(),
                request.candidateRegions().get(0)
        ));
    }

    public record RecommendRequest(
            @NotBlank String model,
            long tokens,
            double runtimeSeconds,
            @NotEmpty List<String> candidateRegions,
            Instant notBefore,
            Instant notAfter
    ) {}
}

