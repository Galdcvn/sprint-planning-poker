import type { LocalUser } from './types'

const USER_KEY = 'planning-poker-user'

export function getLocalUser(): LocalUser | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as LocalUser
    if (!parsed.name || !parsed.icon) return null
    return parsed
  } catch {
    return null
  }
}

export function saveLocalUser(user: LocalUser) {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user))
}
