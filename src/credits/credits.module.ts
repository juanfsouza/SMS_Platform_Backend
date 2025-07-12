import { Module } from '@nestjs/common';
import { CreditsController } from './credits.controller';
import { CreditsService } from './credits.service';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { CountryMapService } from 'src/sms/country-map.service';

@Module({
  imports: [HttpModule, PrismaModule, ConfigModule],
  controllers: [CreditsController],
  providers: [CreditsService, PrismaService, CountryMapService],
  exports: [CreditsService],
})
export class CreditsModule {}