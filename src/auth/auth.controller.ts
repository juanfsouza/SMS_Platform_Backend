import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { z } from 'zod';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

const RegisterDto = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const LoginDto = z.object({
  email: z.string().email(),
  password: z.string(),
});

type RegisterDto = z.infer<typeof RegisterDto>;
type LoginDto = z.infer<typeof LoginDto>;

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body(new ZodValidationPipe(RegisterDto)) body: RegisterDto) {
    return this.authService.register(body.email, body.password);
  }

  @Post('login')
  async login(@Body(new ZodValidationPipe(LoginDto)) body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }
}