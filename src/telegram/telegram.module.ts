import { Module, forwardRef } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { LogsModule } from '../logs/logs.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [forwardRef(() => LogsModule), ConfigModule],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
