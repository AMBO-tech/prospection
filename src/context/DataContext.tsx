import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, archiveProspect, listProspects, updateProspect, type ProspectChanges } from '../lib/api'
import type { Prospect } from '../lib/types'
import { useAuth } from './AuthContext'
import { useSync } from './SyncContext'

interface DataValue {
  prospects: Prospect[]
  loading: boolean
  error: ApiError | null
  reload: () => void
  update: (id: string, changes: ProspectChanges) => Promise<void>
  archive: (id: string) => Promise<void>
}

const DataContext = createContext<DataValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { code, invalidate } = useAuth()
  const { syncVersion } = useSync()
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const [reloadCount, setReloadCount] = useState(0)

  const handleFailure = useCallback(
    (e: unknown): ApiError => {
      const apiError = e instanceof ApiError ? e : new ApiError('server', 'Erreur inattendue.')
      if (apiError.kind === 'auth') invalidate()
      return apiError
    },
    [invalidate],
  )

  const reload = useCallback(() => {
    setLoading(true)
    setReloadCount((n) => n + 1)
  }, [])

  // Recharge au montage, après un envoi réussi et sur demande. Un drapeau
  // `cancelled` écarte les réponses périmées si une nouvelle requête est partie.
  useEffect(() => {
    let cancelled = false
    listProspects(code)
      .then((list) => {
        if (cancelled) return
        setProspects(list)
        setError(null)
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(handleFailure(e))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [code, syncVersion, reloadCount, handleFailure])

  const update = useCallback(
    async (id: string, changes: ProspectChanges) => {
      try {
        await updateProspect(code, id, changes)
      } catch (e) {
        throw handleFailure(e)
      }
      setProspects((current) =>
        current.map((p) =>
          p.id === id
            ? {
                ...p,
                status: changes.status ?? p.status,
                answers: { ...p.answers, ...changes.answers },
                updated_at: new Date().toISOString(),
              }
            : p,
        ),
      )
    },
    [code, handleFailure],
  )

  const archive = useCallback(
    async (id: string) => {
      try {
        await archiveProspect(code, id)
      } catch (e) {
        throw handleFailure(e)
      }
      setProspects((current) => current.filter((p) => p.id !== id))
    },
    [code, handleFailure],
  )

  const value = useMemo<DataValue>(
    () => ({ prospects, loading, error, reload, update, archive }),
    [prospects, loading, error, reload, update, archive],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataValue {
  const value = useContext(DataContext)
  if (!value) throw new Error('useData doit être utilisé dans <DataProvider>')
  return value
}
