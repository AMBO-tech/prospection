import { Flame, Snowflake, Sun } from 'lucide-react'
import { SEGMENT_LABEL, STATUSES, type ProspectStatus, type Segment } from '../lib/questionnaire'
import type { Level } from '../lib/scoring'

export const LEVEL_LABEL: Record<Level, string> = { hot: 'Chaud', warm: 'Tiède', cold: 'Froid' }

const LEVEL_STYLE: Record<Level, string> = {
  hot: 'bg-hot-bg text-hot',
  warm: 'bg-warm-bg text-warm',
  cold: 'bg-cold-bg text-cold',
}

const LEVEL_ICON = { hot: Flame, warm: Sun, cold: Snowflake } as const

export const SEGMENT_COLOR: Record<Segment, string> = {
  textile: 'var(--c-s1)',
  cosmetique: 'var(--c-s2)',
}

const PILL = 'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold'

// Icône + libellé : l'état ne repose jamais sur la couleur seule.
export function LevelBadge({ level }: { level: Level }) {
  const Icon = LEVEL_ICON[level]
  return (
    <span className={`${PILL} ${LEVEL_STYLE[level]}`}>
      <Icon className="size-3.5" aria-hidden />
      {LEVEL_LABEL[level]}
    </span>
  )
}

export function SegmentBadge({ segment }: { segment: Segment }) {
  return (
    <span className={`${PILL} bg-brand-soft text-ink`}>
      <span className="size-2 rounded-full" style={{ background: SEGMENT_COLOR[segment] }} aria-hidden />
      {SEGMENT_LABEL[segment]}
    </span>
  )
}

const STATUS_STYLE: Record<ProspectStatus, string> = {
  nouveau: 'bg-brand-soft text-ink',
  contacte: 'bg-cold-bg text-cold',
  demo: 'bg-warm-bg text-warm',
  gagne: 'bg-good-bg text-good',
  perdu: 'bg-hot-bg text-hot',
}

export function StatusBadge({ status }: { status: ProspectStatus }) {
  const label = STATUSES.find((s) => s.value === status)?.label ?? status
  return <span className={`${PILL} ${STATUS_STYLE[status]}`}>{label}</span>
}

export function ScoreBadge({ total }: { total: number }) {
  return (
    <span className={`${PILL} bg-brand-soft tabular-nums text-ink`} title="Score de qualification automatique">
      {total}/100
    </span>
  )
}
