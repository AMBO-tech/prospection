import type { Answers, ProspectStatus } from './questionnaire'
import { supabase } from './supabase'
import type { Prospect } from './types'

export type ApiErrorKind = 'network' | 'auth' | 'config' | 'server'

export class ApiError extends Error {
  kind: ApiErrorKind

  constructor(kind: ApiErrorKind, message: string) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
  }
}

const NETWORK_ERROR_PATTERN = /failed to fetch|networkerror|load failed|network request failed|fetch failed/i
const INVALID_CODE_SQLSTATE = '28000'

function classify(error: { message: string; code?: string }): ApiError {
  if (error.code === INVALID_CODE_SQLSTATE || error.message.includes('invalid_code')) {
    return new ApiError('auth', 'Code d’accès incorrect.')
  }
  if (NETWORK_ERROR_PATTERN.test(error.message)) {
    return new ApiError('network', 'Pas de connexion internet.')
  }
  return new ApiError('server', error.message)
}

async function call<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new ApiError('config', 'Supabase n’est pas configuré.')
  try {
    const { data, error } = await supabase.rpc(fn, args)
    if (error) throw classify(error)
    return data as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError('network', 'Pas de connexion internet.')
  }
}

export async function checkCode(code: string): Promise<void> {
  await call<boolean>('check_code', { p_code: code })
}

export async function submitProspect(code: string, clientId: string, answers: Answers): Promise<void> {
  await call<string>('submit_prospect', { p_code: code, p_client_id: clientId, p_answers: answers })
}

export function listProspects(code: string): Promise<Prospect[]> {
  return call<Prospect[]>('list_prospects', { p_code: code })
}

export interface ProspectChanges {
  status?: ProspectStatus
  answers?: Answers
}

export async function updateProspect(code: string, id: string, changes: ProspectChanges): Promise<void> {
  await call<null>('update_prospect', {
    p_code: code,
    p_id: id,
    p_status: changes.status ?? null,
    p_answers: changes.answers ?? null,
  })
}

export async function archiveProspect(code: string, id: string): Promise<void> {
  await call<null>('archive_prospect', { p_code: code, p_id: id })
}
