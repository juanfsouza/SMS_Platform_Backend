import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  async register(name: string, email: string, password: string, affiliateCode?: string) {
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      let referredByLinkId: number | null = null;

      if (affiliateCode) {
        const affiliateLink = await this.prisma.affiliateLink.findUnique({ where: { code: affiliateCode } });
        if (affiliateLink) {
          referredByLinkId = affiliateLink.id;
        }
      }

      const confirmationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const user = await this.prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          balance: 0,
          affiliateBalance: 0,
          role: 'USER',
          referredByLinkId,
          confirmationToken,
          emailVerified: false,
        },
      });

      await this.emailService.sendConfirmationEmail(email, confirmationToken);
      return { message: 'Usuário registrado com sucesso! Um e-mail de confirmação foi enviado.' };
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    console.log('User from DB:', user); // Debug log
    if (!(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.emailVerified) {
      throw new UnauthorizedException('Por favor, confirme seu e-mail primeiro.');
    }
    return this.generateResponse(user);
  }

  async confirmEmail(token: string) {
    const user = await this.prisma.user.findFirst({ where: { confirmationToken: token } });
    if (!user) throw new UnauthorizedException('Token inválido ou expirado');

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, confirmationToken: null },
    });
    console.log('Updated user:', updatedUser); // Debug log
    return { message: 'E-mail confirmado com sucesso!' };
  }

  private generateResponse(user: any) {
    const payload = { id: user.id, email: user.email, role: user.role };
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        balance: user.balance,
        affiliateBalance: user.affiliateBalance,
        emailVerified: user.emailVerified,
      },
      token: this.jwtService.sign(payload),
    };
  }
}