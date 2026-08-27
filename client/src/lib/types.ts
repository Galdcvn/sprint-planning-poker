export const CARDS = [0, 1, 2, 3, 5, 8, 13, 21, 34] as const
export type CardNumber = (typeof CARDS)[number]

// Carta permitida numa votação: um número da sequência ou '?' (não sei).
export type Card = CardNumber | '🍌'

// Estado do voto visto pelo cliente. Antes de revelar, o back envia 'hidden'
// para quem já votou; só após `revealed: true` o valor real aparece.
export type VoteStatus = Card | 'hidden' | null

export interface Player {
  id: string
  name: string
  icon: string
  connected: boolean
}

export interface Task {
  id: string
  title: string
  link?: string
  votes: Record<string, VoteStatus>
  revealed: boolean
  result: number | null
  createdBy: string
}

export interface Room {
  id: string
  name: string
  createdAt: string
  players: Player[]
  tasks: Task[]
  activeTaskId: string | null
}

// Usuário local salvo na sessão.
export interface LocalUser {
  name: string
  icon: string
  userId: string
}
