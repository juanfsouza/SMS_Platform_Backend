import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailService } from 'src/email/email.service';
import { TurnstileModule } from 'src/turnstile/turnstile.module';
import { TurnstileGuard } from 'src/common/guards/turnstile.guard';

@Module({
  imports: [
    PrismaModule,
    TurnstileModule,
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('jwt.secret'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, EmailService, TurnstileGuard],
  exports: [JwtAuthGuard],
})
export class AuthModule {}