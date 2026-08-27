import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { PokerService } from './poker.service.js';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class PokerGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly pokerService: PokerService) {}

  @SubscribeMessage('rooms:list')
  handleRoomsList() {
    return this.pokerService.getRooms();
  }
}
