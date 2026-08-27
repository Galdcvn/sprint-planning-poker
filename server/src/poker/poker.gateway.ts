import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  PokerService,
  POKER_VALUES,
  type PokerValue,
  type PokerRoom,
} from './poker.service.js';

function emitRoom(server: Server, room: PokerRoom) {
  server.to(room.id).emit('room:update', room);
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/',
})
export class PokerGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly pokerService: PokerService) {}

  @SubscribeMessage('room:create')
  handleRoomCreate(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { name?: string },
  ) {
    const room = this.pokerService.createRoom(body?.name);
    void client.join(room.id);
    return { roomId: room.id };
  }

  @SubscribeMessage('room:join')
  handleRoomJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: { roomId: string; user: { name: string; icon: string } },
  ) {
    const room = this.pokerService.getRoom(body.roomId);
    if (!room) return { ok: false, error: 'Sala não encontrada' };

    const user = {
      id: client.id,
      name: body.user.name,
      icon: body.user.icon,
      connected: true,
    };
    this.pokerService.addUser(room.id, user);
    client.data.roomId = room.id;
    void client.join(room.id);
    this.server.to(room.id).emit('room:update', room);
    return { ok: true };
  }

  @SubscribeMessage('room:leave')
  handleRoomLeave(@ConnectedSocket() client: Socket) {
    const room = this.pokerService.getRoom(client.data.roomId);
    if (room) {
      this.pokerService.removeUser(room.id, client.id);
      emitRoom(this.server, room);
      void client.leave(room.id);
    }
  }

  handleDisconnect(client: Socket) {
    const room = this.pokerService.getRoom(client.data.roomId);
    if (room) {
      this.pokerService.removeUser(room.id, client.id);
      emitRoom(this.server, room);
    }
  }

  @SubscribeMessage('task:create')
  handleTaskCreate(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; title: string; link?: string },
  ) {
    const room = this.pokerService.createTask(
      body.roomId,
      body.title,
      body.link,
      client.id,
    );
    if (!room) return { ok: false, error: 'Sala não encontrada' };
    emitRoom(this.server, room);
    return { ok: true };
  }

  @SubscribeMessage('task:vote')
  handleTaskVote(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    body: { roomId: string; taskId: string; value: PokerValue },
  ) {
    const room = this.pokerService.vote(
      body.roomId,
      body.taskId,
      client.id,
      body.value,
    );
    if (!room) return;
    emitRoom(this.server, room);
  }

  @SubscribeMessage('task:reveal')
  handleTaskReveal(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; taskId: string },
  ) {
    const room = this.pokerService.reveal(body.roomId, body.taskId);
    if (!room) return;
    emitRoom(this.server, room);
  }

  @SubscribeMessage('task:reset')
  handleTaskReset(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { roomId: string; taskId: string },
  ) {
    const room = this.pokerService.resetTask(body.roomId, body.taskId);
    if (!room) return;
    emitRoom(this.server, room);
  }

  @SubscribeMessage('rooms:list')
  handleRoomsList() {
    return this.pokerService.getRooms();
  }

  @SubscribeMessage('room:exists')
  handleRoomExists(@MessageBody() body: { roomId: string }) {
    const room = this.pokerService.getRoom(body.roomId);
    return { ok: !!room };
  }

  @SubscribeMessage('poker:values')
  handleValues() {
    return POKER_VALUES;
  }
}
