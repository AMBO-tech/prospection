import { describe, expect, it } from 'vitest'
import {
  SECTIONS,
  allQuestions,
  formatAnswer,
  isQuestionVisible,
  missingRequired,
  normalizeAnswers,
  questionById,
  sectionsFor,
  type Answers,
} from './questionnaire'

const section = (id: string) => SECTIONS.find((s) => s.id === id)!

describe('questionnaire config', () => {
  it('has unique question ids', () => {
    const ids = allQuestions().map((q) => q.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('gives every choice question at least two options', () => {
    for (const q of allQuestions().filter((q) => q.type === 'single' || q.type === 'multi')) {
      expect(q.options?.length ?? 0, q.id).toBeGreaterThanOrEqual(2)
    }
  })

  it('only references existing questions in showIf', () => {
    for (const q of allQuestions().filter((q) => q.showIf)) {
      expect(questionById(q.showIf!.question), q.id).toBeDefined()
    }
  })
})

describe('sectionsFor', () => {
  it('hides segment modules until a segment is chosen', () => {
    const ids = sectionsFor(undefined).map((s) => s.id)
    expect(ids).not.toContain('textile')
    expect(ids).not.toContain('cosmetique')
  })

  it('includes only the module of the chosen segment', () => {
    expect(sectionsFor('textile').map((s) => s.id)).toContain('textile')
    expect(sectionsFor('textile').map((s) => s.id)).not.toContain('cosmetique')
    expect(sectionsFor('cosmetique').map((s) => s.id)).toContain('cosmetique')
  })
})

describe('isQuestionVisible', () => {
  const q = questionById('current_software')!

  it('is hidden when the trigger answer is absent', () => {
    expect(isQuestionVisible(q, {})).toBe(false)
  })

  it('is shown when a multi answer contains the trigger', () => {
    expect(isQuestionVisible(q, { tools: ['notebook', 'software'] })).toBe(true)
  })

  it('handles single-answer triggers', () => {
    expect(isQuestionVisible(questionById('debt')!, { credit: 'lot' })).toBe(true)
    expect(isQuestionVisible(questionById('debt')!, { credit: 'none' })).toBe(false)
  })
})

describe('missingRequired', () => {
  it('lists required identification fields that are empty', () => {
    const missing = missingRequired(section('identification'), { shop_name: '  ' }).map((q) => q.id)
    expect(missing).toEqual(expect.arrayContaining(['interviewer', 'segment', 'shop_name', 'role']))
  })

  it('requires the consent checkbox to be ticked', () => {
    const base: Answers = { next_step: 'demo', temperature: 'hot' }
    expect(missingRequired(section('conclusion'), base).map((q) => q.id)).toEqual(['consent'])
    expect(missingRequired(section('conclusion'), { ...base, consent: true })).toEqual([])
  })
})

describe('normalizeAnswers', () => {
  it('drops empty, hidden and other-segment answers', () => {
    const result = normalizeAnswers({
      segment: 'textile',
      shop_name: '  Wax Mbaye ',
      phone: '',
      tools: ['notebook'],
      current_software: 'Sage', // hidden: tools has no "software"
      categories: ['face'], // cosmetics question on a textile prospect
      fabric_types: ['wax'],
    })
    expect(result).toEqual({
      segment: 'textile',
      shop_name: 'Wax Mbaye',
      tools: ['notebook'],
      fabric_types: ['wax'],
    })
  })

  it('converts number fields and ignores invalid numbers', () => {
    const result = normalizeAnswers({ segment: 'textile', price_ok: '10 000', price_max: 'abc' })
    expect(result.price_ok).toBe(10000)
    expect(result).not.toHaveProperty('price_max')
  })

  it('does not mutate its input', () => {
    const input: Answers = { segment: 'textile', shop_name: ' X ' }
    normalizeAnswers(input)
    expect(input.shop_name).toBe(' X ')
  })
})

describe('formatAnswer', () => {
  it('maps option values to labels', () => {
    expect(formatAnswer(questionById('role')!, 'owner')).toBe('Propriétaire')
    expect(formatAnswer(questionById('tools')!, ['notebook', 'excel'])).toBe('Cahier, Excel / tableur')
  })

  it('formats numbers with their suffix and returns empty for no answer', () => {
    expect(formatAnswer(questionById('price_ok')!, 15000)).toContain('FCFA / mois')
    expect(formatAnswer(questionById('notes')!, undefined)).toBe('')
  })
})
