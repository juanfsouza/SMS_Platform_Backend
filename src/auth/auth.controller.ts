import { Controller, Post, Body, Get, Query, UseGuards } from '@nestjs/common';
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
  @UseTurnstile() // Este decorator marca que a rota precisa de CAPTCHA
  async register(@Body(new ZodValidationPipe(RegisterDto)) body: RegisterDto) {
    // O turnstileToken já foi validado pelo guard e removido do body
    const { turnstileToken, ...userData } = body as any;
    return this.authService.register(userData.name, userData.email, userData.password, userData.affiliateCode);
  }

  @Post('login')
  @UseTurnstile() // Este decorator marca que a rota precisa de CAPTCHA
  async login(@Body(new ZodValidationPipe(LoginDto)) body: LoginDto) {
    // O turnstileToken já foi validado pelo guard e removido do body
    const { turnstileToken, ...credentials } = body as any;
    return this.authService.login(credentials.email, credentials.password);
  }

  // Essas rotas NÃO usam @UseTurnstile(), então não precisam de CAPTCHA
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