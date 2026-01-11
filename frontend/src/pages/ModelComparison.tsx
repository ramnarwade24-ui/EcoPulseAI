import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { AlertBanner } from '../components/AlertBanner'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { useActiveBudget } from '../hooks/useActiveBudget'
import { useMeta } from '../hooks/useMeta'
import { pickGreenestModel, pickGreenestRegion } from '../lib/green'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

type RegionCarbonResult = {
  region: string
  carbonIntensityGPerKwh: string
  source: string
}

function estimate(tokens: number, runtimeSeconds: number, modelFactor: number, intensity: number, waterFactor: number) {
  const hours = runtimeSeconds / 3600
  const energy = tokens * modelFactor * hours
  const co2 = energy * intensity
  const water = energy * waterFactor
  return { energy, co2, water }
}

export default function ModelComparison() {
  const meta = useMeta()
  const budget = useActiveBudget()

  const [region, setRegion] = useState('us-east1')
  const [tokens, setTokens] = useState(12000)
  const [runtimeSeconds, setRuntimeSeconds] = useState(18)
  const [waterFactor, setWaterFactor] = useState(1.8)

  const [selectedModels, setSelectedModels] = useState<string[]>(['gpt-4o-mini', 'gpt-4o'])

  const [intensity, setIntensity] = useState<number>(400)
  const [source, setSource] = useState<string>('')
  const [busy, setBusy] = useState(false)

  const greenestModel = useMemo(() => pickGreenestModel(meta.models), [meta.models])
  const greenestRegion = useMemo(() => pickGreenestRegion(meta.intensitiesGPerKwh), [meta.intensitiesGPerKwh])

  useEffect(() => {
    // On first meta load, ensure our default selection is valid.
    if (!meta.models.length) return
    setSelectedModels((cur) => {
      const filtered = cur.filter((id) => meta.models.some((m) => m.id === id))
      if (filtered.length) return filtered
      return meta.models.slice(0, 2).map((m) => m.id)
    })
  }, [meta.models])

  async function loadIntensity() {
    setBusy(true)
    try {
      if (meta.intensitiesGPerKwh[region] != null) {
        setIntensity(meta.intensitiesGPerKwh[region])
        setSource('meta')
      } else {
        const { data } = await api.get<RegionCarbonResult>(`/region-carbon?region=${encodeURIComponent(region)}`)
        setIntensity(Number(data.carbonIntensityGPerKwh))
        setSource(data.source)
      }
    } finally {
      setBusy(false)
    }
  }

  const rows = useMemo(() => {
    const items = selectedModels
      .map((id) => {
        const info = meta.models.find((m) => m.id === id)
        if (!info) return null
        const factor = Number(info.powerFactor)
        const est = estimate(tokens, runtimeSeconds, factor, intensity, waterFactor)
        return {
          id,
          provider: info.provider,
          factor,
          ...est
        }
      })
      .filter(Boolean) as Array<{ id: string; provider: string; factor: number; energy: number; co2: number; water: number }>

    return items.sort((a, b) => a.co2 - b.co2)
  }, [selectedModels, meta.models, tokens, runtimeSeconds, intensity, waterFactor])

  const chartData = useMemo(() => {
    return rows.map((r) => ({ name: r.id, co2: Number(r.co2.toFixed(2)) }))
  }, [rows])

  function selectGreenestModels() {
    const ids = [...meta.models]
      .sort((a, b) => Number(a.powerFactor) - Number(b.powerFactor))
      .slice(0, 5)
      .map((m) => m.id)
    if (ids.length) setSelectedModels(ids)
    if (greenestRegion) setRegion(greenestRegion)
    setTokens((t) => Math.min(t, 5000))
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">AI Model Comparison</h1>
        <p className="mt-1 text-sm text-slate-400">Compare energy/CO2/water trade-offs across any number of models.</p>
      </div>

      {budget.isNearLimit || budget.isExceeded ? (
        <AlertBanner
          kind={budget.isExceeded ? 'danger' : 'warning'}
          title={budget.isExceeded ? 'Budget exceeded' : 'Budget near limit'}
          message="Compare greener options and reduce tokens to stay within budget."
          actionLabel="Select greenest options"
          onAction={selectGreenestModels}
        />
      ) : null}

      <Card title="Scenario">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="text-xs text-slate-300">Region</label>
            <input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
              list="regions"
            />
            <datalist id="regions">
              {meta.regions.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
            <div className="mt-1 text-xs text-slate-500">
              Intensity: {intensity} g/kWh {source ? `(${source})` : ''}
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-300">Tokens</label>
            <input
              type="number"
              min={1}
              value={tokens}
              onChange={(e) => setTokens(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-300">Runtime (sec)</label>
            <input
              type="number"
              min={1}
              value={runtimeSeconds}
              onChange={(e) => setRuntimeSeconds(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-slate-300">Water factor (L/kWh)</label>
            <input
              type="number"
              min={0}
              step={0.1}
              value={waterFactor}
              onChange={(e) => setWaterFactor(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="mt-3">
          <Button onClick={loadIntensity} disabled={busy}>
            {busy ? 'Loading…' : 'Refresh Region Intensity'}
          </Button>
        </div>
      </Card>

      <Card title="Models">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs text-slate-300">Select models (multi-select)</label>
            <select
              multiple
              value={selectedModels}
              onChange={(e) => {
                const next = Array.from(e.target.selectedOptions).map((o) => o.value)
                setSelectedModels(next)
              }}
              className="mt-1 h-48 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
            >
              {meta.models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id} {m.provider ? `(${m.provider})` : ''}
                </option>
              ))}
            </select>
            <div className="mt-1 text-xs text-slate-500">Hold Ctrl/Cmd to select multiple models.</div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
            <div className="text-xs font-semibold text-slate-200">CO2 per model</div>
            <div className="mt-2 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                  <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#0b1220', border: '1px solid #1e293b', color: '#e2e8f0' }} />
                  <Bar dataKey="co2" fill="#34d399" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="py-2 pr-4">Model</th>
                <th className="py-2 pr-4">Provider</th>
                <th className="py-2 pr-4">Power factor</th>
                <th className="py-2 pr-4">Energy (kWh)</th>
                <th className="py-2 pr-4">CO2 (g)</th>
                <th className="py-2 pr-4">Water (L)</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {rows.map((r, i) => (
                <tr key={r.id} className={i === 0 ? 'text-emerald-200' : ''}>
                  <td className="py-2 pr-4 font-medium">{r.id}</td>
                  <td className="py-2 pr-4 text-slate-400">{r.provider}</td>
                  <td className="py-2 pr-4 text-slate-400">{r.factor.toExponential(2)}</td>
                  <td className="py-2 pr-4">{r.energy.toFixed(6)}</td>
                  <td className="py-2 pr-4">{r.co2.toFixed(2)}</td>
                  <td className="py-2 pr-4">{r.water.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Recommendation">
        <div className="text-sm text-slate-300">
          {rows.length ? (
            <span>
              Prefer <span className="font-semibold text-emerald-300">{rows[0].id}</span> for lowest CO2 in this scenario.
            </span>
          ) : (
            <span>Select at least one model to compare.</span>
          )}
        </div>
        {greenestModel ? (
          <div className="mt-2 text-xs text-slate-500">Greenest by power factor: {greenestModel.id}. Suggested region: {greenestRegion}.</div>
        ) : null}
        <div className="mt-2 text-xs text-slate-500">This page uses the same deterministic formula as the backend calculator.</div>
      </Card>
    </div>
  )
}
