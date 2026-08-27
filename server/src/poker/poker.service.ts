import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { CreateRoomInput, CreateRoomResult } from './dto/create-room.dto.js';
import type { JoinRoomInput } from './dto/join-room.dto.js';

export const CARDS = [0, 1, 2, 3, 5, 8, 13, 21, 34] as const;
export type CardNumber = (typeof CARDS)[number];
export type Card = CardNumber | '?' | null;

export interface Player {
  id: string;
  name: string;
  icon: string;
  card: Card;
  connected: boolean;
}

export interface Task {
  id: string;
  title: string;
  link?: string;
  votes: Map<string, Card>;
  revealed: boolean;
  result: number | null;
  createdBy: string;
}

export interface PokerRoom {
  id: string;
  name: string;
  createdAt: Date;
  players: Map<string, Player>;
  tasks: Task[];
  activeTaskId: string | null;
}

export interface PlayerView {
  id: string;
  name: string;
  icon: string;
  connected: boolean;
}

export type VoteStatus = Card | 'hidden';

export interface TaskView {
  id: string;
  title: string;
  link?: string;
  votes: Record<string, VoteStatus>;
  revealed: boolean;
  result: number | null;
  createdBy: string;
}

export interface RoomView {
  id: string;
  name: string;
  createdAt: Date;
  players: PlayerView[];
  tasks: TaskView[];
  activeTaskId: string | null;
}

export interface RoomSummary {
  id: string;
  name: string;
  playersCount: number;
}

interface SocketBinding {
  roomId: string;
  userId: string;
}

type PlayerRemovedCallback = (roomId: string) => void;

const DEFAULT_DISCONNECT_TIMEOUT_MS = 60_000;

function average(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, v) => acc + v, 0);
  return Math.round(sum / values.length);
}

@Injectable()
export class PokerService {
  private readonly rooms = new Map<string, PokerRoom>();
  private readonly socketBindings = new Map<string, SocketBinding>();
  private readonly activeSockets = new Map<string, Map<string, number>>();
  private readonly disconnectTimers = new Map<string, NodeJS.Timeout>();
  private readonly disconnectTimeoutMs: number;
  private onPlayerRemoved?: PlayerRemovedCallback;

  constructor() {
    const raw = Number(process.env.POKER_DISCONNECT_TIMEOUT_MS);
    this.disconnectTimeoutMs =
      Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_DISCONNECT_TIMEOUT_MS;
  }

  getRooms(): RoomSummary[] {
    return [...this.rooms.values()].map((room) => ({
      id: room.id,
      name: room.name,
      playersCount: room.players.size,
    }));
  }

  getRoom(id: string): PokerRoom | undefined {
    return this.rooms.get(id);
  }

  getRoomView(room: PokerRoom): RoomView {
    return {
      id: room.id,
      name: room.name,
      createdAt: room.createdAt,
      players: this.getPlayersView(room),
      tasks: room.tasks.map((task) => this.toTaskView(task)),
      activeTaskId: room.activeTaskId,
    };
  }

  getPlayersView(room: PokerRoom): PlayerView[] {
    return [...room.players.values()].map((player) => ({
      id: player.id,
      name: player.name,
      icon: player.icon,
      connected: player.connected,
    }));
  }

  createRoom(input: CreateRoomInput): CreateRoomResult {
    const name = this.normalizeName(input.name);
    const roomId = randomUUID();
    const userId = this.resolveUserId(input.userId);

    const room: PokerRoom = {
      id: roomId,
      name,
      createdAt: new Date(),
      players: new Map(),
      tasks: [],
      activeTaskId: null,
    };
    this.rooms.set(roomId, room);

    return { roomId, userId };
  }

  joinRoom(input: JoinRoomInput): { playerId: string; roomId: string } {
    const room = this.requireRoom(input.roomId);

    const name = this.normalizeName(input.name);
    const userId = this.resolveUserId(input.userId);
    const icon = input.icon?.trim() ?? '';

    const existing = room.players.get(userId);
    if (existing) {
      existing.name = name;
      existing.icon = icon;
      existing.connected = true;
    } else {
      room.players.set(userId, {
        id: userId,
        name,
        icon,
        card: null,
        connected: true,
      });
    }

    return { playerId: userId, roomId: room.id };
  }

  createTask(
    roomId: string,
    title: string,
    link: string | undefined,
    userId: string,
  ): void {
    const room = this.requireRoom(roomId);
    const task: Task = {
      id: randomUUID(),
      title: this.normalizeName(title),
      link,
      votes: new Map(),
      revealed: false,
      result: null,
      createdBy: userId,
    };
    for (const playerId of room.players.keys()) {
      task.votes.set(playerId, null);
    }
    room.tasks.push(task);
    room.activeTaskId = task.id;
  }

  vote(roomId: string, taskId: string, userId: string, card: Card): void {
    const room = this.requireRoom(roomId);
    const task = room.tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new BadRequestException('Tarefa não encontrada.');
    }
    if (task.revealed) {
      throw new BadRequestException('Tarefa já revelada.');
    }
    if (!room.players.has(userId)) {
      throw new BadRequestException('Jogador não está na sala.');
    }
    if (card !== null && card !== '?' && !CARDS.includes(card)) {
      throw new BadRequestException('Carta inválida.');
    }
    task.votes.set(userId, card);
  }

  reveal(roomId: string, taskId: string): void {
    const room = this.requireRoom(roomId);
    const task = room.tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new BadRequestException('Tarefa não encontrada.');
    }
    if (task.revealed) return;

    const values = [...task.votes.values()].filter(
      (value): value is CardNumber => typeof value === 'number',
    );
    task.result = average(values);
    task.revealed = true;
  }

  resetTask(roomId: string, taskId: string): void {
    const room = this.requireRoom(roomId);
    const task = room.tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new BadRequestException('Tarefa não encontrada.');
    }
    task.votes.clear();
    for (const playerId of room.players.keys()) {
      task.votes.set(playerId, null);
    }
    task.revealed = false;
    task.result = null;
  }

  deleteTask(roomId: string, taskId: string): void {
    const room = this.requireRoom(roomId);
    const index = room.tasks.findIndex((t) => t.id === taskId);
    if (index === -1) {
      throw new BadRequestException('Tarefa não encontrada.');
    }
    const [removed] = room.tasks.splice(index, 1);
    if (room.activeTaskId === removed.id) {
      room.activeTaskId =
        room.tasks.length > 0 ? room.tasks[room.tasks.length - 1].id : null;
    }
  }

  leaveRoom(roomId: string, userId: string): void {
    this.removePlayer(roomId, userId);
  }

  registerSocket(roomId: string, userId: string, socketId: string): void {
    this.socketBindings.set(socketId, { roomId, userId });

    let perRoom = this.activeSockets.get(roomId);
    if (!perRoom) {
      perRoom = new Map<string, number>();
      this.activeSockets.set(roomId, perRoom);
    }
    perRoom.set(userId, (perRoom.get(userId) ?? 0) + 1);

    this.cancelDisconnectTimer(roomId, userId);
  }

  unregisterSocket(socketId: string): void {
    const binding = this.socketBindings.get(socketId);
    if (!binding) return;
    this.socketBindings.delete(socketId);

    const { roomId, userId } = binding;
    const perRoom = this.activeSockets.get(roomId);
    if (!perRoom) return;

    const count = (perRoom.get(userId) ?? 0) - 1;
    if (count <= 0) {
      perRoom.delete(userId);
      if (perRoom.size === 0) {
        this.activeSockets.delete(roomId);
      }
      this.startDisconnectTimer(roomId, userId);
    } else {
      perRoom.set(userId, count);
    }
  }

  setOnPlayerRemoved(callback: PlayerRemovedCallback): void {
    this.onPlayerRemoved = callback;
  }

  private startDisconnectTimer(roomId: string, userId: string): void {
    const key = this.playerKey(roomId, userId);
    this.cancelDisconnectTimer(roomId, userId);

    const timer = setTimeout(() => {
      this.removePlayer(roomId, userId);
    }, this.disconnectTimeoutMs);
    this.disconnectTimers.set(key, timer);
  }

  private cancelDisconnectTimer(roomId: string, userId: string): void {
    const key = this.playerKey(roomId, userId);
    const timer = this.disconnectTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.disconnectTimers.delete(key);
    }
  }

  private removePlayer(roomId: string, userId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const wasRemoved = room.players.delete(userId);
    for (const task of room.tasks) {
      task.votes.delete(userId);
    }

    const perRoom = this.activeSockets.get(roomId);
    if (perRoom) {
      perRoom.delete(userId);
      if (perRoom.size === 0) {
        this.activeSockets.delete(roomId);
      }
    }
    this.cancelDisconnectTimer(roomId, userId);

    if (wasRemoved && this.onPlayerRemoved) {
      this.onPlayerRemoved(roomId);
    }
  }

  private toTaskView(task: Task): TaskView {
    const votes: Record<string, VoteStatus> = {};
    for (const [userId, card] of task.votes) {
      votes[userId] = task.revealed ? card : card !== null ? 'hidden' : null;
    }
    return {
      id: task.id,
      title: task.title,
      link: task.link,
      votes,
      revealed: task.revealed,
      result: task.result,
      createdBy: task.createdBy,
    };
  }

  private requireRoom(id: string): PokerRoom {
    const room = this.rooms.get(id);
    if (!room) {
      throw new BadRequestException('Sala não encontrada.');
    }
    return room;
  }

  private playerKey(roomId: string, userId: string): string {
    return `${roomId}:${userId}`;
  }

  private resolveUserId(userId?: string): string {
    const trimmed = userId?.trim();
    return trimmed && trimmed.length > 0 ? trimmed : randomUUID();
  }

  private normalizeName(name: string): string {
    const trimmed = (name ?? '').trim();
    if (!trimmed) {
      throw new BadRequestException('Nome é obrigatório.');
    }
    return trimmed;
  }
}
