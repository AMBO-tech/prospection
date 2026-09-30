import { isEmpty, questionById, type Answers } from './questionnaire'

export function median(numbers: number[]): number | null {
  if (numbers.length === 0) return null
  const sorted = [...numbers].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

// Tranches de budget mensuel (FCFA). `max` est exclusif ; la dernière est ouverte.
export const PRICE_BUCKETS: ReadonlyArray<{ label: string; max: number }> = [
  { label: 'Moins de 3 000', max: 3000 },
  { label: '3 000 – 5 000', max: 5000 },
  { label: '5 000 – 10 000', max: 10000 },
  { label: '10 000 – 20 000', max: 20000 },
  { label: '20 000 – 35 000', max: 35000 },
  { label: '35 000 et plus', max: Infinity },
]

export function bucketPrices(values: number[]): number[] {
  const counts = PRICE_BUCKETS.map(() => 0)
  for (const value of values) {
    const index = PRICE_BUCKETS.findIndex((bucket) => value < bucket.max)
    counts[index] += 1
  }
  return counts
}

export interface DistributionRow {
  value: string
  label: string
  count: number
}

export interface Distribution {
  rows: DistributionRow[]
  base: number // nombre de répondants à la question
}

function selectedValues(answers: Answers, id: string): string[] | null {
  const raw = answers[id]
  if (isEmpty(raw)) return null
  return Array.isArray(raw) ? raw : [String(raw)]
}

// Une ligne par option de la question (dans l'ordre du questionnaire).
export function distribution(items: ReadonlyArray<{ answers: Answers }>, questionId: string): Distribution {
  const question = questionById(questionId)
  if (!question?.options) return { rows: [], base: 0 }
  const counts = new Map<string, number>()
  let base = 0
  for (const item of items) {
    const values = selectedValues(item.answers, questionId)
    if (!values) continue
    base += 1
    for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  const rows = question.options.map((o) => ({ value: o.value, label: o.label, count: counts.get(o.value) ?? 0 }))
  return { rows, base }
}

export interface DayCount {
  key: string
  label: string
  count: number
}

const dayKey = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// Fiches par jour local sur les `days` derniers jours, aujourd'hui en dernier.
export function perDay(items: ReadonlyArray<{ created_at: string }>, days: number, now: Date = new Date()): DayCount[] {
  const counts = new Map<string, number>()
  for (const item of items) {
    const key = dayKey(new Date(item.created_at))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return Array.from({ length: days }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1 - i))
    const key = dayKey(date)
    const label = date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
    return { key, label, count: counts.get(key) ?? 0 }
  })
}
