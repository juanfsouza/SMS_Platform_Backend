import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface PurchaseLog {
  id: number;
  userId: number;
  userName: string | null;
  userEmail: string;
  service: string;
  country: string;
  phoneNumber: string;
  creditsSpent: number;
  userBalance: number;
  activationId: string | null;
  status: string;
  code: string | null;
  purchaseDate: Date;
  canRefund: boolean;
  transactionId?: number;
}

export interface RefundRequest {
  activationId: string;
  reason?: string;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly MAX_REFUND_AGE = 20 * 60 * 1000; // 20 minutos em milliseconds

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca todos os logs de compras de SMS para o admin
   */
  async getPurchaseLogs(
    page: number = 1,
    limit: number = 20,
    status?: string,
    userEmail?: string,
    service?: string
  ): Promise<{ logs: PurchaseLog[]; total: number; pages: number }> {
    try {
      const skip = (page - 1) * limit;
      
      // Construir filtros
      const where: any = {};
      if (status) where.status = status;
      if (userEmail) where.user = { email: userEmail };
      if (service) where.service = { contains: service, mode: 'insensitive' };

      // Buscar ativações com informações do usuário e transações
      const [activations, total] = await Promise.all([
        this.prisma.smsActivation.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                balance: true,
              },
            },
            transactions: {
              where: {
                type: 'DEBIT',
                status: { in: ['COMPLETED', 'REFUNDED'] },
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.smsActivation.count({ where }),
      ]);

      // Mapear para o formato do log
      const logs: PurchaseLog[] = activations.map((activation) => {
        const transaction = activation.transactions[0];
        const canRefund = 
          transaction && 
          transaction.status === 'COMPLETED' &&
          activation.status !== 'COMPLETED';

        return {
          id: activation.id,
          userId: activation.userId,
          userName: activation.user.name,
          userEmail: activation.user.email,
          service: activation.service,
          country: activation.country,
          phoneNumber: activation.number,
          creditsSpent: transaction?.amount || 0,
          userBalance: activation.user.balance,
          activationId: activation.activationId,
          status: activation.status,
          code: activation.code,
          purchaseDate: activation.createdAt,
          canRefund,
          transactionId: transaction?.id,
        };
      });

      return {
        logs,
        total,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to get purchase logs: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get purchase logs: ${error.message}`);
    }
  }

  /**
   * Busca detalhes de uma compra específica por activationId
   */
  async getPurchaseLogByActivationId(activationId: string): Promise<PurchaseLog> {
    try {
      const activation = await this.prisma.smsActivation.findUnique({
        where: { activationId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              balance: true,
            },
          },
          transactions: {
            where: {
              type: 'DEBIT',
              status: { in: ['COMPLETED', 'REFUNDED'] },
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!activation) {
        throw new BadRequestException(`Activation ${activationId} not found`);
      }

      const transaction = activation.transactions[0];
      const canRefund =
        transaction &&
        transaction.status === 'COMPLETED' &&
        activation.status !== 'COMPLETED';

      return {
        id: activation.id,
        userId: activation.userId,
        userName: activation.user.name,
        userEmail: activation.user.email,
        service: activation.service,
        country: activation.country,
        phoneNumber: activation.number,
        creditsSpent: transaction?.amount || 0,
        userBalance: activation.user.balance,
        activationId: activation.activationId,
        status: activation.status,
        code: activation.code,
        purchaseDate: activation.createdAt,
        canRefund,
        transactionId: transaction?.id,
      };
    } catch (error) {
      this.logger.error(`Failed to get purchase log for activation ${activationId}: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get purchase log: ${error.message}`);
    }
  }

  /**
   * Processa estorno manual de uma compra
   */
  async processRefund(activationId: string, adminUserId: number, reason?: string): Promise<any> {
    try {
      this.logger.log(`Processing manual refund for activation: ${activationId} by admin: ${adminUserId}`);

      // Buscar a ativação com transações
      const activation = await this.prisma.smsActivation.findUnique({
        where: { activationId },
        include: {
          user: true,
          transactions: {
            where: {
              type: 'DEBIT',
              status: 'COMPLETED',
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!activation) {
        throw new BadRequestException(`Activation ${activationId} not found`);
      }

      if (!activation.transactions.length) {
        throw new BadRequestException(`No debit transaction found for activation ${activationId}`);
      }

      const transaction = activation.transactions[0];

      // Verificar se já foi estornado
      const existingRefund = await this.prisma.transaction.findFirst({
        where: {
          smsActivationId: activation.id,
          type: 'REFUNDED',
          status: 'COMPLETED',
        },
      });

      if (existingRefund) {
        throw new BadRequestException(`Activation ${activationId} already refunded`);
      }

      // Verificar se o SMS foi recebido (se sim, não permitir estorno)
      if (activation.status === 'COMPLETED' && activation.code) {
        throw new BadRequestException(`Cannot refund activation ${activationId} - SMS code was already received`);
      }

      // Processar estorno em transação
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Atualizar saldo do usuário
        const updatedUser = await tx.user.update({
          where: { id: activation.userId },
          data: { balance: { increment: transaction.amount } },
        });

        // 2. Criar transação de estorno
        const refundTransaction = await tx.transaction.create({
          data: {
            userId: activation.userId,
            amount: transaction.amount,
            type: 'REFUNDED',
            status: 'COMPLETED',
            description: `Manual refund for SMS activation: ${activation.service} (${activation.country}) - Reason: ${reason || 'Manual admin refund'}`,
            smsActivationId: activation.id,
          },
        });

        // 3. Marcar transação original como estornada
        await tx.transaction.update({
          where: { id: transaction.id },
          data: { status: 'REFUNDED' },
        });

        // 4. Atualizar status da ativação
        await tx.smsActivation.update({
          where: { id: activation.id },
          data: { status: 'CANCELLED' },
        });

        return {
          refundTransaction,
          updatedUser,
          refundedAmount: transaction.amount,
        };
      });

      this.logger.log(`Manual refund processed: ${transaction.amount} credits returned to user ${activation.userId}`);

      return {
        success: true,
        message: `Refund processed successfully`,
        activationId,
        refundedAmount: result.refundedAmount,
        userNewBalance: result.updatedUser.balance,
        refundTransactionId: result.refundTransaction.id,
      };
    } catch (error) {
      this.logger.error(`Failed to process refund for ${activationId}: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to process refund: ${error.message}`);
    }
  }

  /**
   * Processa estornos de todas as compras elegíveis de um usuário
   */
  async processUserRefunds(userEmail: string, adminUserId: number, reason?: string): Promise<any> {
    try {
      this.logger.log(`Processing refunds for user email: ${userEmail} by admin: ${adminUserId}`);

      // Buscar usuário pelo email
      const user = await this.prisma.user.findUnique({
        where: { email: userEmail },
      });

      if (!user) {
        throw new BadRequestException(`User with email ${userEmail} not found`);
      }

      // Buscar ativações elegíveis para estorno
      const cutoffTime = new Date(Date.now() - this.MAX_REFUND_AGE);
      const eligibleActivations = await this.prisma.smsActivation.findMany({
        where: {
          userId: user.id,
          createdAt: { lte: cutoffTime },
          status: { in: ['PENDING', 'WAITING'] },
          transactions: {
            some: {
              type: 'DEBIT',
              status: 'COMPLETED',
            },
          },
        },
        include: {
          transactions: {
            where: {
              type: 'DEBIT',
              status: 'COMPLETED',
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          user: true,
        },
      });

      this.logger.log(`Found ${eligibleActivations.length} eligible activations for refund for user ${userEmail}`);

      let processedRefunds = 0;
      const results: { activationId: string | null; refundedAmount: number }[] = [];

      for (const activation of eligibleActivations) {
        try {
          const transaction = activation.transactions[0];
          if (!transaction) continue;

          // Verificar se já existe estorno
          const existingRefund = await this.prisma.transaction.findFirst({
            where: {
              smsActivationId: activation.id,
              type: 'REFUNDED',
            },
          });

          if (existingRefund) {
            this.logger.log(`Activation ${activation.activationId} already has refund, skipping`);
            continue;
          }

          // Processar estorno
          await this.prisma.$transaction(async (tx) => {
            // Atualizar saldo
            await tx.user.update({
              where: { id: activation.userId },
              data: { balance: { increment: transaction.amount } },
            });

            // Criar transação de estorno
            await tx.transaction.create({
              data: {
                userId: activation.userId,
                amount: transaction.amount,
                type: 'REFUNDED',
                status: 'COMPLETED',
                description: `User refund for SMS activation: ${activation.service} (${activation.country}) - Reason: ${reason || 'Admin-initiated user refund'}`,
                smsActivationId: activation.id,
              },
            });

            // Marcar transação original como estornada
            await tx.transaction.update({
              where: { id: transaction.id },
              data: { status: 'REFUNDED' },
            });

            // Atualizar ativação
            await tx.smsActivation.update({
              where: { id: activation.id },
              data: { status: 'CANCELLED' },
            });
          });

          processedRefunds++;
          results.push({
            activationId: activation.activationId,
            refundedAmount: transaction.amount,
          });

          this.logger.log(`Refund processed for activation ${activation.activationId} for user ${userEmail}`);
        } catch (error) {
          this.logger.error(`Failed to process refund for activation ${activation.id}: ${error.message}`);
        }
      }

      this.logger.log(`User refunds completed: ${processedRefunds} processed for user ${userEmail}`);

      const updatedUser = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { balance: true },
      });

      return {
        success: true,
        processedCount: processedRefunds,
        userId: user.id,
        userEmail,
        userNewBalance: updatedUser?.balance || 0,
        results,
      };
    } catch (error) {
      this.logger.error(`Failed to process refunds for user ${userEmail}: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to process user refunds: ${error.message}`);
    }
  }

  /**
   * Verifica e processa estornos automáticos para ativações expiradas
   */
  async processAutomaticRefunds(): Promise<any> {
    try {
      this.logger.log('Starting automatic refunds check...');

      const cutoffTime = new Date(Date.now() - this.MAX_REFUND_AGE);

      // Buscar ativações que precisam de estorno automático
      const expiredActivations = await this.prisma.smsActivation.findMany({
        where: {
          createdAt: { lte: cutoffTime },
          status: { in: ['PENDING', 'WAITING'] },
          transactions: {
            some: {
              type: 'DEBIT',
              status: 'COMPLETED',
            },
          },
        },
        include: {
          transactions: {
            where: {
              type: 'DEBIT',
              status: 'COMPLETED',
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          user: true,
        },
      });

      this.logger.log(`Found ${expiredActivations.length} activations for automatic refund`);

      let processedRefunds = 0;
      const results: { activationId: string | null; userId: number; refundedAmount: number }[] = [];

      for (const activation of expiredActivations) {
        try {
          const transaction = activation.transactions[0];
          if (!transaction) continue;

          // Verificar se já existe estorno
          const existingRefund = await this.prisma.transaction.findFirst({
            where: {
              smsActivationId: activation.id,
              type: 'REFUNDED',
            },
          });

          if (existingRefund) {
            this.logger.log(`Activation ${activation.activationId} already has refund, skipping`);
            continue;
          }

          // Processar estorno automático
          await this.prisma.$transaction(async (tx) => {
            // Atualizar saldo
            await tx.user.update({
              where: { id: activation.userId },
              data: { balance: { increment: transaction.amount } },
            });

            // Criar transação de estorno
            await tx.transaction.create({
              data: {
                userId: activation.userId,
                amount: transaction.amount,
                type: 'REFUNDED',
                status: 'COMPLETED',
                description: `Automatic refund for expired SMS activation: ${activation.service} (${activation.country}) - 20 minute timeout`,
                smsActivationId: activation.id,
              },
            });

            // Marcar original como estornada
            await tx.transaction.update({
              where: { id: transaction.id },
              data: { status: 'REFUNDED' },
            });

            // Atualizar ativação
            await tx.smsActivation.update({
              where: { id: activation.id },
              data: { status: 'CANCELLED' },
            });
          });

          processedRefunds++;
          results.push({
            activationId: activation.activationId,
            userId: activation.userId,
            refundedAmount: transaction.amount,
          });

          this.logger.log(`Automatic refund processed for activation ${activation.activationId}`);
        } catch (error) {
          this.logger.error(`Failed to process automatic refund for activation ${activation.id}: ${error.message}`);
        }
      }

      this.logger.log(`Automatic refunds completed: ${processedRefunds} processed`);

      return {
        success: true,
        processedCount: processedRefunds,
        results,
      };
    } catch (error) {
      this.logger.error(`Failed to process automatic refunds: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to process automatic refunds: ${error.message}`);
    }
  }

  /**
   * Cron job para processar estornos automáticos a cada 5 minutos
   */
  @Cron('*/5 * * * *') // A cada 5 minutos
  async handleAutomaticRefundsCron() {
    this.logger.log('Running scheduled automatic refunds cron job');
    try {
      const result = await this.processAutomaticRefunds();
      this.logger.log(`Cron job completed: ${result.processedCount} refunds processed`);
    } catch (error) {
      this.logger.error(`Cron job failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Busca estatísticas do admin
   */
  async getAdminStats(): Promise<any> {
    try {
      const [
        totalPurchases,
        totalRefunded,
        totalRevenue,
        activeUsers,
        todayPurchases,
        pendingActivations,
      ] = await Promise.all([
        this.prisma.smsActivation.count(),
        this.prisma.transaction.count({
          where: { type: 'REFUNDED', status: 'COMPLETED' },
        }),
        this.prisma.transaction.aggregate({
          where: { type: 'DEBIT', status: 'COMPLETED' },
          _sum: { amount: true },
        }),
        this.prisma.user.count({
          where: { role: 'USER' },
        }),
        this.prisma.smsActivation.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
        this.prisma.smsActivation.count({
          where: { status: { in: ['PENDING', 'WAITING'] } },
        }),
      ]);

      return {
        totalPurchases,
        totalRefunded,
        totalRevenue: totalRevenue._sum.amount || 0,
        activeUsers,
        todayPurchases,
        pendingActivations,
      };
    } catch (error) {
      this.logger.error(`Failed to get admin stats: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get admin stats: ${error.message}`);
    }
  }
}