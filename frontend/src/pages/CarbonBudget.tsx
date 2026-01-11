import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { AlertBanner } from '../components/AlertBanner'
import { BudgetProgress } from '../components/BudgetProgress'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { useActiveBudget } from '../hooks/useActiveBudget'
import { useMeta } from '../hooks/useMeta'
import { pickGreenestModel, pickGreenestRegion } from '../lib/green'
import { useNavigate } from 'react-router-dom'

type BudgetView = {
  id: string
  periodStart: string
  periodEnd: string
  co2GramsLimit: string
}

type BudgetStatus = {
  id: string
  periodStart: string
  periodEnd: string
  limitCo2Grams: string
  usedCo2Grams: string
  remainingCo2Grams: string
}

export default function CarbonBudget() {
  const navigate = useNavigate()
  const meta = useMeta()
  const active = useActiveBudget()

  const [budgets, setBudgets] = useState<BudgetView[]>([])
  const [selected, setSelected] = useState<BudgetStatus | null>(null)

  const [periodStart, setPeriodStart] = useState(new Date(Date.now() - 7 * 86400000).toISOString())
  const [periodEnd, setPeriodEnd] = useState(new Date(Date.now() + 7 * 86400000).toISOString())
  const [limit, setLimit] = useState(5000)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    const { data } = await api.get<BudgetView[]>('/budget')
    setBudgets(data)
  }

  useEffect(() => {
    refresh().catch(() => {})
  }, [])

  async function createBudget() {
    setBusy(true)
    setError(null)
    try {
      await api.post('/budget', {
        periodStart,
        periodEnd,
        co2GramsLimit: limit
      })
      await refresh()
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to create budget')
    } finally {
      setBusy(false)
    }
  }

  async function loadStatus(id: string) {
    setSelected(null)
    const { data } = await api.get<BudgetStatus>(`/budget/${id}/status`)
    setSelected(data)
  }

  const greenestModel = useMemo(() => pickGreenestModel(meta.models), [meta.models])
  const greenestRegion = useMemo(() => pickGreenestRegion(meta.intensitiesGPerKwh), [meta.intensitiesGPerKwh])

  const selectedRatioUsed = useMemo(() => {
    if (!selected) return null
    const limit = Number(selected.limitCo2Grams)
    const used = Number(selected.usedCo2Grams)
    if (!isFinite(limit) || limit <= 0) return null
    return Math.max(0, Math.min(2, used / limit))
  }, [selected])

  const selectedRemaining = selected ? Number(selected.remainingCo2Grams) : null
  const selectedIsExceeded = selectedRemaining != null ? selectedRemaining < 0 : false
  const selectedIsNearLimit = !selectedIsExceeded && selectedRatioUsed != null ? selectedRatioUsed >= 0.9 : false

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Carbon Budget</h1>
        <p className="mt-1 text-sm text-slate-400">Set CO2 limits and track usage against your budget.</p>
      </div>

      {active.isExceeded ? (
        <AlertBanner
          kind="danger"
          title="Budget exceeded"
          message={
            greenestModel
              ? `Suggested to recover: ${greenestModel.id} in ${greenestRegion} with reduced tokens.`
              : 'Switch to the greenest model/region and reduce tokens to recover.'
          }
          actionLabel="Open Calculator"
          onAction={() => navigate('/calculator')}
        />
      ) : active.isNearLimit ? (
        <AlertBanner
          kind="warning"
          title="Budget near limit"
          message={
            greenestModel
              ? `Suggestion: ${greenestModel.id} + ${greenestRegion} + fewer tokens.`
              : 'Consider enabling Green Mode and reducing tokens.'
          }
          actionLabel="Open Green Mode"
          onAction={() => navigate('/green-mode')}
        />
      ) : null}

      {active.status && active.ratioUsed != null ? (
        <Card title="Active budget overview">
          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="Limit" value={`${Number(active.status.limitCo2Grams).toFixed(0)} g`} />
            <Metric label="Used" value={`${Number(active.status.usedCo2Grams).toFixed(2)} g`} />
            <Metric label="Remaining" value={`${Number(active.status.remainingCo2Grams).toFixed(2)} g`} />
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <div className="text-xs text-slate-400">Progress</div>
              <div className="mt-2">
                <BudgetProgress usedRatio={active.ratioUsed} />
              </div>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => navigate('/calculator')}
                  className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-800"
                >
                  Calculator
                </button>
                <button
                  onClick={() => navigate('/green-mode')}
                  className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-800"
                >
                  Green Mode
                </button>
              </div>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Create budget">
          <div className="grid gap-3">
            <div>
              <label className="text-xs text-slate-300">Period start (ISO)</label>
              <input value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="input" />
            </div>
            <div>
              <label className="text-xs text-slate-300">Period end (ISO)</label>
              <input value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="input" />
            </div>
            <div>
              <label className="text-xs text-slate-300">CO2 limit (grams)</label>
              <input type="number" min={0} value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="input" />
            </div>

            {error ? <div className="rounded-lg border border-rose-900 bg-rose-950/40 p-2 text-xs text-rose-200">{error}</div> : null}

            <Button onClick={createBudget} disabled={busy}>
              {busy ? 'Saving…' : 'Create'}
            </Button>
          </div>
        </Card>

        <Card title="Budgets">
          <div className="space-y-2">
            {budgets.map((b) => (
              <button
                key={b.id}
                onClick={() => loadStatus(b.id)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3 text-left text-sm hover:bg-slate-900"
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-slate-200">{Number(b.co2GramsLimit).toFixed(0)} g CO2</div>
                  <div className="text-xs text-slate-500">{b.id.slice(0, 8)}</div>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  {new Date(b.periodStart).toLocaleString()} → {new Date(b.periodEnd).toLocaleString()}
                </div>
              </button>
            ))}
            {budgets.length === 0 ? <div className="text-sm text-slate-400">No budgets yet.</div> : null}
          </div>
        </Card>
      </div>

      <Card title="Selected budget status">
        {selected ? (
          <div className="space-y-4">
            {selectedIsExceeded ? (
              <AlertBanner
                kind="danger"
                title="Selected budget is exceeded"
                message="Use the Calculator / Green Mode to reduce emissions in the next runs."
                actionLabel="Open Calculator"
                onAction={() => navigate('/calculator')}
              />
            ) : selectedIsNearLimit ? (
              <AlertBanner
                kind="warning"
                title="Selected budget is near limit"
                message="Consider greener model/region choices and reducing tokens."
                actionLabel="Open Green Mode"
                onAction={() => navigate('/green-mode')}
              />
            ) : null}

            <div className="grid gap-3 md:grid-cols-4">
              <Metric label="Limit" value={`${Number(selected.limitCo2Grams).toFixed(0)} g`} />
              <Metric label="Used" value={`${Number(selected.usedCo2Grams).toFixed(2)} g`} />
              <Metric label="Remaining" value={`${Number(selected.remainingCo2Grams).toFixed(2)} g`} />
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div className="text-xs text-slate-400">Progress</div>
                <div className="mt-2">
                  {selectedRatioUsed != null ? <BudgetProgress usedRatio={selectedRatioUsed} /> : <div className="text-sm text-slate-400">—</div>}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-400">Select a budget to view status.</div>
        )}
      </Card>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-semibold text-white">{value}</div>
    </div>
  )
}
