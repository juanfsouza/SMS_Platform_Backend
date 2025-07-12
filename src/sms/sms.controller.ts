import { Controller, Get, Post, Body, Query, Param, UseGuards, Req, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { SmsService } from './sms.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PrismaService } from '../prisma/prisma.service';
import { BuySmsDto } from './dtos/buy-sms.dto';
import { WebhookDto } from './dtos/webhook.dto';
import { StatusDto } from './dtos/status.dto';

@Controller('sms')
export class SmsController {
  constructor(
    private readonly smsService: SmsService,
    private readonly prismaService: PrismaService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('numbers-status')
  async getNumbersStatus(@Query('country') country: string, @Query('operator') operator: string) {
    return this.smsService.getNumbersStatus(country, operator);
  }

  @UseGuards(JwtAuthGuard)
  @Post('buy')
  async buyNumber(@Body(new ZodValidationPipe(BuySmsDto)) body: BuySmsDto, @Req() req) {
    const userId = req.user.id;
    return this.smsService.getNumber(body.service, body.country, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('status/:activationId')
  async getStatus(@Param('activationId') activationId: string): Promise<StatusDto> {
    const status = await this.smsService.getActivationStatus(activationId);
    return StatusDto.parse(status);
  }

  @Post('webhook')
  async handleWebhook(@Body(new ZodValidationPipe(WebhookDto)) body: WebhookDto) {
    const { activationId, status, code } = body;
    try {
      const activation = await this.prismaService.smsActivation.findUnique({
        where: { activationId },
        include: { transactions: true },
      });
      if (!activation) {
        throw new NotFoundException(`No SmsActivation record found for activationId: ${activationId}`);
      }

      const updateData: any = {
        status: status === '6' ? 'COMPLETED' : status === '8' ? 'CANCELLED' : 'PENDING',
        code: code || null,
      };

      if (status === '8') {
        // Find the DEBIT transaction associated with this activation
        const debitTransaction = activation.transactions.find(
          (t) => t.type === 'DEBIT' && t.status === 'COMPLETED' && t.smsActivationId === activation.id,
        );
        if (debitTransaction && debitTransaction.amount > 0) {
          await this.prismaService.$transaction([
            // Refund credits to user
            this.prismaService.user.update({
              where: { id: activation.userId },
              data: { balance: { increment: debitTransaction.amount } },
            }),
            // Record refund transaction
            this.prismaService.transaction.create({
              data: {
                userId: activation.userId,
                amount: debitTransaction.amount,
                type: 'REFUNDED',
                status: 'COMPLETED',
                description: `Refund for SMS activation: ${activation.service} (${activation.country})`,
                smsActivationId: activation.id,
              },
            }),
            this.prismaService.transaction.update({
              where: { id: debitTransaction.id },
              data: { status: 'REFUNDED' },
            }),
            this.prismaService.smsActivation.update({
              where: { activationId },
              data: updateData,
            }),
          ]);
          this.logger.log(`Refunded ${debitTransaction.amount} credits for activation ${activationId}`);
        } else {
          await this.prismaService.smsActivation.update({
            where: { activationId },
            data: updateData,
          });
        }
      } else {
        await this.prismaService.smsActivation.update({
          where: { activationId },
          data: updateData,
        });
      }

      return { status: 'received' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to process webhook: ' + error.message);
    }
  }

  private readonly logger = new Logger(SmsController.name);
}