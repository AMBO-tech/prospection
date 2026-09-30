import { describe, expect, it } from 'vitest'
import { formatDuration, telLink, waLink } from './format'

describe('waLink', () => {
  it('adds the Senegal prefix to a local 9-digit number', () => {
    expect(waLink('77 123 45 67')).toBe('https://wa.me/221771234567')
  })
  it('keeps an international number and strips punctuation', () => {
    expect(waLink('+221 78-000-00-00')).toBe('https://wa.me/221780000000')
    expect(waLink('00221770000000')).toBe('https://wa.me/221770000000')
  })
  it('returns null when there is no usable number', () => {
    expect(waLink(null)).toBeNull()
    expect(waLink('abc')).toBeNull()
    expect(waLink('123')).toBeNull()
  })
})

describe('telLink', () => {
  it('builds a tel: link or null', () => {
    expect(telLink('77 123 45 67')).toBe('tel:+221771234567')
    expect(telLink('')).toBeNull()
  })
})

describe('formatDuration', () => {
  it('formats seconds as mm:ss', () => {
    expect(formatDuration(0)).toBe('00:00')
    expect(formatDuration(75)).toBe('01:15')
    expect(formatDuration(3725)).toBe('62:05')
  })
})
