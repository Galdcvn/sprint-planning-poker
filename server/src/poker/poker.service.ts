import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { CreateRoomInput, CreateRoomResult } from './dto/create-room.dto.js';
import type { JoinRoomInput } from './dto/join-room.dto.js';

export const CARDS = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '?'] as const;
export type Card = (typeof CARDS)[number] | null;

export interface Player {
  id: string;
  name: string;
  card: Card;
}

export interface PokerRoom {
  id: string;
  name: string;
  createdAt: Date;
  players: Map<string, Player>;
}

export interface PlayerView {
  id: string;
  name: string;
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

type PlayerRemovedCallback = (roomId: string, players: PlayerView[]) => void;

const DEFAULT_DISCONNECT_TIMEOUT_MS = 60_000;

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

  getPlayersView(room: PokerRoom): PlayerView[] {
    return [...room.players.values()].map((player) => ({
      id: player.id,
      name: player.name,
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
    };
    this.rooms.set(roomId, room);

    return { roomId, userId };
  }

  joinRoom(input: JoinRoomInput): { playerId: string; roomId: string } {
    const room = this.rooms.get(input.roomId);
    if (!room) {
      throw new BadRequestException('Sala não encontrada.');
    }

    const name = this.normalizeName(input.name);
    const userId = this.resolveUserId(input.userId);

    const existing = room.players.get(userId);
    if (existing) {
      existing.name = name;
    } else {
      room.players.set(userId, { id: userId, name, card: null });
    }

    return { playerId: userId, roomId: room.id };
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

    const perRoom = this.activeSockets.get(roomId);
    if (perRoom) {
      perRoom.delete(userId);
      if (perRoom.size === 0) {
        this.activeSockets.delete(roomId);
      }
    }
    this.cancelDisconnectTimer(roomId, userId);

    if (wasRemoved && this.onPlayerRemoved) {
      this.onPlayerRemoved(roomId, this.getPlayersView(room));
    }
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
