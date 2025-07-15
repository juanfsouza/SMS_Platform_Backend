import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  balance: number;
  affiliateBalance: number;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(name: string, email: string, password: string, affiliateCode?: string) {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      let referredByLinkId: number | undefined;

      if (affiliateCode) {
        const affiliateLink = await this.prisma.affiliateLink.findUnique({ where: { code: affiliateCode } });
        if (affiliateLink) {
          referredByLinkId = affiliateLink.id;
        }
      }

      const user = await this.prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          balance: 0,
          affiliateBalance: 0,
          role: 'USER',
          referredByLinkId,
        },
      });
      return this.generateResponse(user);
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.generateResponse(user);
  }

  private generateResponse(user: User) {
    const payload = { id: user.id, email: user.email, role: user.role };
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        balance: user.balance,
        affiliateBalance: user.affiliateBalance,
      },
      token: this.jwtService.sign(payload),
    };
  }
}