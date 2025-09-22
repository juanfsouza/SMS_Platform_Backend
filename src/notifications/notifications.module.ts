import { Module, forwardRef } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsExampleController } from './notifications.example';
import { TelegramModule } from '../telegram/telegram.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [
    forwardRef(() => TelegramModule),
    forwardRef(() => LogsModule),
  ],
  providers: [NotificationsService],
  controllers: [NotificationsController, NotificationsExampleController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
