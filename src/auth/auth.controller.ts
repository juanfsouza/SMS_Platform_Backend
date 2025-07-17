import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dtos/auth.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

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
}