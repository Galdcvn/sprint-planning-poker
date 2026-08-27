import { Module } from '@nestjs/common';
import { ClickupController } from './clickup.controller.js';

@Module({
  controllers: [ClickupController],
})
export class ClickupModule {}
