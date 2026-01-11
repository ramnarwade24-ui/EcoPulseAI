from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

app = FastAPI(title="EcoPulse AI Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"] ,
    allow_headers=["*"] ,
)

REGION_INTENSITY_G_PER_KWH: Dict[str, Decimal] = {
    "asia-south1": Decimal("710"),
    "asia-east1": Decimal("520"),
    "us-central1": Decimal("410"),
    "us-east1": Decimal("360"),
    "europe-west1": Decimal("220"),
    "europe-north1": Decimal("110"),
}

DEFAULT_INTENSITY = Decimal("400")
DEFAULT_WATER_FACTOR_L_PER_KWH = Decimal("1.8")


def _q(x: Decimal, scale: int = 8) -> Decimal:
    return x.quantize(Decimal(10) ** -scale, rounding=ROUND_HALF_UP)


def _normalize_region(region: Optional[str]) -> str:
    return (region or "").strip().lower()


def _green_score(co2_grams: Decimal, tokens: int) -> int:
    denom = max(1, int(tokens))
    per_1k = (co2_grams / Decimal(denom)) * Decimal(1000)
    x = float(per_1k)
    score = round(100 - ((x - 50.0) / (500.0 - 50.0)) * 100)
    return max(0, min(100, int(score)))


class RegionCarbonResponse(BaseModel):
    region: str
    carbonIntensityGPerKwh: Decimal
    source: str


class RegionCarbonRequest(BaseModel):
    region: str = Field(..., min_length=1)


class EmissionCalcRequest(BaseModel):
    model: str = Field(..., min_length=1)
    region: str = Field(..., min_length=1)
    tokens: int = Field(..., ge=0)
    runtimeSeconds: float = Field(..., gt=0)
    modelPowerFactor: Decimal = Field(..., gt=0)
    regionCarbonIntensity: Decimal = Field(..., gt=0)
    waterFactor: Decimal = Field(DEFAULT_WATER_FACTOR_L_PER_KWH, gt=0)


class EmissionCalcResponse(BaseModel):
    energyKwh: Decimal
    co2Grams: Decimal
    waterLiters: Decimal
    greenScore: int
    extras: Optional[Dict[str, Any]] = None


class AdvisorRequest(BaseModel):
    model: str
    region: str
    tokens: int
    runtimeSeconds: float
    co2Grams: Decimal
    energyKwh: Decimal


class AdvisorResponse(BaseModel):
    recommendations: List[str]
    modelSuggestions: List[str]
    tokenOptimizationTips: List[str]


class SchedulerRequest(BaseModel):
    model: str
    tokens: int
    runtimeSeconds: float
    candidateRegions: List[str] = Field(default_factory=list)
    notBefore: Optional[datetime] = None
    notAfter: Optional[datetime] = None


class SchedulerResponse(BaseModel):
    recommendedRegion: str
    recommendedStartTime: datetime
    rationale: str


class GreenModeOptimizeRequest(BaseModel):
    model: str
    region: str
    tokens: int
    runtimeSeconds: float
    constraints: List[str] = Field(default_factory=list)


class GreenModeOptimizeResponse(BaseModel):
    recommendedModel: str
    recommendedRegion: str
    recommendedTokens: int
    rationale: str


class ReportGenerateRequest(BaseModel):
    entries: List[EmissionCalcRequest] = Field(default_factory=list)


class ReportGenerateResponse(BaseModel):
    totalEnergyKwh: Decimal
    totalCo2Grams: Decimal
    totalWaterLiters: Decimal
    averageGreenScore: int
    notes: List[str]


@app.get("/healthz")
def healthz() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/region-carbon", response_model=RegionCarbonResponse)
def region_carbon(region: str = Query(..., min_length=1)) -> RegionCarbonResponse:
    normalized = _normalize_region(region)
    intensity = REGION_INTENSITY_G_PER_KWH.get(normalized, DEFAULT_INTENSITY)
    source = "map" if normalized in REGION_INTENSITY_G_PER_KWH else "default"
    return RegionCarbonResponse(region=normalized, carbonIntensityGPerKwh=intensity, source=source)


@app.post("/emissions/calculate", response_model=EmissionCalcResponse)
def emissions_calculate(req: EmissionCalcRequest) -> EmissionCalcResponse:
    # Mirror backend fallback formula:
    # runtimeSeconds -> runtimeHours
    runtime_hours = Decimal(str(req.runtimeSeconds)) / Decimal(3600)
    energy = Decimal(req.tokens) * req.modelPowerFactor * runtime_hours
    co2 = energy * req.regionCarbonIntensity
    water = energy * (req.waterFactor or DEFAULT_WATER_FACTOR_L_PER_KWH)

    energy_q = _q(energy)
    co2_q = _q(co2)
    water_q = _q(water)

    score = _green_score(co2_q, req.tokens)
    return EmissionCalcResponse(
        energyKwh=energy_q,
        co2Grams=co2_q,
        waterLiters=water_q,
        greenScore=score,
        extras={
            "runtimeHours": float(runtime_hours),
        },
    )


@app.post("/advisor", response_model=AdvisorResponse)
def advisor(req: AdvisorRequest) -> AdvisorResponse:
    region = _normalize_region(req.region)
    intensity = REGION_INTENSITY_G_PER_KWH.get(region, DEFAULT_INTENSITY)

    recs: List[str] = []
    model_suggestions: List[str] = []
    token_tips: List[str] = []

    score = _green_score(req.co2Grams, req.tokens)
    recs.append(f"Estimated green score: {score}/100")

    if intensity >= Decimal("400"):
        recs.append("Consider shifting workloads to a lower-carbon region (e.g., europe-north1).")

    if req.tokens >= 50_000:
        token_tips.append("Reduce tokens: summarize prompts, reuse context, and enable response compression.")

    if req.runtimeSeconds >= 60:
        recs.append("Long runtimes increase energy use—optimize batching and timeouts.")

    if "gpt-4" in (req.model or "").lower():
        model_suggestions.append("Try a smaller model for low-stakes tasks; reserve large models for high-value queries.")

    if not model_suggestions:
        model_suggestions.append("Track model power factors and pick the lightest model that meets accuracy needs.")

    if not token_tips:
        token_tips.append("Cap max output tokens and avoid unnecessary retries.")

    return AdvisorResponse(
        recommendations=recs,
        modelSuggestions=model_suggestions,
        tokenOptimizationTips=token_tips,
    )


@app.post("/scheduler", response_model=SchedulerResponse)
def scheduler(req: SchedulerRequest) -> SchedulerResponse:
    candidates = [
        _normalize_region(r) for r in (req.candidateRegions or []) if _normalize_region(r)
    ]
    if not candidates:
        candidates = list(REGION_INTENSITY_G_PER_KWH.keys())

    best = min(candidates, key=lambda r: REGION_INTENSITY_G_PER_KWH.get(r, DEFAULT_INTENSITY))

    now = datetime.now(tz=timezone.utc)
    start = now
    if req.notBefore:
        start = max(start, req.notBefore)
    if req.notAfter and start > req.notAfter:
        start = req.notAfter

    best_intensity = REGION_INTENSITY_G_PER_KWH.get(best, DEFAULT_INTENSITY)
    rationale = f"Selected {best} with carbon intensity {best_intensity} g/kWh among candidates."  # noqa: E501

    return SchedulerResponse(recommendedRegion=best, recommendedStartTime=start, rationale=rationale)


@app.post("/green-mode/optimize", response_model=GreenModeOptimizeResponse)
def green_mode_optimize(req: GreenModeOptimizeRequest) -> GreenModeOptimizeResponse:
    constraints = {c.strip().lower() for c in (req.constraints or [])}

    keep_region = any(k in constraints for k in ["keep_region", "fixed_region", "lock_region"])
    keep_model = any(k in constraints for k in ["keep_model", "fixed_model", "lock_model"])
    keep_tokens = any(k in constraints for k in ["no_token_change", "lock_tokens"])

    recommended_region = _normalize_region(req.region)
    if not keep_region:
        recommended_region = min(
            REGION_INTENSITY_G_PER_KWH.keys(),
            key=lambda r: REGION_INTENSITY_G_PER_KWH.get(r, DEFAULT_INTENSITY),
        )

    recommended_model = req.model if keep_model else req.model

    recommended_tokens = int(req.tokens) if keep_tokens else max(1, int(round(req.tokens * 0.9)))

    rationale_bits = []
    if recommended_region != _normalize_region(req.region):
        rationale_bits.append("shift to lowest-carbon region")
    if recommended_tokens != int(req.tokens):
        rationale_bits.append("reduce tokens by 10%")

    rationale = " / ".join(rationale_bits) if rationale_bits else "constraints keep current settings"

    return GreenModeOptimizeResponse(
        recommendedModel=recommended_model,
        recommendedRegion=recommended_region,
        recommendedTokens=recommended_tokens,
        rationale=rationale,
    )


# v1 API (newer contract). Keep legacy routes above for compatibility with backend.


@app.post("/v1/region-carbon", response_model=RegionCarbonResponse)
def v1_region_carbon(req: RegionCarbonRequest) -> RegionCarbonResponse:
    return region_carbon(req.region)


@app.post("/v1/emissions/calculate", response_model=EmissionCalcResponse)
def v1_emissions_calculate(req: EmissionCalcRequest) -> EmissionCalcResponse:
    return emissions_calculate(req)


@app.post("/v1/advisor/ask", response_model=AdvisorResponse)
def v1_advisor(req: AdvisorRequest) -> AdvisorResponse:
    return advisor(req)


@app.post("/v1/scheduler/suggest-window", response_model=SchedulerResponse)
def v1_scheduler(req: SchedulerRequest) -> SchedulerResponse:
    return scheduler(req)


@app.post("/v1/green-mode/optimize", response_model=GreenModeOptimizeResponse)
def v1_green_mode(req: GreenModeOptimizeRequest) -> GreenModeOptimizeResponse:
    return green_mode_optimize(req)


@app.post("/v1/report/generate", response_model=ReportGenerateResponse)
def v1_report_generate(req: ReportGenerateRequest) -> ReportGenerateResponse:
    totals_energy = Decimal("0")
    totals_co2 = Decimal("0")
    totals_water = Decimal("0")
    scores: List[int] = []

    for entry in req.entries:
        calc = emissions_calculate(entry)
        totals_energy += calc.energyKwh
        totals_co2 += calc.co2Grams
        totals_water += calc.waterLiters
        scores.append(calc.greenScore)

    avg_score = int(round(sum(scores) / len(scores))) if scores else 0

    notes: List[str] = []
    if totals_co2 > Decimal("10000"):
        notes.append("High total CO2 detected; consider region shifting and token reductions.")
    if not notes:
        notes.append("Totals look reasonable; keep tracking trends over time.")

    return ReportGenerateResponse(
        totalEnergyKwh=_q(totals_energy),
        totalCo2Grams=_q(totals_co2),
        totalWaterLiters=_q(totals_water),
        averageGreenScore=avg_score,
        notes=notes,
    )
