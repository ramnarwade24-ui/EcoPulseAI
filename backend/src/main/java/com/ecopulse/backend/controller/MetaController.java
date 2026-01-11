package com.ecopulse.backend.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/meta")
public class MetaController {

    @GetMapping("/models")
    public List<ModelInfo> models() {
        // Keep this list small and stable. Power factors are relative multipliers used by the deterministic formula.
        return List.of(
                new ModelInfo("gpt-4", new BigDecimal("0.0000036"), "OpenAI"),
                new ModelInfo("gpt-4o", new BigDecimal("0.0000028"), "OpenAI"),
                new ModelInfo("gpt-4o-mini", new BigDecimal("0.0000012"), "OpenAI"),

                new ModelInfo("claude-3-opus", new BigDecimal("0.0000032"), "Anthropic"),
                new ModelInfo("claude-3.5-sonnet", new BigDecimal("0.0000024"), "Anthropic"),

                new ModelInfo("gemini-1.5-pro", new BigDecimal("0.0000026"), "Google"),
                new ModelInfo("gemini-1.5-flash", new BigDecimal("0.0000015"), "Google"),

                new ModelInfo("llama-3.1-70b", new BigDecimal("0.0000036"), "Meta"),
                new ModelInfo("llama-3.1-8b", new BigDecimal("0.0000010"), "Meta"),

                new ModelInfo("mistral-large", new BigDecimal("0.0000027"), "Mistral"),
                new ModelInfo("mistral-small", new BigDecimal("0.0000014"), "Mistral"),

                new ModelInfo("falcon-180b", new BigDecimal("0.0000042"), "TII"),
                new ModelInfo("falcon-7b", new BigDecimal("0.0000011"), "TII")
        );
    }

    @GetMapping("/regions")
    public RegionsResponse regions() {
        // Provide a comprehensive list of common regions; the platform still accepts custom regions.
        // Region IDs intentionally follow GCP-style identifiers.
        var regions = List.of(
            "africa-south1",

            "asia-east1",
            "asia-east2",
            "asia-northeast1",
            "asia-northeast2",
            "asia-northeast3",
            "asia-south1",
            "asia-south2",
            "asia-southeast1",
            "asia-southeast2",

            "australia-southeast1",
            "australia-southeast2",

            "europe-central2",
            "europe-north1",
            "europe-southwest1",
            "europe-west1",
            "europe-west2",
            "europe-west3",
            "europe-west4",
            "europe-west6",
            "europe-west8",
            "europe-west9",
            "europe-west10",
            "europe-west12",

            "me-central1",
            "me-central2",
            "me-west1",

            "northamerica-northeast1",
            "northamerica-northeast2",

            "southamerica-east1",
            "southamerica-west1",

            "us-central1",
            "us-east1",
            "us-east4",
            "us-east5",
            "us-south1",
            "us-west1",
            "us-west2",
            "us-west3",
            "us-west4"
        );

        // Optional: a few known intensities (g/kWh). Unknown regions default inside RegionCarbonService/ai-engine.
        var intensities = Map.of(
                "asia-south1", new BigDecimal("710"),
                "asia-east1", new BigDecimal("520"),
                "us-central1", new BigDecimal("410"),
                "us-east1", new BigDecimal("360"),
                "europe-west1", new BigDecimal("220"),
                "europe-north1", new BigDecimal("110"),
                "us-west1", new BigDecimal("400")
        );

        return new RegionsResponse(regions, intensities);
    }

    public record ModelInfo(String id, BigDecimal powerFactor, String provider) {}

    public record RegionsResponse(List<String> regions, Map<String, BigDecimal> intensitiesGPerKwh) {}
}
