import type { ReactNode } from 'react'

export function Tooltip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center" title={text}>
      {children}
    </span>
  )
}

export function InfoDot({ text }: { text: string }) {
  return (
    <Tooltip text={text}>
      <span className="ml-2 inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-[10px] font-semibold text-slate-200">
        i
      </span>
    </Tooltip>
  )
}
