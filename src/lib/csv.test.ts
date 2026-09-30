import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'
import type { Prospect } from './types'

const prospect = (overrides: Partial<Prospect> = {}): Prospect => ({
  id: '1',
  client_id: 'c1',
  created_at: '2026-09-30T10:00:00.000Z',
  updated_at: '2026-09-30T10:00:00.000Z',
  segment: 'textile',
  shop_name: 'Wax "Chez Awa"; Sandaga',
  contact_name: 'Awa',
  phone: '771234567',
  location: 'Sandaga',
  interviewer: 'Moussa',
  status: 'nouveau',
  answers: { role: 'owner', tools: ['notebook', 'excel'], price_ok: 10000, notes: 'ligne 1\nligne 2' },
  deleted_at: null,
  ...overrides,
})

describe('toCsv', () => {
  it('starts with a BOM so Excel reads accents, and uses ; separators', () => {
    const csv = toCsv([prospect()])
    expect(csv.startsWith('﻿')).toBe(true)
    expect(csv.split('\r\n')[0]).toContain(';')
  })

  it('writes a French header and one row per prospect', () => {
    const lines = toCsv([prospect(), prospect({ id: '2', shop_name: 'B' })]).split('\r\n')
    expect(lines[0]).toContain('Boutique')
    expect(lines[0]).toContain('Score')
    expect(lines).toHaveLength(3)
  })

  it('escapes quotes, separators and newlines', () => {
    const csv = toCsv([prospect()])
    expect(csv).toContain('"Wax ""Chez Awa""; Sandaga"')
    expect(csv).toContain('"ligne 1\nligne 2"')
  })

  it('renders option labels and joins multi answers', () => {
    const csv = toCsv([prospect()])
    expect(csv).toContain('Propriétaire')
    expect(csv).toContain('Cahier | Excel / tableur')
  })

  it('returns only the header for an empty list', () => {
    expect(toCsv([]).split('\r\n')).toHaveLength(1)
  })
})
