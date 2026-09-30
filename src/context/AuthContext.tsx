import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, checkCode } from '../lib/api'
import { readStorage, removeStorage, STORAGE_KEYS, writeStorage } from '../lib/storage'
import { supabase } from '../lib/supabase'

export type AuthState = 'checking' | 'locked' | 'ready' | 'unconfigured'

interface AuthValue {
  state: AuthState
  code: string
  error: string | null
  login: (code: string) => Promise<void>
  logout: () => void
  // Appelé quand une requête révèle que le code n'est plus valide (code changé).
  invalidate: () => void
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() =>
    !supabase ? 'unconfigured' : readStorage(STORAGE_KEYS.code) ? 'checking' : 'locked',
  )
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  const lock = useCallback((message: string | null) => {
    removeStorage(STORAGE_KEYS.code)
    setCode('')
    setError(message)
    setState('locked')
  }, [])

  useEffect(() => {
    const stored = readStorage(STORAGE_KEYS.code)
    if (!supabase || !stored) return
    checkCode(stored)
      .then(() => {
        setCode(stored)
        setState('ready')
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.kind === 'auth') {
          lock('Le code d’accès a changé. Saisissez le nouveau code.')
        } else {
          // Hors ligne : on fait confiance au code mémorisé pour pouvoir remplir des fiches.
          setCode(stored)
          setState('ready')
        }
      })
  }, [lock])

  const login = useCallback(async (input: string) => {
    const trimmed = input.trim()
    setError(null)
    try {
      await checkCode(trimmed)
    } catch (e) {
      const message =
        e instanceof ApiError && e.kind === 'network'
          ? 'Pas de connexion : impossible de vérifier le code.'
          : e instanceof ApiError
            ? e.message
            : 'Erreur inattendue.'
      setError(message)
      return
    }
    writeStorage(STORAGE_KEYS.code, trimmed)
    setCode(trimmed)
    setState('ready')
  }, [])

  const value = useMemo<AuthValue>(
    () => ({
      state,
      code,
      error,
      login,
      logout: () => lock(null),
      invalidate: () => lock('Le code d’accès n’est plus valide.'),
    }),
    [state, code, error, login, lock],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return value
}
