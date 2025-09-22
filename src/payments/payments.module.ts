import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AffiliateModule } from '../affiliate/affiliate.module';
import { LogsModule } from '../logs/logs.module';
import { ConfigModule } from '@nestjs/config';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    HttpModule.register({ timeout: 30000 }),
    PrismaModule,
    AffiliateModule,
    LogsModule,
    ConfigModule,
    forwardRef(() => NotificationsModule),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}