import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dtos/auth.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { z } from 'zod';

const ForgotPasswordDto = z.object({
  email: z.string().email('Invalid email address'),
});

const ResetPasswordDto = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type ForgotPasswordDto = z.infer<typeof ForgotPasswordDto>;
type ResetPasswordDto = z.infer<typeof ResetPasswordDto>;

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body(new ZodValidationPipe(RegisterDto)) body: RegisterDto & { affiliateCode?: string }) {
    return this.authService.register(body.name, body.email, body.password, body.affiliateCode);
  }

  @Post('login')
  async login(@Body(new ZodValidationPipe(LoginDto)) body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Get('confirm-email')
  async confirmEmail(@Query('token') token: string) {
    return this.authService.confirmEmail(token);
  }

  @Post('forgot-password')
  async forgotPassword(@Body(new ZodValidationPipe(ForgotPasswordDto)) body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  async resetPassword(@Body(new ZodValidationPipe(ResetPasswordDto)) body: ResetPasswordDto) {
    return this.authService.resetPassword(body.token, body.password);
  }
}