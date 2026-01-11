export function AlertBanner({
  kind,
  title,
  message,
  actionLabel,
  onAction
}: {
  kind: 'info' | 'warning' | 'danger'
  title: string
  message: string
  actionLabel?: string
  onAction?: () => void
}) {
  const styles =
    kind === 'danger'
      ? 'border-rose-900 bg-rose-950/40 text-rose-100'
      : kind === 'warning'
        ? 'border-amber-900 bg-amber-950/30 text-amber-100'
        : 'border-slate-800 bg-slate-900/40 text-slate-100'

  return (
    <div className={`rounded-2xl border p-4 ${styles}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <div className="mt-1 text-sm opacity-90">{message}</div>
        </div>
        {actionLabel && onAction ? (
          <button
            onClick={onAction}
            className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm hover:bg-slate-900"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  )
}
