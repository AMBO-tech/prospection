// localStorage peut lever une exception (navigation privée, quota plein) :
// chaque accès est protégé pour que l'app reste utilisable sans persistance.
export const STORAGE_KEYS = {
  code: 'prospection.code',
  draft: 'prospection.draft.v1',
  interviewer: 'prospection.interviewer',
} as const

export function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // quota plein ou stockage indisponible : on continue sans persistance
  }
}

export function removeStorage(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    // rien à faire
  }
}
