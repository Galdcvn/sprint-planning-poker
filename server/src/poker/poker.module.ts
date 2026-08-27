import { Module } from '@nestjs/common';
import { PokerController } from './poker.controller.js';
import { PokerGateway } from './poker.gateway.js';
import { PokerService } from './poker.service.js';

@Module({
  controllers: [PokerController],
  providers: [PokerService, PokerGateway],
  exports: [PokerService],
})
export class PokerModule {}
