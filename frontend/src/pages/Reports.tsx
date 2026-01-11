import { useEffect, useMemo, useState } from 'react'
import { api, authTokenStorage } from '../api'
import { AlertBanner } from '../components/AlertBanner'
import { Button } from '../components/Button'
import { Card } from '../components/Card'
import { BudgetProgress } from '../components/BudgetProgress'
import { useActiveBudget } from '../hooks/useActiveBudget'
import { useMeta } from '../hooks/useMeta'
import { pickGreenestModel, pickGreenestRegion } from '../lib/green'
import { useNavigate } from 'react-router-dom'

type ReportSummary = {
  totalTokens: number
  totalEnergyKwh: string
  totalCo2Grams: string
  totalWaterLiters: string
}

export default function Reports() {
  const navigate = useNavigate()
  const budget = useActiveBudget()
  const meta = useMeta()

  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const { data } = await api.get<ReportSummary>('/reports/summary')
        if (!active) return
        setSummary(data)
      } catch (e: any) {
        if (!active) return
        setError(e?.response?.data?.message ?? 'Failed to load report summary')
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const downloadUrl = useMemo(() => {
    const base = api.defaults.baseURL ?? 'http://localhost:8080/api'
    const token = authTokenStorage.get()
    // Backend uses Authorization header; browsers won't attach it to a plain link.
    // So we open it in a new tab via fetch+blob instead (see handler).
    return { base, token }
  }, [])

  const greenestModel = useMemo(() => pickGreenestModel(meta.models), [meta.models])
  const greenestRegion = useMemo(() => pickGreenestRegion(meta.intensitiesGPerKwh), [meta.intensitiesGPerKwh])

  const remaining = budget.status ? Number(budget.status.remainingCo2Grams) : null
  const totalCo2 = summary ? Number(summary.totalCo2Grams) : null

  async function downloadPdf() {
    setError(null)
    try {
      const resp = await fetch(`${downloadUrl.base}/reports/esg.pdf`, {
        headers: {
          Authorization: `Bearer ${downloadUrl.token}`
        }
      })
      if (!resp.ok) throw new Error('Failed')
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'ecopulse-esg-report.pdf'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError('PDF download failed')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Reports</h1>
        <p className="mt-1 text-sm text-slate-400">Generate ESG summaries and export PDF.</p>
      </div>

      {budget.isExceeded ? (
        <AlertBanner
          kind="danger"
          title="Budget exceeded"
          message={
            greenestModel
              ? `Suggestion for upcoming runs: ${greenestModel.id} in ${greenestRegion} with fewer tokens.`
              : 'Use greener model/region choices and fewer tokens in upcoming runs.'
          }
          actionLabel="Open Calculator"
          onAction={() => navigate('/calculator')}
        />
      ) : budget.isNearLimit ? (
        <AlertBanner
          kind="warning"
          title="Budget near limit"
          message="Consider enabling Green Mode and reducing tokens before your next run."
          actionLabel="Open Green Mode"
          onAction={() => navigate('/green-mode')}
        />
      ) : null}

      {error ? <div className="rounded-xl border border-rose-900 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</div> : null}

      {budget.status && budget.ratioUsed != null ? (
        <Card title="Budget snapshot">
          <div className="grid gap-3 md:grid-cols-4">
            <Metric label="Limit (g)" value={Number(budget.status.limitCo2Grams).toFixed(0)} />
            <Metric label="Used (g)" value={Number(budget.status.usedCo2Grams).toFixed(2)} />
            <Metric label="Remaining (g)" value={Number(budget.status.remainingCo2Grams).toFixed(2)} />
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <div className="text-xs text-slate-400">Progress</div>
              <div className="mt-2">
                <BudgetProgress usedRatio={budget.ratioUsed} />
              </div>
            </div>
          </div>
          {remaining != null && totalCo2 != null && remaining < 0 ? (
            <div className="mt-3 text-xs text-rose-200">You are currently over the active budget for this period.</div>
          ) : null}
        </Card>
      ) : null}

      <Card title="ESG Summary">
        <div className="grid gap-3 md:grid-cols-4">
          <Metric label="Total tokens" value={summary ? summary.totalTokens.toLocaleString() : '—'} />
          <Metric label="CO2 (g)" value={summary ? Number(summary.totalCo2Grams).toFixed(2) : '—'} />
          <Metric label="Energy (kWh)" value={summary ? Number(summary.totalEnergyKwh).toFixed(6) : '—'} />
          <Metric label="Water (L)" value={summary ? Number(summary.totalWaterLiters).toFixed(2) : '—'} />
        </div>
        {remaining != null && totalCo2 != null && remaining >= 0 && totalCo2 > remaining ? (
          <div className="mt-3 rounded-xl border border-amber-900 bg-amber-950/20 p-3 text-xs text-amber-200">
            Total CO2 in report exceeds remaining budget. This report is read-only, but consider greener settings for future runs.
          </div>
        ) : null}
        <div className="mt-4">
          <Button onClick={downloadPdf}>Download ESG PDF</Button>
        </div>
      </Card>

      <Card title="What’s inside">
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-300">
          <li>Period totals for energy, CO2 and water</li>
          <li>Recent emission logs table</li>
          <li>Notes for auditability and methodology</li>
        </ul>
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
