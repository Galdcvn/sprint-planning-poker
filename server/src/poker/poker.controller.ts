import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
} from '@nestjs/common';
import { PokerService } from './poker.service.js';
import type { CreateRoomInput } from './dto/create-room.dto.js';

@Controller('rooms')
export class PokerController {
  constructor(private readonly pokerService: PokerService) {}

  @Post()
  createRoom(@Body() body: CreateRoomInput) {
    return this.pokerService.createRoom(body);
  }

  @Get()
  getRooms() {
    return this.pokerService.getRooms();
  }

  @Get(':id')
  getRoom(@Param('id') id: string) {
    const room = this.pokerService.getRoom(id);
    if (!room) {
      throw new NotFoundException('Sala não encontrada.');
    }
    return this.pokerService.getRoomView(room);
  }
}
