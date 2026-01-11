import { useMemo, useState } from 'react'
import { api } from '../api'
import { AlertBanner } from '../components/AlertBanner'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { useActiveBudget } from '../hooks/useActiveBudget'
import { useMeta } from '../hooks/useMeta'
import { pickGreenestModel, pickGreenestRegion } from '../lib/green'

type SchedulerResponse = {
  recommendedRegion: string
  recommendedStartTime: string
  rationale: string
}

export default function Scheduler() {
  const meta = useMeta()
  const budget = useActiveBudget()

  const [model, setModel] = useState('gpt-4o-mini')
  const [tokens, setTokens] = useState(12000)
  const [runtimeSeconds, setRuntimeSeconds] = useState(18)
  const [candidateRegions, setCandidateRegions] = useState<string[]>(['us-east1', 'europe-west1', 'asia-south1'])
  const [customRegion, setCustomRegion] = useState('')

  const [result, setResult] = useState<SchedulerResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const greenestModel = useMemo(() => pickGreenestModel(meta.models), [meta.models])
  const greenestRegion = useMemo(() => pickGreenestRegion(meta.intensitiesGPerKwh), [meta.intensitiesGPerKwh])

  function applyOptimization() {
    if (greenestModel) setModel(greenestModel.id)
    setCandidateRegions((cur) => (cur.includes(greenestRegion) ? cur : [greenestRegion, ...cur].slice(0, 5)))
    setTokens((t) => Math.min(t, 5000))
  }

  async function recommend() {
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const { data } = await api.post<SchedulerResponse>('/scheduler/recommendation', {
        model,
        tokens,
        runtimeSeconds,
        candidateRegions: candidateRegions
      })
      setResult(data)
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Scheduler failed')
    } finally {
      setBusy(false)
    }
  }

  function addCustomRegion() {
    const r = customRegion.trim()
    if (!r) return
    setCandidateRegions((cur) => (cur.includes(r) ? cur : [...cur, r]))
    setCustomRegion('')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Carbon Scheduler</h1>
        <p className="mt-1 text-sm text-slate-400">Suggests a greener region/time window for workloads.</p>
      </div>

      {budget.isNearLimit || budget.isExceeded ? (
        <AlertBanner
          kind={budget.isExceeded ? 'danger' : 'warning'}
          title={budget.isExceeded ? 'Budget exceeded' : 'Budget near limit'}
          message="Try a greener model/region and fewer tokens; the scheduler can then pick the best window."
          actionLabel="Apply optimization"
          onAction={applyOptimization}
        />
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Workload">
          <div className="grid gap-3">
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
              <label className="text-xs text-slate-300">Candidate regions</label>
              <select
                multiple
                value={candidateRegions}
                onChange={(e) => {
                  const next = Array.from(e.target.selectedOptions).map((o) => o.value)
                  setCandidateRegions(next)
                }}
                className="mt-1 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm"
              >
                {meta.regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
                {candidateRegions
                  .filter((r) => !meta.regions.includes(r))
                  .map((r) => (
                    <option key={r} value={r}>
                      {r} (custom)
                    </option>
                  ))}
              </select>
              <div className="mt-2 flex gap-2">
                <input
                  value={customRegion}
                  onChange={(e) => setCustomRegion(e.target.value)}
                  className="input"
                  placeholder="Add custom region"
                  list="regions"
                />
                <datalist id="regions">
                  {meta.regions.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
                <Button onClick={addCustomRegion} disabled={!customRegion.trim()}>
                  Add
                </Button>
              </div>
              <div className="mt-1 text-xs text-slate-500">Hold Ctrl/Cmd to select multiple regions.</div>
            </div>

            {error ? <div className="rounded-lg border border-rose-900 bg-rose-950/40 p-2 text-xs text-rose-200">{error}</div> : null}

            <Button onClick={recommend} disabled={busy}>
              {busy ? 'Computing…' : 'Suggest Window'}
            </Button>
          </div>
        </Card>

        <Card title="Recommendation">
          {result ? (
            <div className="space-y-2 text-sm text-slate-200">
              <div>
                <span className="text-slate-400">Region:</span> <span className="font-semibold">{result.recommendedRegion}</span>
              </div>
              <div>
                <span className="text-slate-400">Start time:</span>{' '}
                <span className="font-semibold">{new Date(result.recommendedStartTime).toLocaleString()}</span>
              </div>
              <div className="text-xs text-slate-400">{result.rationale}</div>
            </div>
          ) : (
            <div className="text-sm text-slate-400">Submit a workload to get a suggestion.</div>
          )}
        </Card>
      </div>
    </div>
  )
}
