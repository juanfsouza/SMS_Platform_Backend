import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../email/email.service';
import { Redis } from 'ioredis';
import { nanoid } from 'nanoid';

@Injectable()
export class AuthService {
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    });
  }

  async register(name: string, email: string, password: string, affiliateCode?: string) {
    try {
      const hashedPassword = await bcrypt.hash(password, 12); // Increased cost factor
      let referredByLinkId: number | null = null;

      if (affiliateCode) {
        const affiliateLink = await this.prisma.affiliateLink.findUnique({ where: { code: affiliateCode } });
        if (affiliateLink) {
          referredByLinkId = affiliateLink.id;
        }
      }

      const confirmationToken = nanoid(32);
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
    const attemptsKey = `login_attempts:${email}`;
    const attempts = parseInt(await this.redis.get(attemptsKey) || '0', 10);

    if (attempts >= 5) {
      throw new UnauthorizedException('Conta bloqueada. Tente novamente em 15 minutos.');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      await this.redis.set(attemptsKey, attempts + 1, 'EX', 900); // 15 min lockout
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Por favor, confirme seu e-mail primeiro.');
    }

    await this.redis.del(attemptsKey); // Reset attempts on success
    return this.generateResponse(user);
  }

  async confirmEmail(token: string) {
    const user = await this.prisma.user.findFirst({ where: { confirmationToken: token } });
    if (!user) throw new UnauthorizedException('Token inválido ou expirado');

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, confirmationToken: null },
    });
    return { message: 'E-mail confirmado com sucesso!' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('Nenhum usuário encontrado com esse e-mail.');
    }

    const resetToken = this.jwtService.sign({ id: user.id }, { expiresIn: '1h' });
    const hashedResetToken = await bcrypt.hash(resetToken, 12); // Hash the reset token
    const resetLink = `https://your-frontend-domain.com/auth/reset-password?token=${resetToken}`;

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken: hashedResetToken },
    });

    await this.emailService.sendResetPasswordEmail(email, resetLink);
    return { message: 'Um e-mail com instruções para redefinir sua senha foi enviado.' };
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const decoded = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user || !user.resetToken || !(await bcrypt.compare(token, user.resetToken))) {
        throw new UnauthorizedException('Token inválido ou expirado');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12); // Increased cost factor
      await this.prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword, resetToken: null },
      });

      return { message: 'Senha redefinida com sucesso!' };
    } catch (error) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
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