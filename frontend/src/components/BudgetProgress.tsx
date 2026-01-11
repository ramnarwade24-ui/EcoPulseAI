export function BudgetProgress({ usedRatio }: { usedRatio: number }) {
  const pct = Math.max(0, Math.min(200, usedRatio * 100))
  const color = pct >= 100 ? 'bg-rose-500' : pct >= 90 ? 'bg-amber-400' : 'bg-emerald-400'

  return (
    <div>
      <div className="h-3 w-full overflow-hidden rounded-full border border-slate-800 bg-slate-950">
        <div className={`h-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <div className="mt-1 text-xs text-slate-400">{pct.toFixed(0)}% used</div>
    </div>
  )
}
