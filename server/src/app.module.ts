import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PokerModule } from './poker/poker.module.js';
import { ClickupModule } from './clickup/clickup.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../.env', '.env'],
    }),
    PokerModule,
    ClickupModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
