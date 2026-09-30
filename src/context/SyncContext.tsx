import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { submitProspect } from '../lib/api'
import { enqueue, flush, loadOutbox, type OutboxItem } from '../lib/outbox'
import type { Answers } from '../lib/questionnaire'
import { useAuth } from './AuthContext'

export type SubmitResult = 'sent' | 'queued'

interface SyncValue {
  queue: OutboxItem[]
  syncing: boolean
  online: boolean
  // Incrémenté à chaque envoi réussi : les données affichées se rechargent.
  syncVersion: number
  submit: (answers: Answers) => Promise<SubmitResult>
  syncNow: () => Promise<void>
}

const SyncContext = createContext<SyncValue | null>(null)

const RETRY_INTERVAL_MS = 30_000
const MAX_SUBMIT_FLUSHES = 2

function newClientId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  // http hors localhost (test sur téléphone en réseau local) : pas de randomUUID.
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { code, invalidate } = useAuth()
  const [queue, setQueue] = useState<OutboxItem[]>(() => loadOutbox())
  const [syncing, setSyncing] = useState(false)
  const [online, setOnline] = useState(() => navigator.onLine)
  const [syncVersion, setSyncVersion] = useState(0)

  const syncNow = useCallback(async () => {
    if (loadOutbox().length === 0) return
    setSyncing(true)
    try {
      // captured_at : heure réelle de la saisie, même si l'envoi a lieu plus tard.
      const result = await flush((item) =>
        submitProspect(code, item.clientId, { ...item.answers, captured_at: item.savedAt }),
      )
      if (result.sent > 0) setSyncVersion((v) => v + 1)
      if (result.authError) invalidate()
    } finally {
      setQueue(loadOutbox())
      setSyncing(false)
    }
  }, [code, invalidate])

  const submit = useCallback(
    async (answers: Answers): Promise<SubmitResult> => {
      const item: OutboxItem = { clientId: newClientId(), answers, savedAt: new Date().toISOString() }
      enqueue(item)
      setQueue(loadOutbox())
      // Un envoi déjà en cours a pu démarrer sans cette fiche : on relance au besoin.
      for (let attempt = 0; attempt < MAX_SUBMIT_FLUSHES; attempt += 1) {
        await syncNow()
        if (!loadOutbox().some((i) => i.clientId === item.clientId)) return 'sent'
      }
      return 'queued'
    },
    [syncNow],
  )

  useEffect(() => {
    void syncNow()
    const handleOnline = () => {
      setOnline(true)
      void syncNow()
    }
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    const timer = window.setInterval(() => void syncNow(), RETRY_INTERVAL_MS)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.clearInterval(timer)
    }
  }, [syncNow])

  const value = useMemo<SyncValue>(
    () => ({ queue, syncing, online, syncVersion, submit, syncNow }),
    [queue, syncing, online, syncVersion, submit, syncNow],
  )

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

export function useSync(): SyncValue {
  const value = useContext(SyncContext)
  if (!value) throw new Error('useSync doit être utilisé dans <SyncProvider>')
  return value
}
