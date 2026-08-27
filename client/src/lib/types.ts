export const POKER_VALUES = [0, 1, 2, 3, 5, 8, 13, 21] as const
export type PokerValue = (typeof POKER_VALUES)[number]

export interface PokerUser {
  id: string
  name: string
  icon: string
  connected: boolean
}

export interface PokerTask {
  id: string
  title: string
  link?: string
  votes: Record<string, PokerValue | null>
  revealed: boolean
  result: number | null
  createdBy: string
}

export interface PokerRoom {
  id: string
  name: string
  createdAt: string
  users: Record<string, PokerUser>
  tasks: PokerTask[]
  activeTaskId: string | null
}

export interface LocalUser {
  name: string
  icon: string
}
