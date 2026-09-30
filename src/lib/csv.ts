import { SEGMENT_LABEL, STATUSES, allQuestions, formatAnswer, type Question } from './questionnaire'
import { scoreProspect } from './scoring'
import type { Prospect } from './types'

const SEPARATOR = ';' // Excel en français attend le point-virgule
const BOM = '﻿'
const NEWLINE = '\r\n'

// Colonnes déjà présentes en tête de fichier : on ne les répète pas.
const LEADING_COLUMN_IDS = new Set(['segment', 'shop_name', 'contact_name', 'phone', 'location', 'interviewer'])

function escapeCell(value: string): string {
  return /[";\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function questionCell(q: Question, prospect: Prospect): string {
  const value = prospect.answers[q.id]
  if (Array.isArray(value)) return value.map((v) => formatAnswer({ ...q, type: 'single' }, v)).join(' | ')
  return formatAnswer(q, value)
}

export function toCsv(prospects: Prospect[]): string {
  const questions = allQuestions().filter((q) => !LEADING_COLUMN_IDS.has(q.id))
  const header = [
    'Date',
    'Statut',
    'Segment',
    'Boutique',
    'Contact',
    'Téléphone',
    'Lieu',
    'Enquêteur',
    'Score',
    ...questions.map((q) => q.label),
  ]
  const rows = prospects.map((p) => [
    new Date(p.created_at).toLocaleString('fr-FR'),
    STATUSES.find((s) => s.value === p.status)?.label ?? p.status,
    SEGMENT_LABEL[p.segment],
    p.shop_name,
    p.contact_name ?? '',
    p.phone ?? '',
    p.location ?? '',
    p.interviewer ?? '',
    String(scoreProspect(p.answers).total),
    ...questions.map((q) => questionCell(q, p)),
  ])
  return BOM + [header, ...rows].map((row) => row.map(escapeCell).join(SEPARATOR)).join(NEWLINE)
}

export function downloadCsv(prospects: Prospect[], filename: string): void {
  const blob = new Blob([toCsv(prospects)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
