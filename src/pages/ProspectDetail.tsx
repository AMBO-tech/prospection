import { Archive, ArrowLeft, Check, Loader2, MessageCircle, Phone, Printer } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { LevelBadge, ScoreBadge, SegmentBadge, StatusBadge } from '../components/Badges'
import { QuestionField } from '../components/QuestionField'
import { useData } from '../context/DataContext'
import { formatDateTime, formatDuration, telLink, waLink } from '../lib/format'
import {
  STATUSES,
  formatAnswer,
  isEmpty,
  questionById,
  sectionsFor,
  type AnswerValue,
  type Answers,
  type ProspectStatus,
  type Question,
} from '../lib/questionnaire'
import { SCORE_MAX, prospectLevel, scoreProspect } from '../lib/scoring'
import type { Prospect } from '../lib/types'

const FOLLOWUP_NOTES: Question = {
  id: 'followup_notes',
  label: 'Notes de suivi',
  type: 'textarea',
  hint: 'Appels, rendez-vous, objections…',
}

// Champs modifiables après la visite (la base n'accepte que cette liste blanche).
const FOLLOWUP_FIELDS: Question[] = [
  questionById('next_step')!,
  questionById('temperature')!,
  questionById('followup_date')!,
  FOLLOWUP_NOTES,
]

// Déjà affichés dans l'en-tête ou dans le bloc de suivi.
const HIDDEN_ANSWER_IDS = new Set([
  'shop_name',
  'contact_name',
  'phone',
  'location',
  'interviewer',
  'segment',
  'next_step',
  'temperature',
  'followup_date',
  'consent',
])

const SCORE_LABELS = {
  decider: 'Décideur',
  pain: 'Douleur',
  budget: 'Budget',
  engagement: 'Engagement',
} as const

const asText = (value: AnswerValue | undefined): string => (typeof value === 'string' ? value : '')

function Followup({ prospect }: { prospect: Prospect }) {
  const { update } = useData()
  const [status, setStatus] = useState<ProspectStatus>(prospect.status)
  const [fields, setFields] = useState<Answers>(() =>
    Object.fromEntries(FOLLOWUP_FIELDS.map((q) => [q.id, asText(prospect.answers[q.id])])),
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty =
    status !== prospect.status || FOLLOWUP_FIELDS.some((q) => asText(fields[q.id]) !== asText(prospect.answers[q.id]))

  async function handleSave() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      await update(prospect.id, {
        status,
        answers: Object.fromEntries(FOLLOWUP_FIELDS.map((q) => [q.id, asText(fields[q.id])])),
      })
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Enregistrement impossible.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="no-print space-y-5 rounded-2xl border border-line bg-surface p-4">
      <h3 className="text-[15px] font-semibold">Suivi commercial</h3>

      <div className="space-y-2">
        <p className="text-[15px] font-semibold">Statut</p>
        <div role="radiogroup" aria-label="Statut" className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              role="radio"
              aria-checked={status === s.value}
              onClick={() => {
                setStatus(s.value)
                setSaved(false)
              }}
              className={`h-10 rounded-full border px-4 text-sm font-semibold ${
                status === s.value ? 'border-brand bg-brand text-brand-ink' : 'border-line bg-surface text-ink-2'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {FOLLOWUP_FIELDS.map((q) => (
        <QuestionField
          key={q.id}
          question={{ ...q, required: false }}
          value={fields[q.id]}
          onChange={(value) => {
            setFields((current) => ({ ...current, [q.id]: value }))
            setSaved(false)
          }}
        />
      ))}

      {error && (
        <p role="alert" className="text-sm font-medium text-hot">
          {error}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!dirty || saving}
          className="flex h-12 items-center gap-2 rounded-xl bg-brand px-6 font-semibold text-brand-ink disabled:opacity-50"
        >
          {saving && <Loader2 className="size-5 animate-spin" aria-hidden />}
          Enregistrer le suivi
        </button>
        {saved && !dirty && (
          <span role="status" className="flex items-center gap-1 text-sm font-semibold text-good">
            <Check className="size-4" aria-hidden /> Enregistré
          </span>
        )}
      </div>
    </section>
  )
}

function ScoreBreakdown({ answers }: { answers: Answers }) {
  const score = scoreProspect(answers)
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h3 className="text-[15px] font-semibold">Score de qualification : {score.total}/100</h3>
      <ul className="mt-3 space-y-2.5">
        {(Object.keys(SCORE_LABELS) as Array<keyof typeof SCORE_LABELS>).map((key) => (
          <li key={key}>
            <div className="flex justify-between text-xs text-ink-2">
              <span>{SCORE_LABELS[key]}</span>
              <span className="tabular-nums">
                {score.parts[key]}/{SCORE_MAX[key]}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-brand" style={{ width: `${(score.parts[key] / SCORE_MAX[key]) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

function AnswerSections({ prospect }: { prospect: Prospect }) {
  return (
    <>
      {sectionsFor(prospect.segment).map((section) => {
        const items = section.questions.filter(
          (q) => !HIDDEN_ANSWER_IDS.has(q.id) && !isEmpty(prospect.answers[q.id]),
        )
        if (items.length === 0) return null
        return (
          <section key={section.id} className="rounded-2xl border border-line bg-surface p-4">
            <h3 className="text-[15px] font-semibold">{section.title}</h3>
            <dl className="mt-3 space-y-3">
              {items.map((q) => (
                <div key={q.id}>
                  <dt className="text-xs text-muted">{q.label}</dt>
                  <dd className="whitespace-pre-line text-[15px]">{formatAnswer(q, prospect.answers[q.id])}</dd>
                </div>
              ))}
            </dl>
          </section>
        )
      })}
    </>
  )
}

export function ProspectDetail() {
  const { id } = useParams()
  const { prospects, loading, archive } = useData()
  const navigate = useNavigate()
  const [archiveError, setArchiveError] = useState<string | null>(null)
  const prospect = prospects.find((p) => p.id === id)

  if (!prospect) {
    return loading ? (
      <p className="flex items-center justify-center gap-2 py-16 text-muted" role="status">
        <Loader2 className="size-5 animate-spin" aria-hidden /> Chargement…
      </p>
    ) : (
      <div className="py-16 text-center">
        <p className="text-lg font-semibold">Fiche introuvable</p>
        <Link to="/fiches" className="mt-2 inline-block font-semibold text-brand underline">
          Retour aux fiches
        </Link>
      </div>
    )
  }

  async function handleArchive() {
    if (!prospect) return
    const confirmed = window.confirm(
      'Archiver cette fiche ? Elle disparaît de la liste mais reste conservée dans la base.',
    )
    if (!confirmed) return
    try {
      await archive(prospect.id)
      navigate('/fiches')
    } catch (e) {
      setArchiveError(e instanceof Error ? e.message : 'Archivage impossible.')
    }
  }

  const wa = waLink(prospect.phone)
  const tel = telLink(prospect.phone)
  const duration = prospect.answers.duration_s
  const contactLine = [prospect.contact_name, prospect.location, prospect.phone].filter(Boolean).join(' · ')

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link to="/fiches" className="no-print inline-flex items-center gap-1.5 text-sm font-semibold text-muted">
        <ArrowLeft className="size-4" aria-hidden /> Fiches
      </Link>

      <header className="space-y-2">
        <h2 className="text-2xl font-bold leading-tight">{prospect.shop_name}</h2>
        <div className="flex flex-wrap items-center gap-1.5">
          <SegmentBadge segment={prospect.segment} />
          <LevelBadge level={prospectLevel(prospect.answers)} />
          <StatusBadge status={prospect.status} />
          <ScoreBadge total={scoreProspect(prospect.answers).total} />
        </div>
        {contactLine && <p className="text-[15px] text-ink-2">{contactLine}</p>}
        <p className="text-xs text-muted">
          Fiche du {formatDateTime(prospect.created_at)}
          {prospect.interviewer ? ` par ${prospect.interviewer}` : ''}
          {typeof duration === 'number' ? ` · entretien de ${formatDuration(duration)}` : ''}
        </p>
      </header>

      <div className="no-print flex flex-wrap gap-2">
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 items-center gap-2 rounded-xl bg-good-bg px-4 text-sm font-semibold text-good"
          >
            <MessageCircle className="size-4" aria-hidden /> WhatsApp
          </a>
        )}
        {tel && (
          <a href={tel} className="flex h-11 items-center gap-2 rounded-xl bg-brand-soft px-4 text-sm font-semibold">
            <Phone className="size-4" aria-hidden /> Appeler
          </a>
        )}
        <button
          type="button"
          onClick={() => window.print()}
          className="flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold"
        >
          <Printer className="size-4" aria-hidden /> Imprimer
        </button>
        <button
          type="button"
          onClick={() => void handleArchive()}
          className="flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-hot"
        >
          <Archive className="size-4" aria-hidden /> Archiver
        </button>
      </div>
      {archiveError && (
        <p role="alert" className="text-sm font-medium text-hot">
          {archiveError}
        </p>
      )}

      <Followup key={prospect.id} prospect={prospect} />
      <ScoreBreakdown answers={prospect.answers} />
      <AnswerSections prospect={prospect} />
    </div>
  )
}
