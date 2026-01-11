import { type ReactNode, useMemo, useState } from 'react'
import { api } from '../api'
import { AlertBanner } from '../components/AlertBanner'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { useActiveBudget } from '../hooks/useActiveBudget'
import { useMeta } from '../hooks/useMeta'
import { pickGreenestModel, pickGreenestRegion } from '../lib/green'

type AdvisorResponse = {
  recommendations: string[]
  modelSuggestions: string[]
  tokenOptimizationTips: string[]
}

export default function Advisor() {
  const meta = useMeta()
  const budget = useActiveBudget()

  const [model, setModel] = useState('gpt-4o-mini')
  const [region, setRegion] = useState('us-east1')
  const [tokens, setTokens] = useState(12000)
  const [runtimeSeconds, setRuntimeSeconds] = useState(18)
  const [co2Grams, setCo2Grams] = useState(20)
  const [energyKwh, setEnergyKwh] = useState(0.02)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AdvisorResponse | null>(null)

  const greenestModel = useMemo(() => pickGreenestModel(meta.models), [meta.models])
  const greenestRegion = useMemo(() => pickGreenestRegion(meta.intensitiesGPerKwh), [meta.intensitiesGPerKwh])

  function applyOptimization() {
    if (greenestModel) setModel(greenestModel.id)
    setRegion(greenestRegion)
    setTokens((t) => Math.min(t, 5000))
  }

  async function ask() {
    setBusy(true)
    setError(null)
    try {
      const { data } = await api.post<AdvisorResponse>('/advisor', {
        model,
        region,
        tokens,
        runtimeSeconds,
        co2Grams,
        energyKwh
      })
      setResult(data)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Advisor request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Green AI Advisor</h1>
        <p className="mt-1 text-sm text-slate-400">Rule-based optimization tips from the backend (and AI engine when available).</p>
      </div>

      {budget.isExceeded ? (
        <AlertBanner
          kind="danger"
          title="Budget exceeded"
          message="Ask the advisor with greener settings to reduce emissions."
          actionLabel="Apply green optimization"
          onAction={applyOptimization}
        />
      ) : budget.isNearLimit ? (
        <AlertBanner
          kind="warning"
          title="Budget near limit"
          message="Switch to greener model/region and reduce tokens for the next run."
          actionLabel="Apply optimization"
          onAction={applyOptimization}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Ask">
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Model">
                <select value={model} onChange={(e) => setModel(e.target.value)} className="input">
                  {meta.models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id} {m.provider ? `(${m.provider})` : ''}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Region">
                <input value={region} onChange={(e) => setRegion(e.target.value)} className="input" list="regions" />
                <datalist id="regions">
                  {meta.regions.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Tokens">
                <input type="number" min={1} value={tokens} onChange={(e) => setTokens(Number(e.target.value))} className="input" />
              </Field>
              <Field label="Runtime (sec)">
                <input type="number" min={1} value={runtimeSeconds} onChange={(e) => setRuntimeSeconds(Number(e.target.value))} className="input" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="CO2 (g)">
                <input type="number" min={0} value={co2Grams} onChange={(e) => setCo2Grams(Number(e.target.value))} className="input" />
              </Field>
              <Field label="Energy (kWh)">
                <input type="number" min={0} value={energyKwh} onChange={(e) => setEnergyKwh(Number(e.target.value))} className="input" />
              </Field>
            </div>

            {error ? <div className="rounded-lg border border-rose-900 bg-rose-950/40 p-2 text-xs text-rose-200">{error}</div> : null}

            <Button onClick={ask} disabled={busy}>
              {busy ? 'Thinking…' : 'Get Recommendations'}
            </Button>
          </div>
        </Card>

        <Card title="Recommendations">
          {result ? (
            <div className="space-y-4 text-sm">
              <Section title="Actions" items={result.recommendations} />
              <Section title="Model suggestions" items={result.modelSuggestions} />
              <Section title="Token optimization" items={result.tokenOptimizationTips} />
            </div>
          ) : (
            <div className="text-sm text-slate-400">Submit a request to see recommendations.</div>
          )}
        </Card>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-xs text-slate-300">{label}</div>
      <div className="mt-1">{children}</div>
    </div>
  )
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-200">{title}</div>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  )
}

// Tailwind utility
// eslint-disable-next-line no-unused-vars
const _ = null
