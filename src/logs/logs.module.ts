import { Module, forwardRef, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { LogsController } from './logs.controller';
import { LogsService } from './logs.service';
import { LogsMiddleware } from './logs.middleware';
import { GlobalLoggingMiddleware } from './global-logging.middleware';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { PrismaModule } from '../prisma/prisma.module';
import { TelegramModule } from '../telegram/telegram.module';

@Module({
  imports: [PrismaModule, forwardRef(() => TelegramModule)],
  controllers: [LogsController],
  providers: [LogsService, LogsMiddleware, GlobalLoggingMiddleware, LoggingInterceptor],
  exports: [LogsService, LogsMiddleware, GlobalLoggingMiddleware, LoggingInterceptor],
})
export class LogsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LogsMiddleware, GlobalLoggingMiddleware)
      .forRoutes('*'); // Aplicar a todas as rotas
  }
}
