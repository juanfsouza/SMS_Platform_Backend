import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
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
    return { message: 'E-mail confirmado com sucesso!' };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException('Nenhum usuário encontrado com esse e-mail.');
    }

    const resetToken = this.jwtService.sign({ id: user.id }, { expiresIn: '1h' }); // Token válido por 1 hora
    const resetLink = `http://localhost:3001/auth/reset-password?token=${resetToken}`;

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken },
    });

    await this.emailService.sendResetPasswordEmail(email, resetLink);
    return { message: 'Um e-mail com instruções para redefinir sua senha foi enviado.' };
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      const decoded = this.jwtService.verify(token);
      const user = await this.prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user || user.resetToken !== token) {
        throw new UnauthorizedException('Token inválido ou expirado');
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
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