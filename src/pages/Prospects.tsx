import { CloudUpload, Download, Loader2, MessageCircle, Phone, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { LevelBadge, LEVEL_LABEL, ScoreBadge, SegmentBadge, StatusBadge } from '../components/Badges'
import { useData } from '../context/DataContext'
import { useSync } from '../context/SyncContext'
import { downloadCsv } from '../lib/csv'
import { formatDateTime, telLink, waLink } from '../lib/format'
import { SEGMENT_LABEL, STATUSES, type ProspectStatus, type Segment } from '../lib/questionnaire'
import { prospectLevel, scoreProspect, type Level } from '../lib/scoring'
import type { Prospect } from '../lib/types'

type SortKey = 'recent' | 'score'

interface Row {
  prospect: Prospect
  level: Level
  score: number
}

const CHIP = 'h-9 shrink-0 rounded-full border px-3.5 text-sm font-semibold'

function Chips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: ReadonlyArray<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-2 overflow-x-auto pb-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className={`${CHIP} ${o.value === value ? 'border-brand bg-brand text-brand-ink' : 'border-line bg-surface text-ink-2'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

const SEGMENT_OPTIONS: ReadonlyArray<{ value: Segment | 'all'; label: string }> = [
  { value: 'all', label: 'Tous' },
  { value: 'textile', label: SEGMENT_LABEL.textile },
  { value: 'cosmetique', label: SEGMENT_LABEL.cosmetique },
]

const LEVEL_OPTIONS: ReadonlyArray<{ value: Level | 'all'; label: string }> = [
  { value: 'all', label: 'Toutes' },
  { value: 'hot', label: LEVEL_LABEL.hot },
  { value: 'warm', label: LEVEL_LABEL.warm },
  { value: 'cold', label: LEVEL_LABEL.cold },
]

export function Prospects() {
  const { prospects, loading, error, reload } = useData()
  const { queue } = useSync()
  const [search, setSearch] = useState('')
  const [segment, setSegment] = useState<Segment | 'all'>('all')
  const [level, setLevel] = useState<Level | 'all'>('all')
  const [status, setStatus] = useState<ProspectStatus | 'all'>('all')
  const [sort, setSort] = useState<SortKey>('recent')

  const rows = useMemo<Row[]>(
    () => prospects.map((p) => ({ prospect: p, level: prospectLevel(p.answers), score: scoreProspect(p.answers).total })),
    [prospects],
  )

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const filtered = rows.filter(({ prospect: p, level: l }) => {
      if (segment !== 'all' && p.segment !== segment) return false
      if (level !== 'all' && l !== level) return false
      if (status !== 'all' && p.status !== status) return false
      if (!needle) return true
      return [p.shop_name, p.contact_name, p.phone, p.location].some((field) => field?.toLowerCase().includes(needle))
    })
    return sort === 'score'
      ? [...filtered].sort((a, b) => b.score - a.score)
      : [...filtered].sort((a, b) => b.prospect.created_at.localeCompare(a.prospect.created_at))
  }, [rows, search, segment, level, status, sort])

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-end justify-between gap-3">
        <h2 className="text-2xl font-bold">Fiches prospects</h2>
        <button
          type="button"
          disabled={visible.length === 0}
          onClick={() =>
            downloadCsv(
              visible.map((r) => r.prospect),
              `prospects-${new Date().toISOString().slice(0, 10)}.csv`,
            )
          }
          className="flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-semibold disabled:opacity-50"
        >
          <Download className="size-4" aria-hidden /> CSV ({visible.length})
        </button>
      </div>

      {queue.length > 0 && (
        <div className="rounded-xl bg-warm-bg p-3 text-sm text-warm" role="status">
          <p className="flex items-center gap-2 font-semibold">
            <CloudUpload className="size-4" aria-hidden /> {queue.length} fiche(s) pas encore envoyée(s)
          </p>
          <p className="mt-1">{queue.map((i) => String(i.answers.shop_name ?? 'Sans nom')).join(', ')}</p>
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Boutique, contact, téléphone, marché…"
          aria-label="Rechercher une fiche"
          className="h-12 w-full rounded-xl border border-line bg-surface pl-11 pr-3 text-base"
        />
      </div>

      <Chips label="Filtrer par segment" options={SEGMENT_OPTIONS} value={segment} onChange={setSegment} />
      <Chips label="Filtrer par température" options={LEVEL_OPTIONS} value={level} onChange={setLevel} />

      <div className="flex gap-2">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ProspectStatus | 'all')}
          aria-label="Filtrer par statut"
          className="h-11 flex-1 rounded-xl border border-line bg-surface px-3 text-sm"
        >
          <option value="all">Tous les statuts</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Trier"
          className="h-11 flex-1 rounded-xl border border-line bg-surface px-3 text-sm"
        >
          <option value="recent">Plus récentes</option>
          <option value="score">Meilleur score</option>
        </select>
      </div>

      {loading && prospects.length === 0 && (
        <p className="flex items-center justify-center gap-2 py-10 text-muted" role="status">
          <Loader2 className="size-5 animate-spin" aria-hidden /> Chargement…
        </p>
      )}

      {error && (
        <div role="alert" className="rounded-xl bg-hot-bg p-3 text-sm text-hot">
          <p className="font-semibold">{error.message}</p>
          <button type="button" onClick={() => void reload()} className="mt-1 font-semibold underline">
            Réessayer
          </button>
        </div>
      )}

      {!loading && !error && visible.length === 0 && (
        <p className="py-10 text-center text-muted">
          {prospects.length === 0 ? 'Aucune fiche pour le moment.' : 'Aucune fiche ne correspond aux filtres.'}
        </p>
      )}

      <ul className="space-y-3">
        {visible.map(({ prospect: p, level: l, score }) => {
          const wa = waLink(p.phone)
          const tel = telLink(p.phone)
          return (
            <li key={p.id} className="rounded-2xl border border-line bg-surface p-4">
              <Link to={`/fiches/${p.id}`} className="block">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-[17px] font-semibold leading-snug">{p.shop_name}</h3>
                  <LevelBadge level={l} />
                </div>
                <p className="mt-0.5 text-sm text-muted">
                  {[p.contact_name, p.location, p.phone].filter(Boolean).join(' · ') || 'Aucun contact renseigné'}
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <SegmentBadge segment={p.segment} />
                  <StatusBadge status={p.status} />
                  <ScoreBadge total={score} />
                  <span className="text-xs text-muted">{formatDateTime(p.created_at)}</span>
                </div>
              </Link>
              {(wa || tel) && (
                <div className="mt-3 flex gap-2">
                  {wa && (
                    <a
                      href={wa}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-good-bg text-sm font-semibold text-good"
                    >
                      <MessageCircle className="size-4" aria-hidden /> WhatsApp
                    </a>
                  )}
                  {tel && (
                    <a
                      href={tel}
                      className="flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-brand-soft text-sm font-semibold"
                    >
                      <Phone className="size-4" aria-hidden /> Appeler
                    </a>
                  )}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
