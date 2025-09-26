import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { SmsModule } from './sms/sms.module';
import { PaymentsModule } from './payments/payments.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CreditsModule } from './credits/credits.module';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AffiliateModule } from './affiliate/affiliate.module';
import { EmailModule } from './email/email.module';
import configuration from './config/configuration';
import { TurnstileModule } from './turnstile/turnstile.module';
import { AdminController } from './admin/admin.controller';
import { AdminService } from './admin/admin.service';
import { AdminModule } from './admin/admin.module';
import { LogsModule } from './logs/logs.module';
import { TelegramModule } from './telegram/telegram.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
      },
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 17,
        },
      ],
    }),
    SmsModule,
    TurnstileModule,
    PaymentsModule,
    AuthModule,
    UsersModule,
    CreditsModule,
    PrismaModule,
    CommonModule,
    AffiliateModule,
    EmailModule,
    AdminModule,
    LogsModule,
    TelegramModule,
    NotificationsModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    AdminService,
  ],
  controllers: [AdminController],
})
export class AppModule {}