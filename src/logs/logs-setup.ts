import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { LogsMiddleware } from './logs.middleware';

export class LogsSetupModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(LogsMiddleware)
      .forRoutes('*'); // Aplicar a todos os routes
  }
}

// Para usar no app.module.ts:
// imports: [
//   // ... outros módulos
//   LogsModule,
//   LogsSetupModule,
// ]
