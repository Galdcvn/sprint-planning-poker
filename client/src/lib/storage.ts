import type { LocalUser } from './types'

const USER_KEY = 'planning-poker-user'

// Gera um id estável por sessão/dispositivo, usado como userId no back.
function generateUserId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  )
}

export function getLocalUser(): LocalUser | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as LocalUser
    if (!parsed.name || !parsed.icon) return null
    if (!parsed.userId) parsed.userId = generateUserId()
    return parsed
  } catch {
    return null
  }
}

export function saveLocalUser(user: LocalUser) {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user))
}

export { generateUserId }
