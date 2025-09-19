import { Module, forwardRef } from '@nestjs/common';
import { LogsController } from './logs.controller';
import { LogsService } from './logs.service';
import { LogsMiddleware } from './logs.middleware';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { PrismaModule } from '../prisma/prisma.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [PrismaModule, forwardRef(() => TelegramModule)],
  controllers: [LogsController],
  providers: [LogsService, LogsMiddleware, LoggingInterceptor],
  exports: [LogsService, LogsMiddleware, LoggingInterceptor],
})
export class LogsModule {}
