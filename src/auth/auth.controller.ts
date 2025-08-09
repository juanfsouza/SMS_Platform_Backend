import { Controller, Post, Body, Get, Query, UseGuards, HttpStatus, HttpException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dtos/auth.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { UseTurnstile } from 'src/common/decorators/turnstile.decorator';
import { TurnstileGuard } from 'src/common/guards/turnstile.guard';

@Controller('auth')
@UseGuards(TurnstileGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UseTurnstile()
  async register(@Body(new ZodValidationPipe(RegisterDto)) body: RegisterDto) {
    const { turnstileToken, ...userData } = body as any;
    return this.authService.register(userData.name, userData.email, userData.password, userData.affiliateCode);
  }

  @Post('login')
  @UseTurnstile()
  async login(@Body(new ZodValidationPipe(LoginDto)) body: LoginDto) {
    const { turnstileToken, ...credentials } = body as any;
    return this.authService.login(credentials.email, credentials.password);
  }

  @Get('login')
  async getLogin() {
    throw new HttpException('Use POST for login', HttpStatus.METHOD_NOT_ALLOWED);
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