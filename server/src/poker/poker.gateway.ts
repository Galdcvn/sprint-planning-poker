import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PokerService } from './poker.service.js';
import type { CreateRoomInput } from './dto/create-room.dto.js';
import type { JoinRoomInput } from './dto/join-room.dto.js';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class PokerGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly pokerService: PokerService) {}

  afterInit() {
    this.pokerService.setOnPlayerRemoved((roomId, players) => {
      this.server.to(roomId).emit('room:players-updated', players);
    });
  }

  handleDisconnect(socket: Socket) {
    this.pokerService.unregisterSocket(socket.id);
  }

  @SubscribeMessage('rooms:list')
  handleRoomsList() {
    return this.pokerService.getRooms();
  }

  @SubscribeMessage('createRoom')
  handleCreateRoom(@MessageBody() payload: CreateRoomInput) {
    const { roomId, userId } = this.pokerService.createRoom(payload);
    this.server.emit('rooms:list', this.pokerService.getRooms());
    return { roomId, userId };
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(client: Socket, @MessageBody() payload: JoinRoomInput) {
    const { playerId, roomId } = this.pokerService.joinRoom(payload);
    client.join(roomId);
    this.pokerService.registerSocket(roomId, playerId, client.id);

    const room = this.pokerService.getRoom(roomId);
    if (room) {
      client.to(roomId).emit(
        'room:players-updated',
        this.pokerService.getPlayersView(room),
      );
    }
    return { playerId, roomId };
  }
}
