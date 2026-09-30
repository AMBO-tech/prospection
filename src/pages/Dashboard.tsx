import { Download, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { SEGMENT_COLOR } from '../components/Badges'
import { BarList, type BarRow, type BarSeries } from '../components/BarList'
import { ChartCard, StatTile } from '../components/ChartCard'
import { useData } from '../context/DataContext'
import { PRICE_BUCKETS, bucketPrices, distribution, median, perDay } from '../lib/analytics'
import { downloadCsv } from '../lib/csv'
import { fcfa } from '../lib/format'
import {
  SECTIONS,
  SEGMENT_LABEL,
  STATUSES,
  questionById,
  questionSegment,
  type Segment,
} from '../lib/questionnaire'
import { prospectLevel } from '../lib/scoring'
import type { Prospect } from '../lib/types'

type Filter = Segment | 'all'

const SEGMENTS: Segment[] = ['textile', 'cosmetique']
const NEUTRAL_COLOR = 'var(--c-s0)'
const RECENT_DAYS = 7
const DEFAULT_EXPLORER_QUESTION = 'stock_gap'

const FILTER_OPTIONS: ReadonlyArray<{ value: Filter; label: string }> = [
  { value: 'all', label: 'Tous' },
  { value: 'textile', label: SEGMENT_LABEL.textile },
  { value: 'cosmetique', label: SEGMENT_LABEL.cosmetique },
]

const numbersFrom = (prospects: Prospect[], id: string): number[] =>
  prospects.flatMap((p) => (typeof p.answers[id] === 'number' ? [p.answers[id] as number] : []))

const segmentSeries = (segment: Segment, base: number): BarSeries => ({
  name: SEGMENT_LABEL[segment],
  color: SEGMENT_COLOR[segment],
  base,
})

function countBy(prospects: Prospect[], key: (p: Prospect) => string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const p of prospects) counts.set(key(p), (counts.get(key(p)) ?? 0) + 1)
  return counts
}

function QuestionChart({ questionId, prospects, filter, sortByTotal }: {
  questionId: string
  prospects: Prospect[]
  filter: Filter
  sortByTotal?: boolean
}) {
  const question = questionById(questionId)
  if (!question) return null
  const owner = questionSegment(questionId)
  const segments = (filter === 'all' ? SEGMENTS : [filter]).filter((s) => !owner || s === owner)

  const body =
    segments.length === 0 ? (
      <p className="py-6 text-center text-sm text-muted">Question réservée au segment {owner ? SEGMENT_LABEL[owner] : ''}.</p>
    ) : (
      (() => {
        const dists = segments.map((s) =>
          distribution(
            prospects.filter((p) => p.segment === s),
            questionId,
          ),
        )
        const rows: BarRow[] = (dists[0]?.rows ?? []).map((row, i) => ({
          key: row.value,
          label: row.label,
          values: dists.map((d) => d.rows[i]?.count ?? 0),
        }))
        return (
          <BarList
            rows={rows}
            series={segments.map((s, i) => segmentSeries(s, dists[i].base))}
            sortByTotal={sortByTotal}
          />
        )
      })()
    )

  return (
    <ChartCard title={question.label} subtitle={question.type === 'multi' ? 'Plusieurs réponses possibles' : undefined}>
      {body}
    </ChartCard>
  )
}

function BudgetChart({ prospects, filter }: { prospects: Prospect[]; filter: Filter }) {
  const segments = filter === 'all' ? SEGMENTS : [filter]
  const prices = segments.map((s) =>
    numbersFrom(
      prospects.filter((p) => p.segment === s),
      'price_ok',
    ),
  )
  const counts = prices.map(bucketPrices)
  const rows: BarRow[] = PRICE_BUCKETS.map((bucket, i) => ({
    key: bucket.label,
    label: bucket.label,
    values: counts.map((c) => c[i]),
  }))
  const medians = segments
    .map((s, i) => {
      const m = median(prices[i])
      return m === null ? null : `${SEGMENT_LABEL[s]} ${fcfa(m)}`
    })
    .filter(Boolean)

  return (
    <ChartCard
      title="Budget mensuel jugé correct (FCFA)"
      subtitle={medians.length > 0 ? `Médiane : ${medians.join(' · ')}` : undefined}
    >
      <BarList rows={rows} series={segments.map((s, i) => segmentSeries(s, prices[i].length))} />
    </ChartCard>
  )
}

function ActivityCharts({ prospects }: { prospects: Prospect[] }) {
  const days = perDay(prospects, RECENT_DAYS)
  const interviewers = [...countBy(prospects, (p) => p.interviewer ?? 'Non renseigné')].sort((a, b) => b[1] - a[1])
  const statuses = countBy(prospects, (p) => p.status)
  const neutral = (name: string): BarSeries[] => [{ name, color: NEUTRAL_COLOR }]

  return (
    <>
      <ChartCard title={`Fiches par jour (${RECENT_DAYS} derniers jours)`}>
        <BarList rows={days.map((d) => ({ key: d.key, label: d.label, values: [d.count] }))} series={neutral('Fiches')} />
      </ChartCard>
      <ChartCard title="Fiches par enquêteur">
        <BarList rows={interviewers.map(([name, n]) => ({ key: name, label: name, values: [n] }))} series={neutral('Fiches')} />
      </ChartCard>
      <ChartCard title="Avancement du suivi">
        <BarList
          rows={STATUSES.map((s) => ({ key: s.value, label: s.label, values: [statuses.get(s.value) ?? 0] }))}
          series={neutral('Fiches')}
        />
      </ChartCard>
    </>
  )
}

export function Dashboard() {
  const { prospects, loading, error, reload } = useData()
  const [filter, setFilter] = useState<Filter>('all')
  const [explorerId, setExplorerId] = useState(DEFAULT_EXPLORER_QUESTION)

  const data = useMemo(
    () => (filter === 'all' ? prospects : prospects.filter((p) => p.segment === filter)),
    [prospects, filter],
  )

  if (loading && prospects.length === 0) {
    return (
      <p className="flex items-center justify-center gap-2 py-16 text-muted" role="status">
        <Loader2 className="size-5 animate-spin" aria-hidden /> Chargement…
      </p>
    )
  }

  if (error && prospects.length === 0) {
    return (
      <div role="alert" className="mx-auto max-w-md rounded-xl bg-hot-bg p-4 text-hot">
        <p className="font-semibold">{error.message}</p>
        <button type="button" onClick={() => void reload()} className="mt-1 font-semibold underline">
          Réessayer
        </button>
      </div>
    )
  }

  if (prospects.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg font-semibold">Pas encore de données</p>
        <Link to="/" className="mt-2 inline-block font-semibold text-brand underline">
          Remplir la première fiche
        </Link>
      </div>
    )
  }

  const hot = data.filter((p) => prospectLevel(p.answers) === 'hot').length
  const today = perDay(data, 1)[0]?.count ?? 0
  const budgetMedian = median(numbersFrom(data, 'price_ok'))
  const durations = numbersFrom(data, 'duration_s')
  const meanMinutes = durations.length ? durations.reduce((s, v) => s + v, 0) / durations.length / 60 : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <div className="flex items-center gap-2">
          <div role="group" aria-label="Segment" className="flex gap-2">
            {FILTER_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                aria-pressed={filter === o.value}
                onClick={() => setFilter(o.value)}
                className={`h-9 rounded-full border px-3.5 text-sm font-semibold ${
                  filter === o.value ? 'border-brand bg-brand text-brand-ink' : 'border-line bg-surface text-ink-2'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => downloadCsv(data, `prospects-${new Date().toISOString().slice(0, 10)}.csv`)}
            className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm font-semibold"
          >
            <Download className="size-4" aria-hidden /> CSV
          </button>
        </div>
      </div>

      <section aria-label="Chiffres clés" className="grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div className="rounded-2xl bg-brand p-5 text-brand-ink sm:row-span-2">
          <p className="text-sm font-medium opacity-80">Fiches collectées</p>
          <p className="mt-2 text-6xl font-semibold leading-none">{data.length}</p>
        </div>
        <StatTile label="Prospects chauds" value={String(hot)} hint={data.length ? `${Math.round((hot / data.length) * 100)} % des fiches` : undefined} />
        <StatTile label="Aujourd’hui" value={String(today)} />
        <StatTile label="Budget médian" value={budgetMedian === null ? '—' : fcfa(budgetMedian)} hint="par mois, jugé correct" />
        <StatTile label="Durée moyenne" value={meanMinutes === null ? '—' : `${meanMinutes.toFixed(1)} min`} hint="objectif 10 à 15 min" />
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <BudgetChart prospects={data} filter={filter} />
        </div>
        <QuestionChart questionId="time_lost" prospects={data} filter={filter} sortByTotal />
        <QuestionChart questionId="tools" prospects={data} filter={filter} sortByTotal />
        <QuestionChart questionId="stock_loss" prospects={data} filter={filter} />
        <QuestionChart questionId="payment_model" prospects={data} filter={filter} />

        <section className="space-y-3 md:col-span-2">
          <div>
            <label htmlFor="explorer" className="text-sm font-semibold">
              Explorer une question
            </label>
            <select
              id="explorer"
              value={explorerId}
              onChange={(e) => setExplorerId(e.target.value)}
              className="mt-1.5 h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm"
            >
              {SECTIONS.map((section) => {
                const choices = section.questions.filter((q) => q.options && q.id !== 'segment')
                return choices.length === 0 ? null : (
                  <optgroup key={section.id} label={section.title}>
                    {choices.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.label}
                      </option>
                    ))}
                  </optgroup>
                )
              })}
            </select>
          </div>
          <QuestionChart questionId={explorerId} prospects={data} filter={filter} sortByTotal={questionById(explorerId)?.type === 'multi'} />
        </section>

        <ActivityCharts prospects={data} />
      </div>
    </div>
  )
}
