import type { Answers, ProspectStatus, Segment } from './questionnaire'

// Ligne de la table public.prospects telle que renvoyée par list_prospects.
export interface Prospect {
  id: string
  client_id: string
  created_at: string
  updated_at: string
  segment: Segment
  shop_name: string
  contact_name: string | null
  phone: string | null
  location: string | null
  interviewer: string | null
  status: ProspectStatus
  answers: Answers
  deleted_at: string | null
}
