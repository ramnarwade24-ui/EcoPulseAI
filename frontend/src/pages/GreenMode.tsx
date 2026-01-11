import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { AlertBanner } from '../components/AlertBanner'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { useActiveBudget } from '../hooks/useActiveBudget'
import { useMeta } from '../hooks/useMeta'
import { pickGreenestModel, pickGreenestRegion } from '../lib/green'

type Status = { enabled: boolean }

type OptimizeResponse = {
  recommendedModel: string
  recommendedRegion: string
  recommendedTokens: number
  rationale: string
}

export default function GreenMode() {
  const meta = useMeta()
  const budget = useActiveBudget()

  const [enabled, setEnabled] = useState(false)
  const [busy, setBusy] = useState(false)

  const [model, setModel] = useState('gpt-4o-mini')
  const [region, setRegion] = useState('us-east1')
  const [tokens, setTokens] = useState(12000)
  const [runtimeSeconds, setRuntimeSeconds] = useState(18)
  const [constraints, setConstraints] = useState('quality>=medium, latency<=2s')

  const [result, setResult] = useState<OptimizeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const greenestModel = useMemo(() => pickGreenestModel(meta.models), [meta.models])
  const greenestRegion = useMemo(() => pickGreenestRegion(meta.intensitiesGPerKwh), [meta.intensitiesGPerKwh])

  function applyGreenDefaults() {
    if (greenestModel) setModel(greenestModel.id)
    setRegion(greenestRegion)
    setTokens((t) => Math.min(t, 5000))
  }

  async function refresh() {
    const { data } = await api.get<Status>('/green-mode')
    setEnabled(data.enabled)
  }

  useEffect(() => {
    refresh().catch(() => {})
  }, [])

  async function toggle(next: boolean) {
    setBusy(true)
    setError(null)
    try {
      const { data } = await api.post<Status>('/green-mode', { enabled: next })
      setEnabled(data.enabled)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to update green mode')
    } finally {
      setBusy(false)
    }
  }

  async function optimize() {
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const { data } = await api.post<OptimizeResponse>('/green-mode/optimize', {
        model,
        region,
        tokens,
        runtimeSeconds,
        constraints: constraints
          .split(',')
          .map((x) => x.trim())
          .filter(Boolean)
      })
      setResult(data)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Optimization failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Green AI Mode</h1>
        <p className="mt-1 text-sm text-slate-400">Auto-optimizer that recommends greener settings.</p>
      </div>

      {budget.isNearLimit || budget.isExceeded ? (
        <AlertBanner
          kind={budget.isExceeded ? 'danger' : 'warning'}
          title={budget.isExceeded ? 'Budget exceeded' : 'Budget near limit'}
          message={
            enabled
              ? 'Green Mode is enabled. Apply greener defaults and run the optimizer for recommendations.'
              : 'Enable Green Mode to automatically prioritize lower-emission choices.'
          }
          actionLabel={enabled ? 'Apply greener defaults' : 'Enable Green Mode'}
          onAction={() => (enabled ? applyGreenDefaults() : toggle(true))}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Toggle">
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4">
            <div>
              <div className="text-sm font-semibold text-slate-200">Status</div>
              <div className="mt-1 text-xs text-slate-400">Persisted in Redis per user</div>
            </div>
            <div className="flex items-center gap-2">
              <span className={"text-sm " + (enabled ? 'text-emerald-300' : 'text-slate-400')}>{enabled ? 'Enabled' : 'Disabled'}</span>
              <button
                onClick={() => toggle(!enabled)}
                disabled={busy}
                className={
                  'h-8 w-14 rounded-full border transition ' +
                  (enabled ? 'border-emerald-700 bg-emerald-600' : 'border-slate-700 bg-slate-800')
                }
              >
                <div
                  className={
                    'h-6 w-6 translate-x-1 rounded-full bg-slate-950 transition ' + (enabled ? 'translate-x-7' : '')
                  }
                />
              </button>
            </div>
          </div>
        </Card>

        <Card title="Optimizer">
          <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300">Model</label>
                <select value={model} onChange={(e) => setModel(e.target.value)} className="input">
                  {meta.models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id} {m.provider ? `(${m.provider})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-300">Region</label>
                <input value={region} onChange={(e) => setRegion(e.target.value)} className="input" list="regions" />
                <datalist id="regions">
                  {meta.regions.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-300">Tokens</label>
                <input type="number" min={1} value={tokens} onChange={(e) => setTokens(Number(e.target.value))} className="input" />
              </div>
              <div>
                <label className="text-xs text-slate-300">Runtime (sec)</label>
                <input type="number" min={1} value={runtimeSeconds} onChange={(e) => setRuntimeSeconds(Number(e.target.value))} className="input" />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-300">Constraints (comma separated)</label>
              <input value={constraints} onChange={(e) => setConstraints(e.target.value)} className="input" />
            </div>

            {error ? <div className="rounded-lg border border-rose-900 bg-rose-950/40 p-2 text-xs text-rose-200">{error}</div> : null}

            <Button onClick={optimize} disabled={busy}>
              {busy ? 'Optimizing…' : 'Get Recommendations'}
            </Button>

            {result ? (
              <div className="rounded-xl border border-emerald-900 bg-emerald-950/30 p-3 text-sm text-emerald-100">
                <div className="font-semibold">Recommended</div>
                <div className="mt-1 text-xs text-emerald-200">
                  Model: {result.recommendedModel} • Region: {result.recommendedRegion} • Tokens: {result.recommendedTokens}
                </div>
                <div className="mt-2 text-xs text-emerald-200">{result.rationale}</div>
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </div>
  )
}
