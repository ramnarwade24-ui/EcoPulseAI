import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'
import { AlertBanner } from '../components/AlertBanner'
import { BudgetProgress } from '../components/BudgetProgress'
import { Card } from '../components/Card'
import { GreenScoreGauge } from '../components/GreenScoreGauge'
import { useActiveBudget } from '../hooks/useActiveBudget'
import { useNavigate } from 'react-router-dom'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

type EmissionView = {
  id: string
  createdAt: string
  model: string
  region: string
  tokens: number
  co2Grams: string
  energyKwh: string
  waterLiters: string
  greenScore: number
}

type Summary = {
  totalTokens: number
  totalEnergyKwh: string
  totalCo2Grams: string
  totalWaterLiters: string
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [summary, setSummary] = useState<Summary | null>(null)
  const [history, setHistory] = useState<EmissionView[]>([])
  const [error, setError] = useState<string | null>(null)
  const budget = useActiveBudget()

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        setError(null)
        const [s, h] = await Promise.all([
          api.get<Summary>('/emissions/summary'),
          api.get('/emissions/history?size=50')
        ])
        if (!active) return
        setSummary(s.data)
        setHistory(h.data?.content ?? [])
      } catch (e: any) {
        if (!active) return
        setError(e?.response?.data?.message ?? 'Failed to load dashboard')
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const chartData = useMemo(() => {
    return [...history]
      .reverse()
      .map((x) => ({
        t: new Date(x.createdAt).toLocaleDateString(),
        co2: Number(x.co2Grams),
        energy: Number(x.energyKwh)
      }))
  }, [history])

  const latestScore = history.length ? history[0].greenScore : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">Real-time sustainability intelligence for AI usage.</p>
      </div>

      {budget.isExceeded ? (
        <AlertBanner
          kind="danger"
          title="Carbon budget exceeded"
          message="High-emission models should be avoided. Use Green Mode + pick the greenest region to stay within limits."
          actionLabel="Open Calculator"
          onAction={() => navigate('/calculator')}
        />
      ) : budget.isNearLimit ? (
        <AlertBanner
          kind="warning"
          title="Carbon budget near limit"
          message="EcoPulse will recommend greener models/regions and reduced tokens to prevent overage."
          actionLabel="Open Green Mode"
          onAction={() => navigate('/green-mode')}
        />
      ) : null}

      {error ? <div className="rounded-xl border border-rose-900 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card title="Total Tokens">
          <div className="text-2xl font-bold text-white">{summary ? summary.totalTokens.toLocaleString() : '—'}</div>
          <div className="mt-1 text-xs text-slate-400">Tracked across recent logs</div>
        </Card>
        <Card title="CO2 (g)">
          <div className="text-2xl font-bold text-white">{summary ? Number(summary.totalCo2Grams).toFixed(2) : '—'}</div>
          <div className="mt-1 text-xs text-slate-400">Estimated emissions</div>
        </Card>
        <Card title="Energy (kWh)">
          <div className="text-2xl font-bold text-white">{summary ? Number(summary.totalEnergyKwh).toFixed(4) : '—'}</div>
          <div className="mt-1 text-xs text-slate-400">Compute energy estimate</div>
        </Card>
        <Card title="Water (L)">
          <div className="text-2xl font-bold text-white">{summary ? Number(summary.totalWaterLiters).toFixed(2) : '—'}</div>
          <div className="mt-1 text-xs text-slate-400">Cooling + supply estimate</div>
        </Card>
        <Card title="Budget & Score">
          <div className="space-y-3">
            {budget.status && budget.ratioUsed != null ? (
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Monthly budget</span>
                  <span>{Number(budget.status.remainingCo2Grams).toFixed(0)} g remaining</span>
                </div>
                <div className="mt-2">
                  <BudgetProgress usedRatio={budget.ratioUsed} />
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400">No active budget set.</div>
            )}
            <GreenScoreGauge score={latestScore} />
          </div>
        </Card>
      </div>

      <Card title="CO2 trend (recent)">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: 4, right: 10, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="co2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#34d399" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#34d399" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1f2937" strokeDasharray="4 4" />
              <XAxis dataKey="t" stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#0b1220', border: '1px solid #1f2937', borderRadius: 12 }}
                labelStyle={{ color: '#e2e8f0' }}
              />
              <Area type="monotone" dataKey="co2" stroke="#34d399" fill="url(#co2)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card title="Recent activity">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-400">
              <tr>
                <th className="py-2">Time</th>
                <th>Model</th>
                <th>Region</th>
                <th>Tokens</th>
                <th>CO2 (g)</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {history.slice(0, 10).map((row) => (
                <tr key={row.id} className="border-t border-slate-800 text-slate-200">
                  <td className="py-2">{new Date(row.createdAt).toLocaleString()}</td>
                  <td>{row.model}</td>
                  <td>{row.region}</td>
                  <td>{row.tokens.toLocaleString()}</td>
                  <td>{Number(row.co2Grams).toFixed(2)}</td>
                  <td>{row.greenScore}</td>
                </tr>
              ))}
              {history.length === 0 ? (
                <tr className="border-t border-slate-800">
                  <td className="py-3 text-slate-400" colSpan={6}>
                    No emission logs yet. Use the Calculator to record a run.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
