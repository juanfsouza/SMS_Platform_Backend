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
  private readonly logger = new Logger(SmsController.name);

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
  async getStatus(@Param('activationId') activationId: string, @Req() req): Promise<any> {
    const userId = req.user.id;
    const status = await this.smsService.getActivationStatus(activationId);

    // Parsear o status usando StatusDto
    const parsedStatus = StatusDto.parse(status);

    // Buscar informações adicionais do banco de dados
    const activation = await this.prismaService.smsActivation.findUnique({
      where: { activationId },
      include: { transactions: true },
    });

    if (!activation || activation.userId !== userId) {
      throw new NotFoundException(`No SmsActivation record found for activationId: ${activationId}`);
    }

    // Montar a resposta no formato desejado
    return {
      status: parsedStatus.status,
      array: [
        {
          id: activation.activationId,
          userid: activation.userId.toString(),
          service: activation.service,
          phone: activation.number,
          cost: activation.transactions.find((t) => t.type === 'DEBIT')?.amount || 0,
          status: parsedStatus.status === 'success' ? '2' : parsedStatus.status === 'pending' ? '1' : '8',
          moreCodes: Buffer.from(JSON.stringify([parsedStatus.code])).toString('base64'),
          moreSms: Buffer.from(
            JSON.stringify([parsedStatus.code ? `${parsedStatus.code} é seu código de ${activation.service}. Não o compartilhe.` : '']),
          ).toString('base64'),
          createDate: Math.floor(activation.createdAt.getTime() / 1000),
          receiveSmsDate: parsedStatus.code ? Math.floor(Date.now() / 1000) : 0,
          estDate: Math.floor(activation.createdAt.getTime() / 1000 + 3600),
          finishDate: parsedStatus.status === 'success' ? -62169993017 : 0,
          forward: '0',
          ref: '0',
          country: activation.country,
          addSms: '1',
          countryCode: activation.country,
          activationType: '0',
          currency: 840,
          code: parsedStatus.code || '',
          smsText: parsedStatus.code ? `${parsedStatus.code} é seu código de ${activation.service}. Não o compartilhe.` : '',
          seconds: 3600,
          operator: null,
          hint: 0,
          name: `${activation.service}+Threads`,
        },
      ],
      time: new Date().toISOString().slice(0, 19).replace('T', ' '),
      stat: [],
      quant: 1,
      totalCount: 1,
      order: 'id',
      orderBy: 'desc',
      needSound: false,
      currentTime: Math.floor(Date.now() / 1000),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('activations/recent')
  async getRecentActivations(@Req() req) {
    const userId = req.user.id;
    return this.smsService.getRecentActivations(userId);
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
        const debitTransaction = activation.transactions.find(
          (t) => t.type === 'DEBIT' && t.status === 'COMPLETED' && t.smsActivationId === activation.id,
        );
        if (debitTransaction && debitTransaction.amount > 0) {
          await this.prismaService.$transaction([
            this.prismaService.user.update({
              where: { id: activation.userId },
              data: { balance: { increment: debitTransaction.amount } },
            }),
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
}