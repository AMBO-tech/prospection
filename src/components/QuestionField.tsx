import { Check } from 'lucide-react'
import { useId } from 'react'
import type { AnswerValue, Question } from '../lib/questionnaire'

interface QuestionFieldProps {
  question: Question
  value: AnswerValue | undefined
  onChange: (value: AnswerValue) => void
  hasError?: boolean
}

const INPUT =
  'h-12 w-full rounded-xl border border-line bg-surface px-3 text-base placeholder:text-muted aria-[invalid=true]:border-hot'

const CHIP = 'flex min-h-12 items-center gap-2 rounded-xl border px-4 py-2 text-left text-[15px] leading-snug'
const CHIP_ON = 'border-brand bg-brand text-brand-ink font-semibold'
const CHIP_OFF = 'border-line bg-surface text-ink'

function toList(value: AnswerValue | undefined): string[] {
  return Array.isArray(value) ? value : []
}

function ChoiceGroup({ question, value, onChange }: Omit<QuestionFieldProps, 'hasError'>) {
  const multi = question.type === 'multi'
  const selected = multi ? toList(value) : typeof value === 'string' ? [value] : []

  function toggle(optionValue: string) {
    if (multi) {
      onChange(selected.includes(optionValue) ? selected.filter((v) => v !== optionValue) : [...selected, optionValue])
    } else {
      // Un second appui désélectionne : utile pour corriger une erreur de saisie.
      onChange(selected.includes(optionValue) ? '' : optionValue)
    }
  }

  return (
    <div role={multi ? 'group' : 'radiogroup'} aria-labelledby={`${question.id}-label`} className="grid gap-2 sm:grid-cols-2">
      {question.options?.map((option) => {
        const on = selected.includes(option.value)
        return (
          <button
            key={option.value}
            type="button"
            role={multi ? undefined : 'radio'}
            aria-checked={multi ? undefined : on}
            aria-pressed={multi ? on : undefined}
            onClick={() => toggle(option.value)}
            className={`${CHIP} ${on ? CHIP_ON : CHIP_OFF}`}
          >
            <span
              className={`grid size-5 shrink-0 place-items-center border ${multi ? 'rounded-md' : 'rounded-full'} ${
                on ? 'border-brand-ink' : 'border-line'
              }`}
              aria-hidden
            >
              {on && <Check className="size-3.5" strokeWidth={3} />}
            </span>
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function QuestionField({ question, value, onChange, hasError }: QuestionFieldProps) {
  const inputId = useId()
  const hintId = `${inputId}-hint`
  const text = typeof value === 'string' ? value : typeof value === 'number' ? String(value) : ''

  if (question.type === 'consent') {
    return (
      <div className="space-y-2">
        <label
          className={`flex items-start gap-3 rounded-xl border bg-surface p-4 ${hasError ? 'border-hot' : 'border-line'}`}
        >
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            className="mt-0.5 size-6 accent-[var(--c-brand)]"
            aria-invalid={hasError ? true : undefined}
          />
          <span className="text-[15px] leading-snug">{question.label}</span>
        </label>
        {hasError && (
          <p role="alert" className="text-sm font-medium text-hot">
            Le consentement est obligatoire.
          </p>
        )}
      </div>
    )
  }

  const isChoice = question.type === 'single' || question.type === 'multi'
  const commonProps = {
    id: inputId,
    value: text,
    'aria-invalid': hasError ? true : undefined,
    'aria-describedby': question.hint ? hintId : undefined,
    placeholder: question.placeholder,
  }

  return (
    <div className="space-y-2">
      {isChoice ? (
        <p id={`${question.id}-label`} className="text-[15px] font-semibold leading-snug">
          {question.label}
          {question.required && <span className="text-hot"> *</span>}
        </p>
      ) : (
        <label htmlFor={inputId} id={`${question.id}-label`} className="block text-[15px] font-semibold leading-snug">
          {question.label}
          {question.required && <span className="text-hot"> *</span>}
        </label>
      )}
      {question.hint && (
        <p id={hintId} className="text-sm text-muted">
          {question.hint}
        </p>
      )}

      {isChoice && <ChoiceGroup question={question} value={value} onChange={onChange} />}

      {question.type === 'textarea' && (
        <textarea {...commonProps} rows={3} onChange={(e) => onChange(e.target.value)} className={`${INPUT} h-auto py-3`} />
      )}

      {(question.type === 'text' || question.type === 'tel' || question.type === 'date') && (
        <input
          {...commonProps}
          type={question.type}
          inputMode={question.type === 'tel' ? 'tel' : undefined}
          autoComplete="off"
          onChange={(e) => onChange(e.target.value)}
          className={INPUT}
        />
      )}

      {question.type === 'number' && (
        <div className="flex items-center gap-2">
          <input
            {...commonProps}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            onChange={(e) => onChange(e.target.value.replace(/[^\d\s]/g, ''))}
            className={INPUT}
          />
          {question.suffix && <span className="shrink-0 text-sm text-muted">{question.suffix}</span>}
        </div>
      )}

      {hasError && (
        <p role="alert" className="text-sm font-medium text-hot">
          Réponse obligatoire.
        </p>
      )}
    </div>
  )
}
