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
    // Usar ActiveSMS em vez do SMS-Activate
    return this.smsService.buyActiveSmsNumber(body.service, body.country, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('status/:activationId')
  async getStatus(@Param('activationId') activationId: string, @Req() req): Promise<any> {
    const userId = req.user.id;
    
    // Usar ActiveSMS em vez do SMS-Activate
    const apiStatus = await this.smsService.getActiveSmsStatus(activationId);
    
    // Parsear resposta do ActiveSMS
    let parsedStatus: any;
    if (apiStatus.status === 'success' && apiStatus.array && apiStatus.array.length > 0) {
      const activationData = apiStatus.array[0];
      parsedStatus = {
        status: activationData.status === '2' ? 'success' : activationData.status === '1' ? 'pending' : 'cancelled',
        code: activationData.code || null,
      };
    } else {
      parsedStatus = { status: 'pending', code: null };
    }

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

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  async getSmsActivateBalance() {
    return this.smsService.getSmsActivateBalance();
  }

  @Post('webhook')
  async handleWebhook(
    @Body(new ZodValidationPipe(WebhookDto)) body: WebhookDto,
    @Req() req: any
  ) {
    const { activationId, status, code } = body;
    
    // Log seguro (sem dados sensíveis)
    this.logger.log(`Webhook received: activationId=${activationId}, status=${status}, hasCode=${!!code}`);
    
    // Validação básica de segurança
    if (!activationId || activationId.length < 3) {
      this.logger.warn(`Invalid webhook activationId: ${activationId}`);
      throw new BadRequestException('Invalid activation ID');
    }
    
    try {
      const activation = await this.prismaService.smsActivation.findUnique({
        where: { activationId },
        include: { transactions: true },
      });
      if (!activation) {
        throw new NotFoundException(`No SmsActivation record found for activationId: ${activationId}`);
      }

      this.logger.log(`Current activation status: ${activation.status}, has code: ${!!activation.code}`);

      // Validação de status válidos
      const validStatuses = ['1', '2', '3', '4', '5', '6', '8'];
      if (!validStatuses.includes(status)) {
        this.logger.warn(`Invalid webhook status: ${status} for activationId: ${activationId}`);
        throw new BadRequestException(`Invalid status: ${status}`);
      }

      // Definir status baseado no webhook (ActiveSMS usa status '2' para sucesso)
      let newStatus: string;
      if (status === '2') {
        // Status 2 = sucesso no ActiveSMS
        newStatus = 'COMPLETED';
      } else if (status === '8') {
        newStatus = 'CANCELLED';
      } else {
        newStatus = 'PENDING';
      }

      const updateData: any = {
        status: newStatus,
        code: code || null,
      };

      this.logger.log(`Processing webhook: activationId=${activationId}, status=${status}, newStatus=${newStatus}, code=${code || 'none'}`);

      if (status === '8') {
        // Verificar se já foi estornado anteriormente
        const existingRefund = await this.prismaService.transaction.findFirst({
          where: {
            smsActivationId: activation.id,
            type: 'REFUNDED',
            status: 'COMPLETED',
          },
        });

        if (existingRefund) {
          this.logger.log(`Activation ${activationId} already refunded, skipping refund`);
          await this.prismaService.smsActivation.update({
            where: { activationId },
            data: updateData,
          });
          return { status: 'received' };
        }

        // Verificar se o usuário já recebeu o código (não deve reembolsar)
        if (activation.status === 'COMPLETED' && activation.code) {
          this.logger.log(`Activation ${activationId} already completed with code, NOT refunding`);
          // NÃO atualizar status se já foi completado com código
          return { status: 'received' };
        }

        // Verificar se já está cancelado (evitar processamento duplicado)
        if (activation.status === 'CANCELLED') {
          this.logger.log(`Activation ${activationId} already cancelled, skipping`);
          return { status: 'received' };
        }

        const debitTransaction = activation.transactions.find(
          (t) => t.type === 'DEBIT' && t.status === 'COMPLETED' && t.smsActivationId === activation.id,
        );
        if (debitTransaction && debitTransaction.amount > 0) {
          // Transação atômica para garantir consistência
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
                description: `Refund for SMS activation: ${activation.service} (${activation.country}) - Service failed before code delivery`,
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
          this.logger.log(`Refunded ${debitTransaction.amount} credits for activation ${activationId} - service failed before code delivery`);
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
        this.logger.log(`Updated activation ${activationId} to status: ${newStatus}, code: ${code || 'none'}`);
      }

      this.logger.log(`Webhook processed successfully for activationId: ${activationId}`);
      return { status: 'received' };
    } catch (error) {
      this.logger.error(`Webhook processing failed for activationId: ${activationId}, error: ${error.message}`, error.stack);
      
      if (error instanceof NotFoundException) {
        throw error;
      }
      
      // Não expor detalhes internos do erro
      throw new BadRequestException('Failed to process webhook');
    }
  }
}