import type { Answers } from './questionnaire'

// Score de qualification automatique (0-100), calculé à l'affichage à partir des
// réponses : rien n'est stocké, donc ajuster les barèmes ci-dessous met tout à jour.
export type Level = 'hot' | 'warm' | 'cold'

export interface Score {
  total: number
  level: Level
  parts: { decider: number; pain: number; budget: number; engagement: number }
}

const HOT_MIN = 65
const WARM_MIN = 40
const PAIN_MAX = 35

const DECIDER_POINTS: Record<string, number> = { owner: 20, manager: 12, seller: 0 }
const STOCK_GAP_POINTS: Record<string, number> = { often: 8, nocount: 8, sometimes: 4 }
const LOSS_POINTS: Record<string, number> = { gt500: 8, '100_500': 8, '20_100': 4 }
const DEBT_POINTS: Record<string, number> = { gt5m: 7, '1m_5m': 7, '100_1m': 4 }
const MARGIN_POINTS: Record<string, number> = { no: 5, approx: 2 }
const ENGAGEMENT_POINTS: Record<string, number> = { demo: 15, trial: 15, callback: 8 }

// Budget mensuel accepté : [seuil minimum en FCFA, points], du plus haut au plus bas.
const BUDGET_STEPS: ReadonlyArray<readonly [number, number]> = [
  [15000, 30],
  [10000, 24],
  [5000, 16],
  [2000, 8],
]

const TOOLS_WITH_PAIN = ['notebook', 'memory']
const TIME_LOST_MANY = 3

const asString = (value: unknown): string => (typeof value === 'string' ? value : '')
const asList = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : [])

function painPoints(a: Answers): number {
  const tools = asList(a.tools)
  const timeLost = asList(a.time_lost).length
  const points =
    (STOCK_GAP_POINTS[asString(a.stock_gap)] ?? 0) +
    (LOSS_POINTS[asString(a.stock_loss)] ?? 0) +
    (DEBT_POINTS[asString(a.debt)] ?? 0) +
    (MARGIN_POINTS[asString(a.margin_knowledge)] ?? 0) +
    (tools.some((t) => TOOLS_WITH_PAIN.includes(t)) ? 5 : 0) +
    (timeLost >= TIME_LOST_MANY ? 4 : timeLost >= 1 ? 2 : 0)
  return Math.min(points, PAIN_MAX)
}

function budgetPoints(a: Answers): number {
  const price = typeof a.price_ok === 'number' ? a.price_ok : 0
  return BUDGET_STEPS.find(([min]) => price >= min)?.[1] ?? 0
}

// Plafond de chaque composante (utilisé pour afficher le détail du score).
export const SCORE_MAX = { decider: 20, pain: PAIN_MAX, budget: 30, engagement: 15 } as const

const LEVELS: readonly Level[] = ['hot', 'warm', 'cold']

// Niveau affiché partout : le jugement de l'enquêteur prime, sinon le score.
export function prospectLevel(answers: Answers): Level {
  const chosen = answers.temperature
  const level = LEVELS.find((l) => l === chosen)
  return level ?? scoreProspect(answers).level
}

export function scoreProspect(answers: Answers): Score {
  const parts = {
    decider: DECIDER_POINTS[asString(answers.role)] ?? 0,
    pain: painPoints(answers),
    budget: budgetPoints(answers),
    engagement: ENGAGEMENT_POINTS[asString(answers.next_step)] ?? 0,
  }
  const total = parts.decider + parts.pain + parts.budget + parts.engagement
  const level: Level = total >= HOT_MIN ? 'hot' : total >= WARM_MIN ? 'warm' : 'cold'
  return { total, level, parts }
}
