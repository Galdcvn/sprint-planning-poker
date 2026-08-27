import { Injectable } from '@nestjs/common';

export interface PokerRoom {
  id: string;
  name: string;
  createdAt: Date;
}

@Injectable()
export class PokerService {
  private readonly rooms = new Map<string, PokerRoom>();

  getRooms(): PokerRoom[] {
    return [...this.rooms.values()];
  }

  getRoom(id: string): PokerRoom | undefined {
    return this.rooms.get(id);
  }
}
