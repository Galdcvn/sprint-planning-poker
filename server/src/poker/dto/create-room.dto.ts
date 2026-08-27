export interface CreateRoomInput {
  name: string;
  userId?: string;
}

export interface CreateRoomResult {
  roomId: string;
  userId: string;
}
