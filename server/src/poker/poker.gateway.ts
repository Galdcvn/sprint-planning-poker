import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PokerService } from './poker.service.js';
import type { CreateRoomInput } from './dto/create-room.dto.js';
import type { JoinRoomInput } from './dto/join-room.dto.js';
import type { LeaveRoomInput } from './dto/leave-room.dto.js';
import type { CreateTaskInput } from './dto/create-task.dto.js';
import type { VoteInput } from './dto/vote.dto.js';
import type { RevealTaskInput } from './dto/reveal-task.dto.js';
import type { ResetTaskInput } from './dto/reset-task.dto.js';
import type { DeleteTaskInput } from './dto/delete-task.dto.js';
import type { SelectTaskInput } from './dto/select-task.dto.js';
import type { RemovePlayerInput } from './dto/remove-player.dto.js';

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
    this.pokerService.setOnPlayerRemoved((roomId) => {
      this.emitRoomUpdate(roomId);
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
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomInput,
  ) {
    const { playerId, roomId } = this.pokerService.joinRoom(payload);
    client.join(roomId);
    this.pokerService.registerSocket(roomId, playerId, client.id);
    this.emitRoomUpdate(roomId);
    return { playerId, roomId };
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(@MessageBody() payload: LeaveRoomInput) {
    this.pokerService.leaveRoom(payload.roomId, payload.userId);
  }

  @SubscribeMessage('player:remove')
  handleRemovePlayer(@MessageBody() payload: RemovePlayerInput) {
    const kickedSocketIds = this.pokerService.removePlayerByCreator(
      payload.roomId,
      payload.userId,
      payload.targetUserId,
    );
    for (const socketId of kickedSocketIds) {
      const socket = this.server.sockets.sockets.get(socketId);
      socket?.leave(payload.roomId);
      socket?.emit('player:kicked', { roomId: payload.roomId });
    }
  }

  @SubscribeMessage('task:create')
  handleTaskCreate(@MessageBody() payload: CreateTaskInput) {
    this.pokerService.createTask(
      payload.roomId,
      payload.title,
      payload.link,
      payload.userId,
    );
    this.emitRoomUpdate(payload.roomId);
  }

  @SubscribeMessage('task:vote')
  handleTaskVote(@MessageBody() payload: VoteInput) {
    this.pokerService.vote(
      payload.roomId,
      payload.taskId,
      payload.userId,
      payload.card,
    );
    this.emitRoomUpdate(payload.roomId);
  }

  @SubscribeMessage('task:activate')
  handleTaskActivate(@MessageBody() payload: SelectTaskInput) {
    this.pokerService.activateTask(payload.roomId, payload.taskId);
    this.emitRoomUpdate(payload.roomId);
  }

  @SubscribeMessage('task:reveal')
  handleTaskReveal(@MessageBody() payload: RevealTaskInput) {
    this.pokerService.reveal(payload.roomId, payload.taskId);
    this.emitRoomUpdate(payload.roomId);
  }

  @SubscribeMessage('task:reset')
  handleTaskReset(@MessageBody() payload: ResetTaskInput) {
    this.pokerService.resetTask(payload.roomId, payload.taskId);
    this.emitRoomUpdate(payload.roomId);
  }

  @SubscribeMessage('task:delete')
  handleTaskDelete(@MessageBody() payload: DeleteTaskInput) {
    this.pokerService.deleteTask(payload.roomId, payload.taskId);
    this.emitRoomUpdate(payload.roomId);
  }

  private emitRoomUpdate(roomId: string): void {
    const room = this.pokerService.getRoom(roomId);
    if (room) {
      this.server.to(roomId).emit(
        'room:update',
        this.pokerService.getRoomView(room),
      );
    }
  }
}
