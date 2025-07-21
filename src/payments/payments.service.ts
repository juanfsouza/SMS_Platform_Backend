import { Injectable, BadRequestException, Logger, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AffiliateService } from '../affiliate/affiliate.service';
import { lastValueFrom } from 'rxjs';
import { Prisma } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly apiUrl = 'https://api.pushinpay.com.br/api/pix/cashIn';
  private readonly transactionApiUrl = 'https://api.pushinpay.com.br/api/transactions';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly affiliateService: AffiliateService,
  ) {}

  async createCheckoutLink(userId: number, amount: number, affiliateCode?: string): Promise<any> {
    const apiKey = this.configService.get('pushinpay.apiKey');
    
    this.logger.debug(`API Key loaded: ${apiKey ? 'Yes' : 'No'}`);
    
    if (!apiKey) {
      throw new BadRequestException('API Key not configured');
    }

    try {
      const amountInCentavos = Math.round(amount * 100);
      if (amountInCentavos < 50) {
        throw new BadRequestException('Amount must be at least 50 centavos');
      }

      let affiliateLinkId: number | null = null;
      if (affiliateCode) {
        const affiliateLink = await this.prisma.affiliateLink.findFirst({
          where: { code: affiliateCode },
        });
        
        if (affiliateLink) {
          affiliateLinkId = affiliateLink.id;
          this.logger.log(`Valid affiliate code found: ${affiliateCode} (ID: ${affiliateLinkId})`);
          
          const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { referredByLinkId: true }
          });
          
          if (user && !user.referredByLinkId) {
            await this.prisma.user.update({
              where: { id: userId },
              data: { referredByLinkId: affiliateLinkId }
            });
            this.logger.log(`User ${userId} linked to affiliate ${affiliateLinkId}`);
          }
        } else {
          this.logger.warn(`Invalid affiliate code: ${affiliateCode}`);
        }
      }

      const payload = {
        value: amountInCentavos,
        webhook_url: `${this.configService.get('app.baseUrl')}/payments/webhook`,
        userId,
      };

      this.logger.log(`Sending request to PushinPay: ${JSON.stringify(payload)}`);

      const response = await lastValueFrom(
        this.httpService.post(this.apiUrl, payload, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }),
      );

      const { id, qr_code, qr_code_base64, status } = response.data;
      this.logger.log(`Checkout created: Transaction ID ${id}, Status: ${status}`);

      try {
        await this.prisma.transaction.create({
          data: {
            userId,
            amount: amount,
            type: 'DEPOSIT',
            status: 'PENDING',
            description: `PIX deposit via PushinPay, Transaction ID: ${id}`,
            externalId: id,
            metadata: affiliateCode ? JSON.stringify({ 
              affiliateCode,
              affiliateLinkId 
            }) : null,
          },
        });
      } catch (prismaError) {
        this.logger.error(`Failed to create transaction in database: ${prismaError.message}`, prismaError.stack);
        if (prismaError instanceof Prisma.PrismaClientKnownRequestError) {
          this.logger.error(`Prisma error code: ${prismaError.code}, Meta: ${JSON.stringify(prismaError.meta)}`);
        }
        throw new BadRequestException(`Failed to create transaction: ${prismaError.message}`);
      }

      return {
        transactionId: id,
        qrCode: qr_code,
        qrCodeBase64: qr_code_base64,
        amount: amount,
        status: status,
        disclaimer: 'A PUSHIN PAY atua exclusivamente como processadora de pagamentos e não possui qualquer responsabilidade pela entrega, suporte, conteúdo, qualidade ou cumprimento das obrigações relacionadas aos produtos ou serviços oferecidos pelo vendedor.',
      };
    } catch (error) {
      this.logger.error(`Failed to create checkout link: ${error.message}`, error.stack);
      if (error.response) {
        this.logger.error(`PushinPay response status: ${error.response.status}`);
        this.logger.error(`PushinPay response headers: ${JSON.stringify(error.response.headers)}`);
        this.logger.error(`PushinPay response data: ${JSON.stringify(error.response.data)}`);
      }

      if (error.response?.status === 401) {
        throw new BadRequestException('Invalid API key or IP not whitelisted');
      } else if (error.response?.status === 403) {
        throw new BadRequestException('Forbidden: Check your API permissions');
      } else if (error.response?.status === 422) {
        throw new BadRequestException('Invalid request data');
      }

      throw new BadRequestException(`Failed to create checkout link: ${error.message}`);
    }
  }

  async handlePaymentWebhook(payload: any) {
    this.logger.log(`Webhook received: ${JSON.stringify(payload)}`);

    if (!payload.id || !payload.status || payload.value === undefined || !payload.userId) {
      this.logger.error(`Invalid webhook payload: ${JSON.stringify(payload)}`);
      throw new BadRequestException('Invalid webhook payload');
    }

    const { id: transactionId, status, value, userId } = payload;

    const transaction = await this.prisma.transaction.findUnique({
      where: { externalId: transactionId },
      include: { user: true },
    });

    if (!transaction) {
      this.logger.error(`Transaction not found for external ID: ${transactionId}`);
      throw new BadRequestException('Transaction not found');
    }

    if (transaction.userId !== userId) {
      this.logger.error(`User ID mismatch: webhook userId=${userId}, transaction userId=${transaction.userId}`);
      throw new BadRequestException('User ID mismatch in webhook payload');
    }

    this.logger.log(`Found transaction: ${transaction.id} for user: ${transaction.userId}, current status: ${transaction.status}, amount: ${transaction.amount}`);

    if (status !== 'paid') {
      this.logger.log(`Webhook status is ${status}. Updating status if needed.`);

      if (status === 'expired' || status === 'cancelled') {
        await this.prisma.transaction.update({
          where: { externalId: transactionId },
          data: { status: status.toUpperCase(), updatedAt: new Date() },
        });
        this.logger.log(`Transaction ${transactionId} status updated to ${status.toUpperCase()}`);
      }
      return { status: 'received' };
    }

    if (transaction.status === 'COMPLETED') {
      this.logger.warn(`Transaction ${transactionId} already processed. Returning cached result.`);
      return {
        status: 'already_processed',
        transactionId,
        amount: transaction.amount,
        userId: transaction.userId,
      };
    }

    // Adicionar validação para garantir que a transação esteja em PENDING
    if (transaction.status !== 'PENDING') {
      this.logger.warn(`Transaction ${transactionId} is not in PENDING status, skipping processing`);
      return { status: 'invalid_state' };
    }

    // Processar o pagamento quando status é 'paid'
    const amount = value / 100;
    this.logger.log(`Processing payment: Transaction ${transactionId}, Amount: ${amount} credits for user ${userId}`);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const updatedTransaction = await tx.transaction.update({
          where: { externalId: transactionId },
          data: {
            status: 'COMPLETED',
            description: `PIX deposit completed via PushinPay, Transaction ID: ${transactionId}`,
            updatedAt: new Date(),
          },
        });

        const updatedUser = await tx.user.update({
          where: { id: userId },
          data: { balance: { increment: amount } },
        });

        this.logger.log(`User ${userId} balance updated. New balance: ${updatedUser.balance}`);

        return { updatedTransaction, updatedUser };
      });

      if (transaction.metadata) {
        try {
          const metadata = JSON.parse(transaction.metadata);
          if (metadata.affiliateCode) {
            const commissionPercentage = await this.affiliateService.getCommissionPercentage();
            const commissionAmount = (amount * commissionPercentage) / 100;
            if (commissionAmount > 0) {
              await this.affiliateService.creditCommission(userId, amount, metadata.affiliateCode);
              this.logger.log(`Affiliate commission of ${commissionAmount} credited for code: ${metadata.affiliateCode}`);
            }
          }
        } catch (error) {
          this.logger.error(`Failed to process affiliate commission: ${error.message}`, error.stack);
        }
      }

      return {
        transactionId,
        amount,
        userId,
        status: 'processed',
        newBalance: result.updatedUser.balance,
      };
    } catch (error) {
      this.logger.error(`Failed to process payment: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to process payment: ${error.message}`);
    }
  }

  // Método separado para processar pagamento (usado tanto no webhook quanto na verificação manual)
  private async processPayment(transaction: any, value: number) {
    try {
      const amount = value / 100; // Convert centavos to BRL (1 BRL = 1 credit)
      this.logger.log(`Processing payment: Transaction ${transaction.externalId}, Amount: ${amount} BRL for user ${transaction.userId}`);
      
      const result = await this.prisma.$transaction(async (tx) => {
        const updatedTransaction = await tx.transaction.update({
          where: { externalId: transaction.externalId },
          data: {
            status: 'COMPLETED',
            description: `PIX deposit completed via PushinPay, Transaction ID: ${transaction.externalId}`,
            updatedAt: new Date(),
          },
        }).catch(error => {
          this.logger.error(`Failed to update transaction: ${error.message}`, error.stack);
          throw new BadRequestException(`Failed to update transaction: ${error.message}`);
        });

        const updatedUser = await tx.user.update({
          where: { id: transaction.userId },
          data: { balance: { increment: amount } },
        }).catch(error => {
          this.logger.error(`Failed to update user balance: ${error.message}`, error.stack);
          throw new BadRequestException(`Failed to update user balance: ${error.message}`);
        });

        this.logger.log(`User ${transaction.userId} balance updated. New balance: ${updatedUser.balance}`);

        return { updatedTransaction, updatedUser };
      });

      // Processar comissão de afiliado se houver
      if (transaction.metadata) {
        try {
          const metadata = JSON.parse(transaction.metadata);
          if (metadata.affiliateCode) {
            this.logger.log(`Processing affiliate commission for code: ${metadata.affiliateCode}`);
            await this.affiliateService.creditCommission(
              transaction.userId, 
              amount, 
              metadata.affiliateCode
            ).catch(error => {
              this.logger.error(`Failed to credit affiliate commission: ${error.message}`, error.stack);
              throw new BadRequestException(`Failed to credit affiliate commission: ${error.message}`);
            });
            this.logger.log(`Affiliate commission processed for ${metadata.affiliateCode}`);
          } else {
            this.logger.log(`No affiliate code in metadata for transaction ${transaction.externalId}`);
          }
        } catch (error) {
          this.logger.error(`Failed to parse metadata or process affiliate: ${error.message}`, error.stack);
        }
      } else {
        this.logger.log(`No metadata found for transaction ${transaction.externalId}, skipping affiliate commission`);
      }

      this.logger.log(`Payment processed successfully: ${amount} BRL credited to user ${transaction.userId}`);
      
      return {
        transactionId: transaction.externalId,
        amount,
        userId: transaction.userId,
        status: 'processed',
        newBalance: result.updatedUser.balance
      };
    } catch (error) {
      this.logger.error(`Failed to process payment: ${error.message}`, error.stack);
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        this.logger.error(`Prisma error code: ${error.code}, Meta: ${JSON.stringify(error.meta)}`);
      }
      throw new BadRequestException(`Failed to process payment: ${error.message}`);
    }
  }

  async verifyAndUpdatePayment(transactionId: string): Promise<any> {
    const apiKey = this.configService.get('pushinpay.apiKey');
    
    let transaction: any = null;
    
    try {
      transaction = await this.prisma.transaction.findUnique({
        where: { externalId: transactionId },
        include: { user: true },
      });
      
      if (!transaction) {
        this.logger.error(`Transaction not found for external ID: ${transactionId}`);
        throw new BadRequestException('Transaction not found');
      }

      this.logger.log(`Found transaction: ${transaction.id}, userId: ${transaction.userId}, status: ${transaction.status}, amount: ${transaction.amount}`);

      const response = await lastValueFrom(
        this.httpService.get(`${this.transactionApiUrl}/${transactionId}`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }),
      ).catch(error => {
        this.logger.error(`PushinPay API error: ${error.message}`, error.stack);
        throw new BadRequestException(`PushinPay API error: ${error.message}`);
      });

      const { status, value } = response.data;
      
      if (status !== 'paid' || transaction.status === 'COMPLETED') {
        this.logger.log(`Transaction ${transactionId} status: ${status}, local status: ${transaction.status}`);
        return { 
          status: status === 'paid' && transaction.status === 'COMPLETED' ? 'already_processed' : status,
          localStatus: transaction.status,
          amount: transaction.amount,
          userId: transaction.userId,
        };
      }

      // Usar o método processPayment para manter consistência
      return await this.processPayment(transaction, value);
    } catch (error) {
      this.logger.error(`Failed to verify and update transaction ${transactionId}: ${error.message}`, error.stack);
      
      if (error.response?.status === 404) {
        return { 
          status: 'not_found',
          localStatus: transaction ? transaction.status : 'unknown'
        };
      }
      
      throw new BadRequestException(`Failed to verify and update transaction: ${error.message}`);
    }
  }

  // Método melhorado para verificar status com auto-processamento
  async getTransactionStatus(transactionId: string, userId: number): Promise<any> {
    const apiKey = this.configService.get('pushinpay.apiKey');
    
    try {
      const transaction = await this.prisma.transaction.findFirst({
        where: { externalId: transactionId, userId },
      });
      
      if (!transaction) {
        throw new BadRequestException('Transaction not found or not authorized');
      }

      // Verificar status na API do PushinPay
      const response = await lastValueFrom(
        this.httpService.get(`${this.transactionApiUrl}/${transactionId}`, {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }),
      );

      const { status, value } = response.data;
      this.logger.log(`PushinPay status for ${transactionId}: ${status}, local status: ${transaction.status}`);
      
      // Se o pagamento foi confirmado na API mas ainda não foi processado localmente
      if (status === 'paid' && transaction.status !== 'COMPLETED') {
        this.logger.log(`Payment confirmed for transaction ${transactionId}, processing automatically...`);
        
        try {
          const processResult = await this.processPayment(transaction, value);
          this.logger.log(`Auto-processed payment for transaction ${transactionId}`);
          
          return {
            status: 'paid',
            localStatus: 'COMPLETED',
            amount: transaction.amount,
            createdAt: transaction.createdAt,
            autoProcessed: true,
            newBalance: processResult.newBalance
          };
        } catch (processError) {
          this.logger.error(`Failed to auto-process payment: ${processError.message}`, processError.stack);
          // Continuar retornando o status mesmo se o processamento falhar
        }
      } else if (status === 'expired' && transaction.status === 'PENDING') {
        await this.prisma.transaction.update({
          where: { externalId: transactionId },
          data: { status: 'EXPIRED', updatedAt: new Date() },
        });
      }

      return { 
        status,
        localStatus: transaction.status,
        amount: transaction.amount,
        createdAt: transaction.createdAt,
      };
    } catch (error) {
      this.logger.error(`Failed to check transaction status: ${error.message}`, error.stack);
      
      if (error.response?.status === 404) {
        const localTransaction = await this.prisma.transaction.findFirst({
          where: { externalId: transactionId, userId },
        });
        return { 
          status: 'not_found',
          localStatus: localTransaction?.status || 'unknown'
        };
      }
      
      throw new BadRequestException(`Failed to check transaction status: ${error.message}`);
    }
  }

  async getUserTransactions(userId: number, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({
        where: { userId },
      }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}