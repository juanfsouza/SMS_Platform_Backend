import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class PaymentsService {
  private readonly apiUrl = 'https://api.pushinpay.com/v1/payments';
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async createPayment(userId: number, amount: number) {
    const apiKey = this.configService.get('pushinpay.apiKey');
    try {
      const transaction = await this.prisma.transaction.create({
        data: {
          userId,
          amount,
          type: 'CREDIT',
          status: 'PENDING',
        },
      });

      const response = await lastValueFrom(
        this.httpService.post(
          this.apiUrl,
          {
            amount,
            currency: 'BRL',
            description: 'Recarga de créditos',
            userId,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          },
        ),
      );
      this.logger.log(`PushinPay API response: ${JSON.stringify(response.data)}`);

      await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: userId },
          data: { balance: { increment: amount } },
        }),
        this.prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: 'COMPLETED' },
        }),
      ]);

      return {
        transactionId: transaction.id,
        amount,
        paymentDetails: response.data,
      };
    } catch (error) {
      this.logger.error(`Failed to create payment: ${error.message}`, error.stack);
      if (error.response?.status === 404) {
        throw new BadRequestException('PushinPay API endpoint not found. Please check the API URL.');
      }
      if (error.response?.data?.message) {
        throw new BadRequestException(`PushinPay API error: ${error.response.data.message}`);
      }
      throw new BadRequestException(`Failed to create payment: ${error.message}`);
    }
  }
}