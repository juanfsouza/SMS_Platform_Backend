import { Injectable, CanActivate, ExecutionContext, BadRequestException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TurnstileService } from '../../turnstile/turnstile.service';
import { TURNSTILE_KEY } from '../decorators/turnstile.decorator';

@Injectable()
export class TurnstileGuard implements CanActivate {
  private readonly logger = new Logger(TurnstileGuard.name);

  constructor(
    private reflector: Reflector,
    private turnstileService: TurnstileService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiresTurnstile = this.reflector.getAllAndOverride<boolean>(TURNSTILE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Se a rota não requer Turnstile, permite acesso
    if (!requiresTurnstile) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    
    // Tenta encontrar o token em diferentes lugares
    const turnstileToken = 
      request.body.turnstileToken || 
      request.headers['cf-turnstile-response'] ||
      request.query.turnstileToken;

    if (!turnstileToken) {
      this.logger.warn(`Turnstile token missing for ${request.method} ${request.url}`);
      throw new BadRequestException('CAPTCHA token is required');
    }

    try {
      const remoteIp = this.getClientIp(request);
      const isValid = await this.turnstileService.validateTurnstileToken(turnstileToken, remoteIp);

      if (!isValid) {
        this.logger.warn(`Invalid Turnstile token from IP: ${remoteIp}`);
        throw new BadRequestException('Invalid CAPTCHA token');
      }

      // Remove o token do body após validação bem-sucedida
      // para não interferir com outros pipes/validações
      if (request.body.turnstileToken) {
        delete request.body.turnstileToken;
      }

      this.logger.log(`Turnstile validation successful for ${request.method} ${request.url}`);
      return true;

    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      
      this.logger.error(`Turnstile validation error: ${error.message}`);
      throw new BadRequestException('CAPTCHA validation failed');
    }
  }

  private getClientIp(request: any): string {
    return (
      request.headers['cf-connecting-ip'] || // Cloudflare
      request.headers['x-forwarded-for']?.split(',')[0] || // Proxy
      request.headers['x-real-ip'] || // Nginx
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      'unknown'
    );
  }
}