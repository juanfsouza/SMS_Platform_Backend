import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dtos/users.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, balance: true, createdAt: true, updatedAt: true },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
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
      const user = await this.prisma.user.update({
        where: { id },
        data: updateData,
        select: { id: true, email: true, balance: true, createdAt: true, updatedAt: true },
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
}