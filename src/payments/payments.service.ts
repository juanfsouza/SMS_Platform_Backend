import { Injectable, BadRequestException, Logger, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { createHmac } from 'crypto';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async handlePaymentWebhook(payload: any, signature: string) {
    const webhookSecret = this.configService.get('pushinpay.webhookSecret');
    const expectedSignature = createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    if (signature !== expectedSignature) {
      this.logger.error('Invalid webhook signature');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const { id, status, value, userId } = payload;
    if (status !== 'paid') {
      this.logger.log(`Webhook received, but status is ${status}. No action taken.`);
      return { status: 'received' };
    }

    try {
      const amount = parseFloat(value);
      const transaction = await this.prisma.$transaction([
        this.prisma.transaction.create({
          data: {
            userId,
            amount,
            type: 'CREDIT',
            status: 'COMPLETED',
          },
        }),
        this.prisma.user.update({
          where: { id: userId },
          data: { balance: { increment: amount } },
        }),
      ]);

      this.logger.log(`Credits added: ${amount} for user ${userId}`);
      return {
        transactionId: transaction[0].id,
        amount,
        status: 'processed',
      };
    } catch (error) {
      this.logger.error(`Failed to process webhook: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to process webhook: ${error.message}`);
    }
  }

  async createCheckoutLink(userId: number, amount: number): Promise<string> {
    const apiKey = this.configService.get('pushinpay.apiKey');
    const apiUrl = 'https://api.pushinpay.com.br/v1/pix/cashIn';
    try {
      const response = await lastValueFrom(
        this.httpService.post(
          apiUrl,
          {
            value: amount,
            webhook_url: 'https://your-domain.com/payments/webhook',
            userId,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      this.logger.log(`PushinPay API response: ${JSON.stringify(response.data)}`);
      return response.data.qr_code_url || response.data.payment_url; // Adjust based on PushinPay response
    } catch (error) {
      this.logger.error(`Failed to create checkout link: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to create checkout link: ${error.message}`);
    }
  }
}