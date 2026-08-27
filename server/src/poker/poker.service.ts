import { Injectable } from '@nestjs/common';

export const POKER_VALUES = [0, 1, 2, 3, 5, 8, 13, 21] as const;
export type PokerValue = (typeof POKER_VALUES)[number];

export interface PokerUser {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
}

export interface PokerTask {
  id: string;
  title: string;
  link?: string;
  votes: Record<string, PokerValue | null>;
  revealed: boolean;
  result: number | null;
  createdBy: string;
}

export interface PokerRoom {
  id: string;
  name: string;
  createdAt: Date;
  users: Record<string, PokerUser>;
  tasks: PokerTask[];
  activeTaskId: string | null;
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function average(values: PokerValue[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return Math.round(sum / values.length);
}

function makeTask(title: string, link: string | undefined, createdBy: string): PokerTask {
  return {
    id: randomId(),
    title,
    link,
    votes: {},
    revealed: false,
    result: null,
    createdBy,
  };
}

@Injectable()
export class PokerService {
  private readonly rooms = new Map<string, PokerRoom>();

  createRoom(name?: string): PokerRoom {
    let id: string;
    do {
      id = randomId();
    } while (this.rooms.has(id));

    const room: PokerRoom = {
      id,
      name: name || `Sala ${id}`,
      createdAt: new Date(),
      users: {},
      tasks: [],
      activeTaskId: null,
    };
    this.rooms.set(id, room);
    return room;
  }

  getRoom(id: string): PokerRoom | undefined {
    return this.rooms.get(id);
  }

  getRooms(): PokerRoom[] {
    return [...this.rooms.values()];
  }

  addUser(roomId: string, user: PokerUser): PokerRoom | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    room.users[user.id] = user;
    for (const task of room.tasks) {
      if (task.votes[user.id] === undefined) {
        task.votes[user.id] = null;
      }
    }
    return room;
  }

  removeUser(roomId: string, userId: string): PokerRoom | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    const user = room.users[userId];
    if (!user) return room;
    user.connected = false;
    return room;
  }

  createTask(roomId: string, title: string, link: string | undefined, userId: string): PokerRoom | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    const task = makeTask(title, link, userId);
    for (const user of Object.keys(room.users)) {
      task.votes[user] = null;
    }
    room.tasks.push(task);
    room.activeTaskId = task.id;
    return room;
  }

  vote(roomId: string, taskId: string, userId: string, value: PokerValue): PokerRoom | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    const task = room.tasks.find((t) => t.id === taskId);
    if (!task || task.revealed) return room;
    if (!room.users[userId]) return room;
    task.votes[userId] = value;
    return room;
  }

  reveal(roomId: string, taskId: string): PokerRoom | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    const task = room.tasks.find((t) => t.id === taskId);
    if (!task || task.revealed) return room;
    const values = Object.values(task.votes).filter(
      (v): v is PokerValue => v !== null,
    );
    task.result = average(values);
    task.revealed = true;
    return room;
  }

  resetTask(roomId: string, taskId: string): PokerRoom | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    const task = room.tasks.find((t) => t.id === taskId);
    if (!task) return room;
    task.votes = {};
    for (const user of Object.keys(room.users)) {
      task.votes[user] = null;
    }
    task.revealed = false;
    task.result = null;
    return room;
  }
}
