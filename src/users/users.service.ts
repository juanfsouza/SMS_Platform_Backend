import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dtos/users.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, balance: true, affiliateBalance: true, createdAt: true, updatedAt: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async getUserBalance(id: number): Promise<{ balance: number, affiliateBalance: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { balance: true, affiliateBalance: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return { balance: user.balance, affiliateBalance: user.affiliateBalance };
  }

  async addUserBalance(id: number, amount: number): Promise<{ balance: number }> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }
    const user = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { balance: { increment: amount } },
      }),
      this.prisma.transaction.create({
        data: {
          userId: id,
          amount,
          type: 'CREDIT',
          status: 'COMPLETED',
          description: 'Manual balance addition',
        },
      }),
    ]);
    if (!user[0]) {
      throw new NotFoundException('User not found');
    }
    return { balance: user[0].balance };
  }

  async updateUserBalance(id: number, balance: number): Promise<{ balance: number }> {
    if (balance < 0) {
      throw new BadRequestException('Balance cannot be negative');
    }
    const user = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { balance },
      }),
      this.prisma.transaction.create({
        data: {
          userId: id,
          amount: balance,
          type: 'UPDATE',
          status: 'COMPLETED',
          description: 'Manual balance update',
        },
      }),
    ]);
    if (!user[0]) {
      throw new NotFoundException('User not found');
    }
    return { balance: user[0].balance };
  }

  async resetUserBalance(id: number): Promise<{ balance: number }> {
    const user = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { balance: 0 },
      }),
      this.prisma.transaction.create({
        data: {
          userId: id,
          amount: 0,
          type: 'RESET',
          status: 'COMPLETED',
          description: 'Balance reset',
        },
      }),
    ]);
    if (!user[0]) {
      throw new NotFoundException('User not found');
    }
    return { balance: user[0].balance };
  }

  async updateUser(id: number, data: UpdateUserDto) {
    try {
      const updateData: any = {};
      if (data.email) {
        updateData.email = data.email;
      }
      if (data.password) {
        updateData.password = await bcrypt.hash(data.password, 10);
      }
      if (data.pixKey) {
        updateData.pixKey = data.pixKey;
      }
      const user = await this.prisma.user.update({
        where: { id },
        data: updateData,
        select: { id: true, email: true, name: true, balance: true, affiliateBalance: true, createdAt: true, updatedAt: true },
      });
      return user;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Email already exists');
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('User not found');
      }
      throw error;
    }
  }

  async getAllUsers() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, name: true, balance: true, affiliateBalance: true, createdAt: true, updatedAt: true },
    });
  }
}