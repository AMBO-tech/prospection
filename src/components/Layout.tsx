import { ClipboardPlus, CloudUpload, LayoutDashboard, Loader2, LogOut, Users, WifiOff } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router'
import { useAuth } from '../context/AuthContext'
import { useSync } from '../context/SyncContext'

const NAV_ITEMS = [
  { to: '/', label: 'Nouvelle fiche', icon: ClipboardPlus, end: true },
  { to: '/fiches', label: 'Fiches', icon: Users, end: false },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, end: false },
] as const

function SyncChip() {
  const { queue, syncing, online, syncNow } = useSync()

  if (queue.length > 0) {
    return (
      <button
        type="button"
        onClick={() => void syncNow()}
        className="flex h-9 items-center gap-1.5 rounded-full bg-warm-bg px-3 text-xs font-semibold text-warm"
        aria-label={`${queue.length} fiche(s) en attente d’envoi. Appuyer pour envoyer maintenant.`}
      >
        {syncing ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <CloudUpload className="size-4" aria-hidden />}
        {queue.length} à envoyer
      </button>
    )
  }
  if (!online) {
    return (
      <span className="flex h-9 items-center gap-1.5 rounded-full bg-warm-bg px-3 text-xs font-semibold text-warm">
        <WifiOff className="size-4" aria-hidden /> Hors ligne
      </span>
    )
  }
  return null
}

export function Layout() {
  const { logout } = useAuth()
  const { pathname } = useLocation()

  // Chaque page s'ouvre en haut (sinon la fiche garde le défilement de la liste).
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="min-h-dvh pb-24">
      <header className="no-print sticky top-0 z-20 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-brand text-sm font-bold text-brand-ink">P</span>
            <span className="font-bold tracking-tight">Prospection</span>
          </div>
          <div className="flex items-center gap-2">
            <SyncChip />
            <button
              type="button"
              onClick={logout}
              className="grid size-9 place-items-center rounded-full text-muted hover:bg-brand-soft"
              aria-label="Verrouiller l’application"
            >
              <LogOut className="size-5" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-5">
        <Outlet />
      </main>

      <nav
        aria-label="Navigation principale"
        className="no-print fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto grid max-w-5xl grid-cols-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold ${
                    isActive ? 'text-brand' : 'text-muted'
                  }`
                }
              >
                <Icon className="size-6" aria-hidden />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
