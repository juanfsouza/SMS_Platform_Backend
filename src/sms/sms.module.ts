import { Module } from '@nestjs/common';
import { SmsController } from './sms.controller';
import { SmsService } from './sms.service';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { CreditsModule } from '../credits/credits.module';
import { CreditsService } from 'src/credits/credits.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CountryMapService } from './country-map.service';

@Module({
  imports: [HttpModule, PrismaModule, ConfigModule, CreditsModule],
  controllers: [SmsController],
  providers: [SmsService, PrismaService, CreditsService, CountryMapService],
})
export class SmsModule {}