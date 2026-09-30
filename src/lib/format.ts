const SENEGAL_PREFIX = '221'
const LOCAL_NUMBER_LENGTH = 9
const MIN_INTERNATIONAL_LENGTH = 10

// Chiffres seulement, préfixe pays ajouté pour un numéro local à 9 chiffres.
function internationalDigits(phone: string | null | undefined): string | null {
  if (!phone) return null
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.length === LOCAL_NUMBER_LENGTH) digits = SENEGAL_PREFIX + digits
  return digits.length >= MIN_INTERNATIONAL_LENGTH ? digits : null
}

export function waLink(phone: string | null | undefined): string | null {
  const digits = internationalDigits(phone)
  return digits ? `https://wa.me/${digits}` : null
}

export function telLink(phone: string | null | undefined): string | null {
  const digits = internationalDigits(phone)
  return digits ? `tel:+${digits}` : null
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function fcfa(amount: number): string {
  return `${Math.round(amount).toLocaleString('fr-FR')} FCFA`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}
