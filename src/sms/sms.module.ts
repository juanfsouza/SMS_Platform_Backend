import { Module } from '@nestjs/common';
import { SmsController } from './sms.controller';
import { SmsService } from './sms.service';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { CreditsModule } from '../credits/credits.module';

@Module({
  imports: [HttpModule, PrismaModule, ConfigModule, CreditsModule],
  controllers: [SmsController],
  providers: [SmsService],
})
export class SmsModule {}