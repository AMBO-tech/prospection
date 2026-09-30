import type { Answers } from './questionnaire'

// File d'attente locale : une fiche est d'abord écrite sur le téléphone, puis
// envoyée. Sans réseau (marché, sous-sol), rien n'est perdu : l'envoi reprend
// tout seul. L'identifiant `clientId` rend le renvoi idempotent côté base.
export interface OutboxItem {
  clientId: string
  answers: Answers
  savedAt: string
  lastError?: string
}

export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>

export interface FlushResult {
  sent: number
  remaining: number
  authError: boolean
}

const STORAGE_KEY = 'prospection.outbox.v1'

function defaultStore(): KeyValueStore {
  return localStorage
}

function save(items: OutboxItem[], store: KeyValueStore): void {
  store.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function loadOutbox(store: KeyValueStore = defaultStore()): OutboxItem[] {
  try {
    const parsed: unknown = JSON.parse(store.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(parsed) ? (parsed as OutboxItem[]) : []
  } catch {
    return []
  }
}

export function enqueue(item: OutboxItem, store: KeyValueStore = defaultStore()): void {
  const items = loadOutbox(store)
  if (items.some((i) => i.clientId === item.clientId)) return
  save([...items, item], store)
}

export function removeFromOutbox(clientId: string, store: KeyValueStore = defaultStore()): void {
  save(
    loadOutbox(store).filter((i) => i.clientId !== clientId),
    store,
  )
}

function errorKind(error: unknown): string {
  const kind = (error as { kind?: unknown } | null)?.kind
  return typeof kind === 'string' ? kind : 'server'
}

function markFailed(clientId: string, message: string, store: KeyValueStore): void {
  save(
    loadOutbox(store).map((i) => (i.clientId === clientId ? { ...i, lastError: message } : i)),
    store,
  )
}

let inFlight: Promise<FlushResult> | null = null

// Envoie les fiches en attente. Réseau coupé ou code refusé : on s'arrête et on
// garde tout. Fiche rejetée par le serveur : on la garde avec son erreur et on
// continue avec les suivantes pour ne pas bloquer la file.
export function flush(
  send: (item: OutboxItem) => Promise<void>,
  store: KeyValueStore = defaultStore(),
): Promise<FlushResult> {
  if (inFlight) return inFlight
  inFlight = run(send, store).finally(() => {
    inFlight = null
  })
  return inFlight
}

async function run(send: (item: OutboxItem) => Promise<void>, store: KeyValueStore): Promise<FlushResult> {
  let sent = 0
  let authError = false
  for (const item of loadOutbox(store)) {
    try {
      await send(item)
      removeFromOutbox(item.clientId, store)
      sent += 1
    } catch (error) {
      const kind = errorKind(error)
      if (kind === 'network') break
      if (kind === 'auth') {
        authError = true
        break
      }
      markFailed(item.clientId, kind, store)
    }
  }
  return { sent, remaining: loadOutbox(store).length, authError }
}
