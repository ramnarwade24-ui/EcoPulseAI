import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { AlertBanner } from '../components/AlertBanner'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { InfoDot, Tooltip } from '../components/Tooltip'
import { useActiveBudget } from '../hooks/useActiveBudget'
import { useMeta } from '../hooks/useMeta'
import { pickGreenestModel, pickGreenestRegion } from '../lib/green'

type RegionCarbonResult = {
  region: string
  carbonIntensityGPerKwh: string
  source: string
}

type EmissionView = {
  id: string
  createdAt: string
  model: string
  region: string
  tokens: number
  runtimeSeconds: number
  energyKwh: string
  co2Grams: string
  waterLiters: string
  greenScore: number
}

export default function Calculator() {
  const meta = useMeta()
  const budget = useActiveBudget()

  const [model, setModel] = useState('gpt-4o-mini')
  const [region, setRegion] = useState('us-east1')
  const [tokens, setTokens] = useState(12000)
  const [runtimeSeconds, setRuntimeSeconds] = useState(18)
  const [modelFactor, setModelFactor] = useState(0.0000012)
  const [modelFactorOverridden, setModelFactorOverridden] = useState(false)

  const [regionIntensity, setRegionIntensity] = useState<number | null>(null)
  const [waterFactor, setWaterFactor] = useState(1.8)

  const [result, setResult] = useState<EmissionView | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [autoOptimizeOnSubmit, setAutoOptimizeOnSubmit] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ecopulse.autoOptimizeOnSubmit') === 'true'
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('ecopulse.autoOptimizeOnSubmit', String(autoOptimizeOnSubmit))
    } catch {
      // ignore
    }
  }, [autoOptimizeOnSubmit])

  const greenestModel = useMemo(() => pickGreenestModel(meta.models), [meta.models])
  const greenestRegion = useMemo(() => pickGreenestRegion(meta.intensitiesGPerKwh), [meta.intensitiesGPerKwh])

  const allowedModels = useMemo(() => {
    if (!meta.models.length) return []
    if (!budget.isExceeded) return meta.models
    return [...meta.models]
      .sort((a, b) => Number(a.powerFactor) - Number(b.powerFactor))
      .slice(0, 3)
  }, [meta.models, budget.isExceeded])

  useEffect(() => {
    if (!meta.models.length) return
    if (meta.models.some((m) => m.id === model)) return
    const preferred = meta.models.find((m) => m.id === 'gpt-4o-mini') ?? meta.models[0]
    setModel(preferred.id)
  }, [meta.models, model])

  useEffect(() => {
    if (!meta.models.length) return
    if (modelFactorOverridden) return
    const m = meta.models.find((x) => x.id === model)
    if (m) setModelFactor(Number(m.powerFactor))
  }, [meta.models, model, modelFactorOverridden])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        setError(null)
        // If we have a curated intensity for this region, use it immediately.
        if (meta.intensitiesGPerKwh[region] != null) {
          setRegionIntensity(meta.intensitiesGPerKwh[region])
          return
        }
        const { data } = await api.get<RegionCarbonResult>(`/region-carbon?region=${encodeURIComponent(region)}`)
        if (!active) return
        setRegionIntensity(Number(data.carbonIntensityGPerKwh))
      } catch {
        if (!active) return
        setRegionIntensity(null)
      }
    })()
    return () => {
      active = false
    }
  }, [region, meta.intensitiesGPerKwh])

  const isModelBlocked = useMemo(() => {
    if (!budget.isExceeded) return false
    if (!allowedModels.length) return false
    return !allowedModels.some((m) => m.id === model)
  }, [budget.isExceeded, allowedModels, model])

  const blockedModels = useMemo(() => {
    if (!budget.isExceeded || !meta.models.length || !allowedModels.length) return []
    const allowed = new Set(allowedModels.map((m) => m.id))
    return meta.models.filter((m) => !allowed.has(m.id))
  }, [budget.isExceeded, meta.models, allowedModels])

  const localEstimate = useMemo(() => {
    const intensity = regionIntensity ?? 400
    const hours = runtimeSeconds / 3600
    const energy = tokens * modelFactor * hours
    const co2 = energy * intensity
    const water = energy * waterFactor
    return { energy, co2, water }
  }, [tokens, modelFactor, runtimeSeconds, regionIntensity, waterFactor])

  function computeOptimizedInputs() {
    const hours = runtimeSeconds / 3600
    const pickedModel = greenestModel ?? meta.models.find((m) => m.id === model) ?? null
    const pickedRegion = greenestRegion
    const factor = pickedModel ? Number(pickedModel.powerFactor) : modelFactor
    const intensity = meta.intensitiesGPerKwh[pickedRegion] ?? regionIntensity ?? 400
    const projectedCo2 = tokens * factor * hours * intensity

    let nextTokens = tokens
    if (remainingBudget != null && projectedCo2 > remainingBudget && projectedCo2 > 0) {
      nextTokens = Math.max(1, Math.floor((tokens * remainingBudget * 0.98) / projectedCo2))
    }
    nextTokens = Math.min(nextTokens, 5000)

    return {
      model: pickedModel ? pickedModel.id : model,
      region: pickedRegion,
      tokens: nextTokens,
      modelPowerFactor: factor,
      regionCarbonIntensity: intensity
    }
  }

  const remainingBudget = useMemo(() => {
    if (!budget.status) return null
    const rem = Number(budget.status.remainingCo2Grams)
    return isFinite(rem) ? rem : null
  }, [budget.status])

  const isProjectedOverRemaining = remainingBudget != null ? localEstimate.co2 > remainingBudget : false

  async function run() {
    setError(null)

    let submitModel = model
    let submitRegion = region
    let submitTokens = tokens
    let submitFactor = modelFactor
    let submitIntensity = regionIntensity ?? undefined

    if (autoOptimizeOnSubmit && remainingBudget != null && isProjectedOverRemaining) {
      const o = computeOptimizedInputs()
      submitModel = o.model
      submitRegion = o.region
      submitTokens = o.tokens
      submitFactor = o.modelPowerFactor
      submitIntensity = o.regionCarbonIntensity

      setModel(submitModel)
      setRegion(submitRegion)
      setTokens(submitTokens)
      setModelFactorOverridden(false)
    }

    if (budget.isExceeded) {
      const allowed = allowedModels.length ? allowedModels : meta.models
      const isAllowed = allowed.some((m) => m.id === submitModel)
      if (!isAllowed) {
        setError('Carbon budget exceeded: this model is blocked. Select a greener model or enable Green Mode.')
        return
      }
    }
    setBusy(true)
    setResult(null)
    try {
      const { data } = await api.post<EmissionView>('/emissions/calculate', {
        model: submitModel,
        region: submitRegion,
        tokens: submitTokens,
        runtimeSeconds,
        modelPowerFactor: submitFactor,
        regionCarbonIntensity: submitIntensity,
        waterFactor
      })
      setResult(data)
      budget.refresh().catch(() => {})
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to calculate')
    } finally {
      setBusy(false)
    }
  }

  function applyOptimization() {
    if (greenestModel) {
      setModel(greenestModel.id)
      setModelFactorOverridden(false)
    }
    setRegion(greenestRegion)
    setTokens((t) => Math.min(t, 5000))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Real-Time Emission Calculator</h1>
        <p className="mt-1 text-sm text-slate-400">
          Estimates energy, CO2 and water from token usage with region carbon intensity.
        </p>
      </div>

      {budget.isExceeded ? (
        <AlertBanner
          kind="danger"
          title="Budget exceeded: high-emission models blocked"
          message="Pick a greener model and region, or reduce tokens to get back under the limit."
          actionLabel="Apply green optimization"
          onAction={applyOptimization}
        />
      ) : budget.isNearLimit ? (
        <AlertBanner
          kind="warning"
          title="Budget near limit"
          message="Apply green optimization to reduce emissions: greenest model/region + fewer tokens."
          actionLabel="Apply optimization"
          onAction={applyOptimization}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Inputs">
          <div className="grid gap-3">
            <div>
              <label className="text-xs text-slate-300">
                Model
                {budget.isExceeded ? <InfoDot text="When over budget, only the greenest models are allowed." /> : null}
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
              >
                {meta.models.map((m) => {
                  const blocked = budget.isExceeded && allowedModels.length ? !allowedModels.some((x) => x.id === m.id) : false
                  return (
                    <option key={m.id} value={m.id} disabled={blocked}>
                      {m.id} {m.provider ? `(${m.provider})` : ''} {blocked ? '— blocked' : ''}
                    </option>
                  )
                })}
              </select>
              {isModelBlocked ? (
                <div className="mt-1 text-xs text-rose-300">This model is blocked while over budget.</div>
              ) : null}
              {blockedModels.length ? (
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                  <span>Blocked:</span>
                  {blockedModels.slice(0, 8).map((m) => (
                    <Tooltip key={m.id} text="Blocked because budget is exceeded. Choose a greener model or wait for the next period.">
                      <span className="rounded-full border border-slate-800 bg-slate-950 px-2 py-0.5 text-slate-300">{m.id}</span>
                    </Tooltip>
                  ))}
                </div>
              ) : null}
            </div>
            <div>
              <label className="text-xs text-slate-300">Region</label>
              <input
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
                placeholder="e.g. asia-south1"
                list="regions"
              />
              <datalist id="regions">
                {meta.regions.map((r) => (
                  <option key={r} value={r} />
                ))}
              </datalist>
              <div className="mt-1 text-xs text-slate-500">
                Carbon intensity: {regionIntensity ? `${regionIntensity} g/kWh` : '—'}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300">Tokens</label>
                <input
                  value={tokens}
                  onChange={(e) => setTokens(Number(e.target.value))}
                  type="number"
                  min={1}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300">Runtime (sec)</label>
                <input
                  value={runtimeSeconds}
                  onChange={(e) => setRuntimeSeconds(Number(e.target.value))}
                  type="number"
                  min={1}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300">Model factor</label>
                <input
                  value={modelFactor}
                  onChange={(e) => {
                    setModelFactor(Number(e.target.value))
                    setModelFactorOverridden(true)
                  }}
                  type="number"
                  step="0.0000001"
                  min={0}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-300">Water factor (L/kWh)</label>
                <input
                  value={waterFactor}
                  onChange={(e) => setWaterFactor(Number(e.target.value))}
                  type="number"
                  step="0.1"
                  min={0}
                  className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
                />
              </div>
            </div>

            {error ? <div className="rounded-lg border border-rose-900 bg-rose-950/40 p-2 text-xs text-rose-200">{error}</div> : null}

            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Projected CO2</span>
                <span className={isProjectedOverRemaining ? 'text-amber-200' : 'text-slate-200'}>{localEstimate.co2.toFixed(2)} g</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-slate-400">
                <span>Remaining budget</span>
                <span>{remainingBudget != null ? `${Math.max(0, remainingBudget).toFixed(0)} g` : '—'}</span>
              </div>
              {remainingBudget != null && isProjectedOverRemaining ? (
                <div className="mt-2 text-amber-200">
                  Projected CO2 exceeds remaining budget.
                  {autoOptimizeOnSubmit ? ' Auto-optimization will apply on submit.' : ''}
                </div>
              ) : null}
              <label className="mt-3 flex items-center gap-2 text-slate-300">
                <input
                  type="checkbox"
                  checked={autoOptimizeOnSubmit}
                  onChange={(e) => setAutoOptimizeOnSubmit(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950"
                />
                <span>
                  Auto-apply optimization on submit
                  <InfoDot text="If projected CO2 exceeds remaining budget, EcoPulse enforces the greenest model/region and reduces tokens." />
                </span>
              </label>
            </div>

            <Button onClick={run} disabled={busy || isModelBlocked}>
              {busy ? 'Calculating…' : 'Calculate & Save'}
            </Button>
          </div>
        </Card>

        <Card title="Estimate">
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div className="text-xs text-slate-400">Energy</div>
                <div className="mt-1 text-lg font-semibold text-white">{localEstimate.energy.toFixed(6)} kWh</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div className="text-xs text-slate-400">CO2</div>
                <div className="mt-1 text-lg font-semibold text-white">{localEstimate.co2.toFixed(2)} g</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div className="text-xs text-slate-400">Water</div>
                <div className="mt-1 text-lg font-semibold text-white">{localEstimate.water.toFixed(2)} L</div>
              </div>
            </div>

            {result ? (
              <div className="rounded-xl border border-emerald-900 bg-emerald-950/30 p-3 text-sm text-emerald-100">
                <div className="font-semibold">Saved emission log</div>
                <div className="mt-1 text-xs text-emerald-200">
                  CO2: {Number(result.co2Grams).toFixed(2)} g • Energy: {Number(result.energyKwh).toFixed(6)} kWh • Water:{' '}
                  {Number(result.waterLiters).toFixed(2)} L • Score: {result.greenScore}
                </div>
              </div>
            ) : null}

            <div className="text-xs text-slate-500">
              Backend uses the same deterministic formulas and persists results to PostgreSQL.
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
