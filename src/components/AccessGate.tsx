import { KeyRound, Loader2, TriangleAlert } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

function Card({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-8 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-brand text-lg font-bold text-brand-ink">P</span>
        <div>
          <h1 className="text-xl font-bold leading-tight">Prospection terrain</h1>
          <p className="text-sm text-muted">Textile et cosmétiques</p>
        </div>
      </div>
      {children}
    </main>
  )
}

function LoginForm() {
  const { error, login } = useAuth()
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!value.trim() || busy) return
    setBusy(true)
    await login(value)
    setBusy(false)
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label htmlFor="access-code" className="block text-sm font-medium">
          Code d’accès de l’équipe
        </label>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <input
            id="access-code"
            type="password"
            autoComplete="off"
            autoCapitalize="none"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="h-12 w-full rounded-xl border border-line bg-surface pl-11 pr-3 text-base"
            aria-describedby={error ? 'access-error' : undefined}
            aria-invalid={error ? true : undefined}
          />
        </div>
        {error && (
          <p id="access-error" role="alert" className="text-sm font-medium text-hot">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !value.trim()}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-brand font-semibold text-brand-ink disabled:opacity-50"
        >
          {busy && <Loader2 className="size-5 animate-spin" aria-hidden />}
          Entrer
        </button>
      </form>
    </Card>
  )
}

export function AccessGate({ children }: { children: ReactNode }) {
  const { state } = useAuth()

  if (state === 'unconfigured') {
    return (
      <Card>
        <div role="alert" className="space-y-2 rounded-xl border border-line bg-surface p-4">
          <p className="flex items-center gap-2 font-semibold text-warm">
            <TriangleAlert className="size-5" aria-hidden /> Configuration manquante
          </p>
          <p className="text-sm text-ink-2">
            Renseignez <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_ANON_KEY</code> (fichier <code>.env</code> ou
            variables Vercel), puis redéployez.
          </p>
        </div>
      </Card>
    )
  }

  if (state === 'checking') {
    return (
      <Card>
        <p className="flex items-center gap-2 text-muted" role="status">
          <Loader2 className="size-5 animate-spin" aria-hidden /> Chargement…
        </p>
      </Card>
    )
  }

  if (state === 'locked') return <LoginForm />

  return <>{children}</>
}
