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
  createdBy: string
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

// Dados retornados pela API do ClickUp (subset usado no modal de detalhes).
export interface ClickUpUser {
  id: number
  username: string
  email?: string
  profilePicture?: string
}

export interface ClickUpTaskDetails {
  id: string
  name?: string
  description?: string | null
  text_content?: string | null
  status?: { status?: string; color?: string }
  tags?: { name?: string; tag_fg?: string; tag_bg?: string }[]
  assignees?: ClickUpUser[]
  creator?: ClickUpUser
  points?: number | null
  priority?: { priority?: string; color?: string } | null
  due_date?: string | null
  start_date?: string | null
  url?: string
  list?: { id?: string; name?: string }
  space?: { id?: string; name?: string }
  custom_fields?: { id: string; name?: string; type?: string; value?: unknown }[]
}
