import { useEffect, useMemo, useState } from 'react'
import { api } from '../api'

export type BudgetView = {
  id: string
  periodStart: string
  periodEnd: string
  co2GramsLimit: string
}

export type BudgetStatus = {
  id: string
  periodStart: string
  periodEnd: string
  limitCo2Grams: string
  usedCo2Grams: string
  remainingCo2Grams: string
}

type State = {
  activeBudget: BudgetView | null
  status: BudgetStatus | null
  loading: boolean
  error: string | null
  refresh(): Promise<void>
  ratioUsed: number | null
  isNearLimit: boolean
  isExceeded: boolean
}

function nowIso() {
  return new Date().toISOString()
}

export function useActiveBudget(): State {
  const [activeBudget, setActiveBudget] = useState<BudgetView | null>(null)
  const [status, setStatus] = useState<BudgetStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    setError(null)
    try {
      const { data: budgets } = await api.get<BudgetView[]>('/budget')
      const now = new Date(nowIso()).getTime()
      const active = budgets.find((b) => {
        const start = new Date(b.periodStart).getTime()
        const end = new Date(b.periodEnd).getTime()
        return start <= now && now <= end
      })
      const picked = active ?? (budgets.length ? budgets[0] : null)
      setActiveBudget(picked)
      if (picked) {
        const { data: st } = await api.get<BudgetStatus>(`/budget/${picked.id}/status`)
        setStatus(st)
      } else {
        setStatus(null)
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to load budgets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const ratioUsed = useMemo(() => {
    if (!status) return null
    const limit = Number(status.limitCo2Grams)
    const used = Number(status.usedCo2Grams)
    if (!isFinite(limit) || limit <= 0) return null
    return Math.max(0, Math.min(2, used / limit))
  }, [status])

  const isExceeded = (status ? Number(status.remainingCo2Grams) < 0 : false)
  const isNearLimit = !isExceeded && ratioUsed != null ? ratioUsed >= 0.9 : false

  return {
    activeBudget,
    status,
    loading,
    error,
    refresh,
    ratioUsed,
    isNearLimit,
    isExceeded
  }
}
