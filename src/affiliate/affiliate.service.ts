import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AffiliateService {
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
    const { nanoid } = await import('nanoid/non-secure'); // Dynamic import for CommonJS compatibility
    const code = nanoid(10); // Synchronous call after dynamic import
    await this.prisma.affiliateLink.create({
      data: {
        userId,
        code,
      },
    });
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
  }

  async getCommissionPercentage(): Promise<number> {
    const commission = await this.prisma.affiliateCommission.findFirst({ where: { id: 1 } });
    return commission?.percentage || 0;
  }

  async creditCommission(referredUserId: number, amount: number): Promise<void> {
    const commissionPercentage = await this.getCommissionPercentage();
    if (commissionPercentage === 0) return;

    const referredUser = await this.prisma.user.findUnique({
      where: { id: referredUserId },
      include: { referredByLink: true },
    });
    if (!referredUser || !referredUser.referredByLinkId) return;

    const affiliate = await this.prisma.affiliateLink.findUnique({
      where: { id: referredUser.referredByLinkId },
      include: { user: true },
    });
    if (!affiliate) return;

    const commissionAmount = (amount * commissionPercentage) / 100;
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: affiliate.userId },
        data: { affiliateBalance: { increment: commissionAmount } },
      }),
      this.prisma.transaction.create({
        data: {
          userId: affiliate.userId,
          amount: commissionAmount,
          type: 'AFFILIATE_CREDIT',
          status: 'COMPLETED',
          description: `Affiliate commission for user ${referredUserId} deposit`,
        },
      }),
    ]);
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
        data: { affiliateBalance: { decrement: amount }, pixKey },
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
          description: 'Withdrawal request via PIX',
        },
      }),
    ]);
  }

  async getWithdrawalRequests(status?: string): Promise<any[]> {
    const where = status ? { status } : {};
    return this.prisma.withdrawalRequest.findMany({
      where,
      include: { user: { select: { id: true, email: true, name: true, pixKey: true } } },
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
            description: 'Withdrawal request cancelled',
          },
        }),
      ]);
    } else {
      await this.prisma.$transaction([
        this.prisma.withdrawalRequest.update({ where: { id }, data: updateData }),
        this.prisma.transaction.create({
          data: {
            userId: request.userId,
            amount: request.amount,
            type: 'WITHDRAWAL',
            status: 'COMPLETED',
            description: 'Withdrawal processed via PIX',
          },
        }),
      ]);
    }
  }
}