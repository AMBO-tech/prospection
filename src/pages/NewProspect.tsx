import { ArrowLeft, ArrowRight, CheckCircle2, CloudOff, Loader2, Timer, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { QuestionField } from '../components/QuestionField'
import { useSync, type SubmitResult } from '../context/SyncContext'
import { formatDuration } from '../lib/format'
import {
  isEmpty,
  isSegment,
  missingRequired,
  normalizeAnswers,
  sectionsFor,
  visibleQuestions,
  type AnswerValue,
  type Answers,
} from '../lib/questionnaire'
import { readStorage, removeStorage, STORAGE_KEYS, writeStorage } from '../lib/storage'

interface Draft {
  answers: Answers
  step: number
  startedAt: number | null
}

interface Outcome {
  status: SubmitResult
  shopName: string
}

const TARGET_MINUTES = '10 à 15 min'
const OVERTIME_SECONDS = 15 * 60

function freshDraft(): Draft {
  return { answers: { interviewer: readStorage(STORAGE_KEYS.interviewer) ?? '' }, step: 0, startedAt: null }
}

function loadDraft(): Draft {
  try {
    const parsed: unknown = JSON.parse(readStorage(STORAGE_KEYS.draft) ?? 'null')
    const draft = parsed as Partial<Draft> | null
    if (draft && typeof draft.answers === 'object' && draft.answers !== null && typeof draft.step === 'number') {
      return { answers: draft.answers, step: draft.step, startedAt: draft.startedAt ?? null }
    }
  } catch {
    // brouillon illisible : on repart d'une fiche vierge
  }
  return freshDraft()
}

function useElapsedSeconds(startedAt: number | null): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (startedAt === null) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [startedAt])
  return startedAt === null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000))
}

function scrollToFirstError() {
  window.setTimeout(() => {
    document.querySelector('[data-error="true"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 0)
}

export function NewProspect() {
  const { submit } = useSync()
  const [draft, setDraft] = useState<Draft>(loadDraft)
  const [showErrors, setShowErrors] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const elapsed = useElapsedSeconds(draft.startedAt)

  const { answers } = draft
  const segment = isSegment(answers.segment) ? answers.segment : undefined
  const sections = useMemo(() => sectionsFor(segment), [segment])
  const step = Math.min(draft.step, sections.length - 1)
  const section = sections[step]
  const isLast = step === sections.length - 1

  useEffect(() => {
    if (!outcome) writeStorage(STORAGE_KEYS.draft, JSON.stringify(draft))
  }, [draft, outcome])

  function setAnswer(id: string, value: AnswerValue) {
    if (id === 'interviewer' && typeof value === 'string') writeStorage(STORAGE_KEYS.interviewer, value.trim())
    setDraft((d) => ({ ...d, answers: { ...d.answers, [id]: value }, startedAt: d.startedAt ?? Date.now() }))
  }

  function goTo(nextStep: number) {
    setShowErrors(false)
    setDraft((d) => ({ ...d, step: nextStep }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleNext() {
    if (missingRequired(section, answers).length > 0) {
      setShowErrors(true)
      scrollToFirstError()
      return
    }
    goTo(step + 1)
  }

  async function handleSubmit() {
    const incompleteIndex = sections.findIndex((s) => missingRequired(s, answers).length > 0)
    if (incompleteIndex !== -1) {
      if (incompleteIndex !== step) goTo(incompleteIndex)
      setShowErrors(true)
      scrollToFirstError()
      return
    }
    setSubmitting(true)
    setSubmitError(null)
    const payload: Answers = { ...normalizeAnswers(answers) }
    if (draft.startedAt !== null) payload.duration_s = elapsed
    try {
      const status = await submit(payload)
      removeStorage(STORAGE_KEYS.draft)
      setOutcome({ status, shopName: String(payload.shop_name ?? '') })
    } catch {
      setSubmitError('Enregistrement impossible sur ce téléphone (stockage plein ?). Gardez la page ouverte et réessayez.')
    } finally {
      setSubmitting(false)
    }
  }

  function startNew() {
    removeStorage(STORAGE_KEYS.draft)
    setDraft(freshDraft())
    setOutcome(null)
    setShowErrors(false)
    window.scrollTo({ top: 0 })
  }

  if (outcome) {
    const queued = outcome.status === 'queued'
    return (
      <div className="mx-auto max-w-xl space-y-5 py-10 text-center" role="status">
        {queued ? (
          <CloudOff className="mx-auto size-14 text-warm" aria-hidden />
        ) : (
          <CheckCircle2 className="mx-auto size-14 text-good" aria-hidden />
        )}
        <h2 className="text-2xl font-bold">{queued ? 'Fiche gardée sur le téléphone' : 'Fiche enregistrée'}</h2>
        <p className="text-ink-2">
          {queued
            ? `« ${outcome.shopName} » sera envoyée automatiquement dès que la connexion revient. Ne videz pas les données du navigateur.`
            : `« ${outcome.shopName} » est dans la base.`}
        </p>
        <button type="button" onClick={startNew} className="h-14 w-full rounded-xl bg-brand text-lg font-semibold text-brand-ink">
          Nouvelle fiche
        </button>
      </div>
    )
  }

  const questions = visibleQuestions(section, answers)

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-5 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <p className="font-semibold">
            Étape {step + 1} sur {sections.length} · {section.title}
          </p>
          <p
            className={`flex items-center gap-1 tabular-nums ${elapsed > OVERTIME_SECONDS ? 'font-semibold text-warm' : 'text-muted'}`}
            title={`Objectif : ${TARGET_MINUTES}`}
          >
            <Timer className="size-4" aria-hidden />
            {formatDuration(elapsed)}
          </p>
        </div>
        <div
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={sections.length}
          aria-valuenow={step + 1}
          aria-label="Progression du questionnaire"
          className="h-1.5 overflow-hidden rounded-full bg-line"
        >
          <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${((step + 1) / sections.length) * 100}%` }} />
        </div>
        {section.hint && <p className="text-sm text-muted">{section.hint}</p>}
      </div>

      <div className="space-y-6">
        {questions.map((q) => (
          <div key={q.id} data-error={showErrors && q.required && isEmpty(answers[q.id]) ? 'true' : undefined}>
            <QuestionField
              question={q}
              value={answers[q.id]}
              onChange={(value) => setAnswer(q.id, value)}
              hasError={showErrors && q.required && isEmpty(answers[q.id])}
            />
          </div>
        ))}
      </div>

      {isLast && isEmpty(answers.phone) && (
        <p className="mt-6 flex items-start gap-2 rounded-xl bg-warm-bg p-3 text-sm text-warm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          Aucun numéro de téléphone : cette fiche ne pourra pas être relancée.
        </p>
      )}
      {submitError && (
        <p role="alert" className="mt-4 rounded-xl bg-hot-bg p-3 text-sm font-medium text-hot">
          {submitError}
        </p>
      )}

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] -mx-4 mt-8 flex gap-3 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur">
        {step > 0 && (
          <button
            type="button"
            onClick={() => goTo(step - 1)}
            className="flex h-14 items-center gap-2 rounded-xl border border-line bg-surface px-5 font-semibold"
          >
            <ArrowLeft className="size-5" aria-hidden /> Retour
          </button>
        )}
        <button
          type="button"
          onClick={isLast ? () => void handleSubmit() : handleNext}
          disabled={submitting}
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-xl bg-brand text-lg font-semibold text-brand-ink disabled:opacity-60"
        >
          {submitting ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : isLast ? (
            'Enregistrer la fiche'
          ) : (
            <>
              Suivant <ArrowRight className="size-5" aria-hidden />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
