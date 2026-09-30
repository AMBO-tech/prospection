import { describe, expect, it } from 'vitest'
import { PRICE_BUCKETS, bucketPrices, distribution, median, perDay } from './analytics'
import type { Answers } from './questionnaire'

describe('median', () => {
  it('returns null for no data', () => {
    expect(median([])).toBeNull()
  })
  it('handles odd and even counts without mutating the input', () => {
    const input = [30, 10, 20]
    expect(median(input)).toBe(20)
    expect(input).toEqual([30, 10, 20])
    expect(median([10, 20, 30, 40])).toBe(25)
  })
})

describe('bucketPrices', () => {
  it('places each price in the right tranche, boundaries going up', () => {
    const counts = bucketPrices([1000, 3000, 4999, 5000, 12000, 50000])
    expect(counts).toHaveLength(PRICE_BUCKETS.length)
    expect(counts).toEqual([1, 2, 1, 1, 0, 1])
  })
})

describe('distribution', () => {
  const prospects: Array<{ answers: Answers }> = [
    { answers: { tools: ['notebook', 'excel'], role: 'owner' } },
    { answers: { tools: ['notebook'], role: 'owner' } },
    { answers: { role: 'manager' } },
  ]

  it('counts a multi question per option, in option order, over respondents', () => {
    const { rows, base } = distribution(prospects, 'tools')
    expect(base).toBe(2)
    expect(rows.find((r) => r.value === 'notebook')?.count).toBe(2)
    expect(rows.find((r) => r.value === 'excel')?.count).toBe(1)
    expect(rows.find((r) => r.value === 'software')?.count).toBe(0)
    expect(rows[0].value).toBe('notebook')
  })

  it('counts a single question', () => {
    const { rows, base } = distribution(prospects, 'role')
    expect(base).toBe(3)
    expect(rows.find((r) => r.value === 'owner')?.count).toBe(2)
  })

  it('returns no rows for an unknown question', () => {
    expect(distribution(prospects, 'nope')).toEqual({ rows: [], base: 0 })
  })
})

describe('perDay', () => {
  it('returns one entry per day ending today, counting local-day submissions', () => {
    const now = new Date(2026, 8, 30, 20, 0)
    const prospects = [
      { created_at: new Date(2026, 8, 30, 9, 0).toISOString() },
      { created_at: new Date(2026, 8, 30, 11, 0).toISOString() },
      { created_at: new Date(2026, 8, 29, 15, 0).toISOString() },
      { created_at: new Date(2026, 8, 1, 15, 0).toISOString() },
    ]
    const days = perDay(prospects, 3, now)
    expect(days.map((d) => d.count)).toEqual([0, 1, 2])
    expect(days).toHaveLength(3)
  })
})
