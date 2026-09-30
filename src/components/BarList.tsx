import { useEffect, useState } from 'react'

export interface BarSeries {
  name: string
  color: string
  base?: number // nombre de répondants : sert aux pourcentages du survol
}

export interface BarRow {
  key: string
  label: string
  values: number[] // une valeur par série
}

interface BarListProps {
  rows: BarRow[]
  series: BarSeries[]
  sortByTotal?: boolean
  emptyMessage?: string
}

interface TooltipState {
  text: string
  x: number
  y: number
}

const BAR_FILL_MAX = 0.86 // laisse de la place à la valeur au bout de la barre
const TOOLTIP_EDGE = 96

function percentText(value: number, base: number | undefined): string {
  return base ? ` (${Math.round((value / base) * 100)} % de ${base})` : ''
}

export function BarList({ rows, series, sortByTotal = false, emptyMessage = 'Pas encore de réponses.' }: BarListProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  useEffect(() => {
    if (!tooltip) return
    const hide = () => setTooltip(null)
    window.addEventListener('scroll', hide, { passive: true })
    return () => window.removeEventListener('scroll', hide)
  }, [tooltip])

  const ordered = sortByTotal
    ? [...rows].sort((a, b) => b.values.reduce((s, v) => s + v, 0) - a.values.reduce((s, v) => s + v, 0))
    : rows
  const max = Math.max(1, ...rows.flatMap((r) => r.values))
  const total = rows.reduce((sum, r) => sum + r.values.reduce((s, v) => s + v, 0), 0)

  if (rows.length === 0 || total === 0) {
    return <p className="py-6 text-center text-sm text-muted">{emptyMessage}</p>
  }

  function showTooltip(target: HTMLElement, fraction: number, text: string) {
    const rect = target.getBoundingClientRect()
    const x = rect.left + rect.width * fraction
    setTooltip({
      text,
      x: Math.min(Math.max(x, TOOLTIP_EDGE), window.innerWidth - TOOLTIP_EDGE),
      y: rect.top - 6,
    })
  }

  return (
    <div>
      {series.length >= 2 && (
        <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
          {series.map((s) => (
            <li key={s.name} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ background: s.color }} aria-hidden />
              {s.name}
              {s.base !== undefined && <span className="text-muted">(n = {s.base})</span>}
            </li>
          ))}
        </ul>
      )}

      <ul>
        {ordered.map((row) => (
          <li key={row.key} className="grid grid-cols-[minmax(0,8.5rem)_1fr] items-center gap-x-3 py-1 sm:grid-cols-[minmax(0,14rem)_1fr]">
            <span className="text-sm leading-tight text-ink-2">{row.label}</span>
            <div className="flex flex-col gap-0.5">
              {series.map((s, index) => {
                const value = row.values[index] ?? 0
                const fraction = (value / max) * BAR_FILL_MAX
                const text = `${s.name} · ${row.label} : ${value}${percentText(value, s.base)}`
                return (
                  <div
                    key={s.name}
                    role="img"
                    aria-label={text}
                    tabIndex={0}
                    className="flex h-5 cursor-default items-center"
                    onMouseEnter={(e) => showTooltip(e.currentTarget, Math.max(fraction, 0.02), text)}
                    onMouseLeave={() => setTooltip(null)}
                    onFocus={(e) => showTooltip(e.currentTarget, Math.max(fraction, 0.02), text)}
                    onBlur={() => setTooltip(null)}
                    onClick={(e) => showTooltip(e.currentTarget, Math.max(fraction, 0.02), text)}
                  >
                    {value > 0 && (
                      <span
                        className="h-3.5 rounded-r-[4px]"
                        style={{ width: `${fraction * 100}%`, minWidth: 3, background: s.color }}
                        aria-hidden
                      />
                    )}
                    <span className="ml-2 text-xs tabular-nums text-ink-2" aria-hidden>
                      {value}
                    </span>
                  </div>
                )
              })}
            </div>
          </li>
        ))}
      </ul>

      <details className="mt-3 text-sm">
        <summary className="cursor-pointer text-muted">Voir en tableau</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line text-muted">
                <th className="py-1.5 pr-3 font-medium">Réponse</th>
                {series.map((s) => (
                  <th key={s.name} className="py-1.5 pr-3 font-medium">
                    {s.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ordered.map((row) => (
                <tr key={row.key} className="border-b border-line/60">
                  <td className="py-1.5 pr-3">{row.label}</td>
                  {series.map((s, index) => (
                    <td key={s.name} className="py-1.5 pr-3 tabular-nums">
                      {row.values[index] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>

      {tooltip && (
        <div
          role="tooltip"
          className="pointer-events-none fixed z-50 max-w-[calc(100vw-1rem)] -translate-x-1/2 -translate-y-full rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium text-bg shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  )
}
