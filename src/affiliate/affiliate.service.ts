import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AffiliateService {
  private readonly logger = new Logger(AffiliateService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generateAffiliateLink(userId: number): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    const existingLink = await this.prisma.affiliateLink.findFirst({ where: { userId } });
    if (existingLink) {
      return existingLink.code;
    }
    
    const { nanoid } = await import('nanoid/non-secure');
    const code = nanoid(10);
    
    await this.prisma.affiliateLink.create({
      data: {
        userId,
        code,
      },
    });
    
    this.logger.log(`Generated affiliate link for user ${userId}: ${code}`);
    return code;
  }

  async setCommissionPercentage(percentage: number): Promise<void> {
    if (percentage < 0 || percentage > 100) {
      throw new BadRequestException('Commission percentage must be between 0 and 100');
    }
    
    await this.prisma.affiliateCommission.upsert({
      where: { id: 1 },
      update: { percentage, updatedAt: new Date() },
      create: { id: 1, percentage, createdAt: new Date(), updatedAt: new Date() },
    });
    
    this.logger.log(`Commission percentage set to ${percentage}%`);
  }

  async getCommissionPercentage(): Promise<number> {
    const commission = await this.prisma.affiliateCommission.findFirst({ where: { id: 1 } });
    return commission?.percentage || 0;
  }

  // affiliate.service.ts
async creditCommission(referredUserId: number, amount: number, affiliateCode: string): Promise<void> {
  this.logger.log(`Attempting to credit commission for referredUserId=${referredUserId}, amount=${amount}, affiliateCode=${affiliateCode}`);

  const commissionPercentage = await this.getCommissionPercentage();
  this.logger.log(`Commission percentage: ${commissionPercentage}%`);

  if (commissionPercentage === 0) {
    this.logger.log('Commission percentage is 0, skipping affiliate commission');
    return;
  }

  const affiliateLink = await this.prisma.affiliateLink.findFirst({
    where: { code: affiliateCode },
    include: { user: true },
  });

  if (!affiliateLink) {
    this.logger.warn(`Affiliate link not found for code: ${affiliateCode}`);
    return;
  }

  if (affiliateLink.userId === referredUserId) {
    this.logger.warn(`User ${referredUserId} tried to use their own affiliate link`);
    return;
  }

  const commissionAmount = (amount * commissionPercentage) / 100;
  this.logger.log(`Calculating commission: ${amount} * ${commissionPercentage}% = ${commissionAmount} credits`);

  await this.prisma.$transaction([
    this.prisma.user.update({
      where: { id: affiliateLink.userId },
      data: { affiliateBalance: { increment: commissionAmount } },
    }),
    this.prisma.transaction.create({
      data: {
        userId: affiliateLink.userId,
        amount: commissionAmount,
        type: 'AFFILIATE_CREDIT',
        status: 'COMPLETED',
        description: `Comissão de afiliado por depósito do usuário ${referredUserId}`,
        metadata: JSON.stringify({
          referredUserId,
          originalAmount: amount,
          commissionPercentage,
          affiliateCode,
        }),
      },
    }),
  ]);

  this.logger.log(`Commission credited: ${commissionAmount} credits to affiliate user ${affiliateLink.userId} for referral of user ${referredUserId}`);
}

  async requestWithdrawal(userId: number, amount: number, pixKey: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    if (user.affiliateBalance < amount) {
      throw new BadRequestException('Insufficient affiliate balance');
    }
    
    if (amount < 50) {
      throw new BadRequestException('Minimum withdrawal amount is 50 BRL');
    }
    
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { 
          affiliateBalance: { decrement: amount }, 
          pixKey 
        },
      }),
      this.prisma.withdrawalRequest.create({
        data: {
          userId,
          amount,
          pixKey,
          status: 'PENDING',
        },
      }),
      this.prisma.transaction.create({
        data: {
          userId,
          amount,
          type: 'WITHDRAWAL',
          status: 'PENDING',
          description: 'Solicitação de saque via PIX',
        },
      }),
    ]);
    
    this.logger.log(`Withdrawal request created for user ${userId}: ${amount} BRL to PIX ${pixKey}`);
  }

  async getWithdrawalRequests(status?: string): Promise<any[]> {
    const where = status ? { status } : {};
    return this.prisma.withdrawalRequest.findMany({
      where,
      include: { user: { select: { id: true, email: true, name: true, pixKey: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateWithdrawalRequest(id: number, status: 'APPROVED' | 'CANCELLED'): Promise<void> {
    const request = await this.prisma.withdrawalRequest.findUnique({ where: { id } });
    if (!request) {
      throw new NotFoundException('Withdrawal request not found');
    }
    
    if (request.status !== 'PENDING') {
      throw new BadRequestException('Withdrawal request is not pending');
    }
    
    const updateData = { status, updatedAt: new Date() };
    
    if (status === 'CANCELLED') {
      await this.prisma.$transaction([
        this.prisma.withdrawalRequest.update({ where: { id }, data: updateData }),
        this.prisma.user.update({
          where: { id: request.userId },
          data: { affiliateBalance: { increment: request.amount } },
        }),
        this.prisma.transaction.create({
          data: {
            userId: request.userId,
            amount: request.amount,
            type: 'REFUNDED',
            status: 'COMPLETED',
            description: 'Saque cancelado - valor reembolsado',
          },
        }),
      ]);
      this.logger.log(`Withdrawal request ${id} cancelled and amount refunded`);
    } else {
      await this.prisma.$transaction([
        this.prisma.withdrawalRequest.update({ where: { id }, data: updateData }),
        this.prisma.transaction.create({
          data: {
            userId: request.userId,
            amount: request.amount,
            type: 'WITHDRAWAL',
            status: 'COMPLETED',
            description: 'Saque processado via PIX',
          },
        }),
      ]);
      this.logger.log(`Withdrawal request ${id} approved and processed`);
    }
  }

  async getAffiliateStats(userId: number): Promise<any> {
    const affiliateLink = await this.prisma.affiliateLink.findFirst({
      where: { userId }
    });

    if (!affiliateLink) {
      return {
        totalReferrals: 0,
        totalCommissions: 0,
        affiliateBalance: 0,
        commissionRate: await this.getCommissionPercentage()
      };
    }

    const [referrals, commissionTransactions, user] = await Promise.all([
      this.prisma.user.count({
        where: { referredByLinkId: affiliateLink.id }
      }),
      this.prisma.transaction.findMany({
        where: {
          userId,
          type: 'AFFILIATE_CREDIT',
          status: 'COMPLETED'
        }
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { affiliateBalance: true }
      })
    ]);

    const totalCommissions = commissionTransactions.reduce((sum, t) => sum + t.amount, 0);

    return {
      totalReferrals: referrals,
      totalCommissions,
      affiliateBalance: user?.affiliateBalance || 0,
      commissionRate: await this.getCommissionPercentage(),
      recentCommissions: commissionTransactions.slice(-5)
    };
  }
}