import type { Card } from '../poker.service.js';

export interface VoteInput {
  roomId: string;
  taskId: string;
  userId: string;
  card: Card;
}
