import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../email/email.service';
import { Redis } from 'ioredis';
import { nanoid } from 'nanoid';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    });
  }

  async register(name: string, email: string, password: string, affiliateCode?: string) {
    try {
      const hashedPassword = await bcrypt.hash(password, 12);
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
          emailVerified: false, // Ainda criamos como false, mas não verificamos na autenticação
        },
      });

      try {
        await this.emailService.sendConfirmationEmail(email, confirmationToken);
        return { message: 'Usuário registrado com sucesso! Um e-mail de confirmação foi enviado (opcional).' };
      } catch (emailError) {
        console.warn('Failed to send confirmation email:', emailError);
        return { message: 'Usuário registrado com sucesso! (E-mail de confirmação não pôde ser enviado)' };
      }
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
      await this.redis.set(attemptsKey, attempts + 1, 'EX', 900);
      throw new UnauthorizedException('Invalid credentials');
    }

    // REMOVIDO COMPLETAMENTE: Verificação de email não é mais necessária
    // Email verification is now completely optional - users can login without confirming email
    
    await this.redis.del(attemptsKey);
    return this.generateResponse(user);
  }

  async confirmEmail(token: string) {
    const user = await this.prisma.user.findFirst({ where: { confirmationToken: token } });
    if (!user) throw new UnauthorizedException('Token inválido ou expirado');

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, confirmationToken: null },
    });
    return { message: 'E-mail confirmado com sucesso! Isso melhora a segurança da sua conta.' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('Nenhum usuário encontrado com esse e-mail.');
    }

    const resetToken = this.jwtService.sign({ id: user.id }, { expiresIn: '1h' });
    const hashedResetToken = await bcrypt.hash(resetToken, 12);
    const frontendBaseUrl = this.configService.get('app.baseUrl');
    const resetLink = `${frontendBaseUrl}/reset-password?token=${resetToken}`;

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken: hashedResetToken },
    });

    try {
      await this.emailService.sendResetPasswordEmail(email, resetLink);
      return { message: 'Um e-mail com instruções para redefinir sua senha foi enviado.' };
    } catch (emailError) {
      console.warn('Failed to send reset password email:', emailError);
      throw new BadRequestException('Erro ao enviar e-mail de recuperação. Tente novamente mais tarde.');
    }
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const decoded = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user || !user.resetToken || !(await bcrypt.compare(token, user.resetToken))) {
        throw new UnauthorizedException('Token inválido ou expirado');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 12);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword, resetToken: null },
      });

      return { message: 'Senha redefinida com sucesso!' };
    } catch (error) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  // Método adicional para reenviar email de confirmação (opcional)
  async resendConfirmationEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('Usuário não encontrado.');
    }

    if (user.emailVerified) {
      throw new BadRequestException('E-mail já foi verificado.');
    }

    // Se não há token, gera um novo
    let confirmationToken = user.confirmationToken;
    if (!confirmationToken) {
      confirmationToken = nanoid(32);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { confirmationToken },
      });
    }

    try {
      await this.emailService.sendConfirmationEmail(email, confirmationToken);
      return { message: 'E-mail de confirmação reenviado com sucesso!' };
    } catch (emailError) {
      console.warn('Failed to resend confirmation email:', emailError);
      throw new BadRequestException('Erro ao reenviar e-mail de confirmação. Tente novamente mais tarde.');
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
        emailVerified: user.emailVerified, // Ainda retornamos o status para o frontend mostrar se quer verificar
      },
      token: this.jwtService.sign(payload),
    };
  }
}