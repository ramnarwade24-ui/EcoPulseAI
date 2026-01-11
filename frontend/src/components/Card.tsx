import type { PropsWithChildren } from 'react'

export function Card({ title, children }: PropsWithChildren<{ title?: string }>) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 shadow-sm">
      {title ? <div className="mb-3 text-sm font-semibold text-slate-200">{title}</div> : null}
      {children}
    </div>
  )
}
