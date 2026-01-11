import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BudgetProgress } from './BudgetProgress'
import { useActiveBudget } from '../hooks/useActiveBudget'
import { useMeta } from '../hooks/useMeta'
import { pickGreenestModel, pickGreenestRegion } from '../lib/green'

export function StickyBudgetBanner() {
  const navigate = useNavigate()
  const budget = useActiveBudget()
  const meta = useMeta()

  const remaining = budget.status ? Number(budget.status.remainingCo2Grams) : null
  const limit = budget.status ? Number(budget.status.limitCo2Grams) : null

  const greenestModel = useMemo(() => pickGreenestModel(meta.models), [meta.models])
  const greenestRegion = useMemo(() => pickGreenestRegion(meta.intensitiesGPerKwh), [meta.intensitiesGPerKwh])

  if (budget.loading || !budget.status || budget.ratioUsed == null || remaining == null || limit == null) return null

  const tone = budget.isExceeded ? 'border-rose-900 bg-rose-950/40' : budget.isNearLimit ? 'border-amber-900 bg-amber-950/30' : 'border-slate-800 bg-slate-950/60'
  const textTone = budget.isExceeded ? 'text-rose-200' : budget.isNearLimit ? 'text-amber-200' : 'text-slate-200'

  return (
    <div className="sticky top-[56px] z-10">
      <div className={"border-b backdrop-blur " + tone}>
        <div className="mx-auto max-w-6xl px-4 py-2">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className={"text-sm " + textTone}>
              <span className="font-semibold">Budget</span>: {Math.max(0, remaining).toFixed(0)} g remaining of {limit.toFixed(0)} g
              {budget.isExceeded ? <span className="ml-2 font-semibold">(exceeded)</span> : null}
            </div>
            <div className="flex items-center gap-3">
              <div className="w-48 md:w-64">
                <BudgetProgress usedRatio={budget.ratioUsed} />
              </div>
              {budget.isNearLimit || budget.isExceeded ? (
                <button
                  onClick={() => navigate('/calculator')}
                  className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-800"
                  title={
                    greenestModel
                      ? `Suggested: ${greenestModel.id} + ${greenestRegion} + ≤5k tokens`
                      : 'Open Calculator'
                  }
                >
                  Optimize
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
