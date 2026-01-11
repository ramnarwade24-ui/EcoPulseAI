package com.ecopulse.backend.client;

import com.ecopulse.backend.config.BackendProperties;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientRequestException;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.util.retry.Retry;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Component
public class AiEngineClient {
    private final WebClient client;

    public AiEngineClient(WebClient.Builder builder, BackendProperties properties) {
        this.client = builder
                .baseUrl(properties.aiEngine().baseUrl())
                .build();
    }

    public Optional<RegionCarbonResponse> regionCarbon(String region) {
        try {
            var response = client.get()
                    .uri(uri -> uri.path("/region-carbon").queryParam("region", region).build())
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .bodyToMono(RegionCarbonResponse.class)
                    .retryWhen(defaultRetry())
                    .block(Duration.ofSeconds(5));
            return Optional.ofNullable(response);
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }

    public Optional<EmissionCalcResponse> calculateEmissions(EmissionCalcRequest request) {
        try {
            var response = client.post()
                    .uri("/emissions/calculate")
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(EmissionCalcResponse.class)
                    .retryWhen(defaultRetry())
                    .block(Duration.ofSeconds(6));
            return Optional.ofNullable(response);
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }

    public Optional<AdvisorResponse> advisor(AdvisorRequest request) {
        try {
            var response = client.post()
                    .uri("/advisor")
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(AdvisorResponse.class)
                    .retryWhen(defaultRetry())
                    .block(Duration.ofSeconds(6));
            return Optional.ofNullable(response);
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }

    public Optional<SchedulerResponse> schedule(SchedulerRequest request) {
        try {
            var response = client.post()
                    .uri("/scheduler")
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(SchedulerResponse.class)
                    .retryWhen(defaultRetry())
                    .block(Duration.ofSeconds(6));
            return Optional.ofNullable(response);
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }

    public Optional<GreenModeOptimizeResponse> greenModeOptimize(GreenModeOptimizeRequest request) {
        try {
            var response = client.post()
                    .uri("/green-mode/optimize")
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .bodyValue(request)
                    .retrieve()
                    .bodyToMono(GreenModeOptimizeResponse.class)
                    .retryWhen(defaultRetry())
                    .block(Duration.ofSeconds(6));
            return Optional.ofNullable(response);
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }

    private static Retry defaultRetry() {
        return Retry.backoff(3, Duration.ofMillis(200))
                .maxBackoff(Duration.ofSeconds(1))
                .filter(AiEngineClient::isRetryable)
                .onRetryExhaustedThrow((spec, signal) -> signal.failure());
    }

    private static boolean isRetryable(Throwable t) {
        if (t instanceof WebClientRequestException) return true;
        if (t instanceof WebClientResponseException ex) {
            return ex.getStatusCode().is5xxServerError();
        }
        return false;
    }

    // DTOs - mirror ai-engine JSON contracts (kept stable and small)

    public record RegionCarbonResponse(String region, BigDecimal carbonIntensityGPerKwh, String source) {}

    public record EmissionCalcRequest(
            String model,
            String region,
            long tokens,
            double runtimeSeconds,
            BigDecimal modelPowerFactor,
            BigDecimal regionCarbonIntensity,
            BigDecimal waterFactor
    ) {}

    public record EmissionCalcResponse(
            BigDecimal energyKwh,
            BigDecimal co2Grams,
            BigDecimal waterLiters,
            Integer greenScore,
            Map<String, Object> extras
    ) {}

    public record AdvisorRequest(
            String model,
            String region,
            long tokens,
            double runtimeSeconds,
            BigDecimal co2Grams,
            BigDecimal energyKwh
    ) {}

    public record AdvisorResponse(
            List<String> recommendations,
            List<String> modelSuggestions,
            List<String> tokenOptimizationTips
    ) {}

    public record SchedulerRequest(
            String model,
            long tokens,
            double runtimeSeconds,
            List<String> candidateRegions,
            Instant notBefore,
            Instant notAfter
    ) {}

    public record SchedulerResponse(
            String recommendedRegion,
            Instant recommendedStartTime,
            String rationale
    ) {}

    public record GreenModeOptimizeRequest(
            String model,
            String region,
            long tokens,
            double runtimeSeconds,
            List<String> constraints
    ) {}

    public record GreenModeOptimizeResponse(
            String recommendedModel,
            String recommendedRegion,
            Long recommendedTokens,
            String rationale
    ) {}
}
