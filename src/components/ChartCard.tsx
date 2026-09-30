import type { ReactNode } from 'react'

interface ChartCardProps {
  title: string
  subtitle?: string
  children: ReactNode
}

export function ChartCard({ title, subtitle, children }: ChartCardProps) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h3 className="text-[15px] font-semibold leading-tight">{title}</h3>
      {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </section>
  )
}

interface StatTileProps {
  label: string
  value: string
  hint?: string
}

export function StatTile({ label, value, hint }: StatTileProps) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold leading-none">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  )
}
