package com.ecopulse.backend.controller;

import com.ecopulse.backend.service.RegionCarbonService;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.*;
import org.springframework.validation.annotation.Validated;

@RestController
@Validated
@RequestMapping("/api")
public class RegionCarbonController {
    private final RegionCarbonService regionCarbonService;

    public RegionCarbonController(RegionCarbonService regionCarbonService) {
        this.regionCarbonService = regionCarbonService;
    }

    @GetMapping("/region-carbon")
    public RegionCarbonService.RegionCarbonResult lookup(@RequestParam @NotBlank String region) {
        return regionCarbonService.lookup(region);
    }
}
