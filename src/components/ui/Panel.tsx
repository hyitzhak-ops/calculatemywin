import type { ReactNode } from 'react'

interface PanelProps {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}

export function Panel({ title, subtitle, action, children }: PanelProps) {
  return (
    <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/60 overflow-hidden">
      <div className="flex items-center justify-between gap-4 px-4 py-3 border-b border-zinc-800/80">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}
