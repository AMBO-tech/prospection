import { describe, expect, it } from 'vitest'
import { SCORE_MAX, prospectLevel, scoreProspect } from './scoring'

describe('prospectLevel', () => {
  it('prefers the temperature chosen by the interviewer', () => {
    expect(prospectLevel({ temperature: 'hot', role: 'seller' })).toBe('hot')
    expect(prospectLevel({ temperature: 'cold', role: 'owner', price_ok: 20000, next_step: 'demo' })).toBe('cold')
  })

  it('falls back to the automatic score when no temperature is set', () => {
    expect(prospectLevel({ role: 'seller' })).toBe('cold')
    expect(prospectLevel({ temperature: 'unknown' })).toBe('cold')
  })
})

describe('SCORE_MAX', () => {
  it('sums to 100', () => {
    const { decider, pain, budget, engagement } = SCORE_MAX
    expect(decider + pain + budget + engagement).toBe(100)
  })
})

describe('scoreProspect', () => {
  it('rates a decision-maker with clear pain, budget and a demo as hot', () => {
    const score = scoreProspect({
      role: 'owner',
      tools: ['notebook'],
      stock_gap: 'often',
      stock_loss: '100_500',
      credit: 'lot',
      debt: '1m_5m',
      margin_knowledge: 'no',
      time_lost: ['inventory', 'debts', 'margins'],
      price_ok: 15000,
      next_step: 'demo',
    })
    expect(score.level).toBe('hot')
    expect(score.total).toBeGreaterThanOrEqual(65)
  })

  it('rates a seller with no pain, no budget and no interest as cold', () => {
    const score = scoreProspect({ role: 'seller', tools: ['software'], next_step: 'no' })
    expect(score.level).toBe('cold')
    expect(score.total).toBeLessThan(40)
  })

  it('keeps the total between 0 and 100 and equal to the sum of parts', () => {
    const score = scoreProspect({
      role: 'owner',
      tools: ['memory'],
      stock_gap: 'nocount',
      stock_loss: 'gt500',
      debt: 'gt5m',
      margin_knowledge: 'no',
      time_lost: ['inventory', 'invoices', 'debts', 'margins', 'supplier', 'staff'],
      price_ok: 100000,
      next_step: 'trial',
    })
    const { decider, pain, budget, engagement } = score.parts
    expect(score.total).toBe(decider + pain + budget + engagement)
    expect(score.total).toBeLessThanOrEqual(100)
    expect(score.total).toBeGreaterThanOrEqual(0)
  })

  it('handles an empty answer set', () => {
    expect(scoreProspect({}).total).toBe(0)
  })

  it('gives a higher budget score for a higher accepted price', () => {
    const low = scoreProspect({ price_ok: 3000 }).parts.budget
    const high = scoreProspect({ price_ok: 20000 }).parts.budget
    expect(high).toBeGreaterThan(low)
  })
})
