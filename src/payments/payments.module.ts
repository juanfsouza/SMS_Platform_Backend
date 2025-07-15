import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { AffiliateModule } from '../affiliate/affiliate.module';

@Module({
  imports: [HttpModule, PrismaModule, ConfigModule, AffiliateModule], 
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}