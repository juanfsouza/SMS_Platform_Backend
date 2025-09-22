import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { EmailService } from '../email/email.service';
import { Redis } from 'ioredis';
import { nanoid } from 'nanoid';
import { ConfigService } from '@nestjs/config';
import { LogsService } from '../logs/logs.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AuthService {
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly logsService: LogsService,
    @Inject(forwardRef(() => NotificationsService)) private readonly notificationsService: NotificationsService,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    });
  }

  // Atualizado para retornar dados do usuário e token após registro
  async register(email: string, password: string, name?: string, affiliateCode?: string, ipAddress?: string, userAgent?: string) {
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
      
      // Preparar dados do usuário
      const userData: any = {
        email,
        password: hashedPassword,
        balance: 0,
        affiliateBalance: 0,
        role: 'USER',
        referredByLinkId,
        confirmationToken,
        emailVerified: false,
      };

      // Só adiciona o nome se foi fornecido
      if (name && name.trim()) {
        userData.name = name.trim();
      }

      const user = await this.prisma.user.create({
        data: userData,
      });

      // Log do registro
      await this.logsService.logLogin(
        user.id,
        'Criou uma conta na plataforma',
        `Criou uma conta na plataforma - Email: ${email}${name ? ` - Nome: ${name}` : ''}${affiliateCode ? ` - Código afiliado: ${affiliateCode}` : ''}`,
        { email, name, affiliateCode, referredByLinkId },
        ipAddress,
        userAgent
      );

      // Notificar registro de usuário
      try {
        await this.notificationsService.notifyUserRegistration(
          user.id,
          email,
          ipAddress,
          userAgent
        );
      } catch (notificationError) {
        console.warn('Failed to send user registration notification:', notificationError);
      }

      // Tentar enviar email de confirmação (sem bloquear o processo)
      try {
        await this.emailService.sendConfirmationEmail(email, confirmationToken);
      } catch (emailError) {
        console.warn('Failed to send confirmation email:', emailError);
      }

      // Retornar dados do usuário e token para login automático
      return {
        success: true,
        message: 'Usuário registrado com sucesso! Um e-mail de confirmação foi enviado (opcional).',
        user: this.generateResponse(user) // Retorna user e token
      };
      
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Email already exists');
      }
      throw error;
    }
  }

  async login(email: string, password: string, ipAddress?: string, userAgent?: string) {
    const attemptsKey = `login_attempts:${email}`;
    const attempts = parseInt(await this.redis.get(attemptsKey) || '0', 10);

    if (attempts >= 5) {
      // Log de tentativa de fraude
      await this.logsService.logFraudAttempt(
        ipAddress || 'unknown',
        'Tentativa de login com conta bloqueada',
        `Tentativa de login com conta bloqueada - Email: ${email} - IP: ${ipAddress}`,
        { email, attempts, reason: 'account_blocked' },
        userAgent
      );
      throw new UnauthorizedException('Conta bloqueada. Tente novamente em 15 minutos.');
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      await this.redis.set(attemptsKey, attempts + 1, 'EX', 900);
      
      // Log de tentativa de login falhada
      await this.logsService.logFraudAttempt(
        ipAddress || 'unknown',
        'Tentativa de login com credenciais inválidas',
        `Tentativa de login com credenciais inválidas - Email: ${email} - IP: ${ipAddress}`,
        { email, attempts: attempts + 1, reason: 'invalid_credentials' },
        userAgent
      );
      
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.redis.del(attemptsKey);
    
    // Log de login bem-sucedido
    await this.logsService.logLogin(
      user.id,
      'Fez login na plataforma',
      `Fez login na plataforma - Email: ${email}`,
      { email, userId: user.id },
      ipAddress,
      userAgent
    );

    // Notificar login do usuário
    try {
      await this.notificationsService.notifyUserLogin(
        user.id,
        ipAddress,
        userAgent
      );
    } catch (notificationError) {
      console.warn('Failed to send user login notification:', notificationError);
    }
    
    return this.generateResponse(user);
  }

  async confirmEmail(token: string, ipAddress?: string, userAgent?: string) {
    const user = await this.prisma.user.findFirst({ where: { confirmationToken: token } });
    if (!user) throw new UnauthorizedException('Token inválido ou expirado');

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, confirmationToken: null },
    });

    // Log de confirmação de email
    await this.logsService.logLogin(
      user.id,
      'Confirmou email',
      `Confirmou email - Email: ${user.email}`,
      { email: user.email, userId: user.id },
      ipAddress,
      userAgent
    );

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

  async resendConfirmationEmail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('Usuário não encontrado.');
    }

    if (user.emailVerified) {
      throw new BadRequestException('E-mail já foi verificado.');
    }

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
        emailVerified: user.emailVerified,
      },
      token: this.jwtService.sign(payload),
    };
  }
}