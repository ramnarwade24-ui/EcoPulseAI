export function GreenScoreGauge({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score))
  const r = 38
  const c = 2 * Math.PI * r
  const dash = (clamped / 100) * c

  const color = clamped >= 80 ? '#34d399' : clamped >= 50 ? '#fbbf24' : '#fb7185'

  return (
    <div className="flex items-center gap-3">
      <svg width="92" height="92" viewBox="0 0 92 92">
        <circle cx="46" cy="46" r={r} stroke="#1f2937" strokeWidth="10" fill="none" />
        <circle
          cx="46"
          cy="46"
          r={r}
          stroke={color}
          strokeWidth="10"
          fill="none"
          strokeDasharray={`${dash} ${c - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 46 46)"
        />
        <text x="46" y="52" textAnchor="middle" fontSize="18" fill="#e2e8f0" fontWeight="700">
          {clamped}
        </text>
      </svg>
      <div>
        <div className="text-sm font-semibold text-slate-200">Green score</div>
        <div className="text-xs text-slate-400">0–100 (higher is better)</div>
      </div>
    </div>
  )
}
