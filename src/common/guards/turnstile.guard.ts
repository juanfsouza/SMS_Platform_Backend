import { Injectable, CanActivate, ExecutionContext, BadRequestException, Logger, UnauthorizedException } from '@nestjs/common';
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
      this.logger.debug('Route does not require Turnstile validation');
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const remoteIp = this.getClientIp(request);
    
    this.logger.log(`Turnstile validation required for ${request.method} ${request.url} from IP: ${remoteIp}`);

    // Tenta encontrar o token em diferentes lugares
    const turnstileToken = 
      request.body?.turnstileToken || 
      request.headers['cf-turnstile-response'] ||
      request.headers['turnstile-token'] ||
      request.query?.turnstileToken;

    if (!turnstileToken) {
      this.logger.warn(`Turnstile token missing for ${request.method} ${request.url} from IP: ${remoteIp}`);
      this.logger.debug(`Request body keys: ${Object.keys(request.body || {})}`);
      this.logger.debug(`Request headers: ${JSON.stringify(request.headers)}`);
      throw new BadRequestException({
        message: 'CAPTCHA token is required',
        code: 'TURNSTILE_TOKEN_MISSING',
        details: 'Complete the security verification to continue'
      });
    }

    try {
      this.logger.log(`Validating Turnstile token: ${turnstileToken.substring(0, 20)}...`);
      
      const isValid = await this.turnstileService.validateTurnstileToken(turnstileToken, remoteIp);

      if (!isValid) {
        this.logger.warn(`Invalid Turnstile token from IP: ${remoteIp}`);
        throw new UnauthorizedException({
          message: 'Invalid CAPTCHA token',
          code: 'TURNSTILE_VALIDATION_FAILED',
          details: 'Security verification failed. Please try again.'
        });
      }

      // Remove o token do body após validação bem-sucedida
      // para não interferir com outros pipes/validações
      if (request.body?.turnstileToken) {
        delete request.body.turnstileToken;
      }

      this.logger.log(`Turnstile validation successful for ${request.method} ${request.url} from IP: ${remoteIp}`);
      return true;

    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }
      
      this.logger.error(`Turnstile validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new BadRequestException({
        message: 'CAPTCHA validation failed',
        code: 'TURNSTILE_VALIDATION_ERROR',
        details: 'An error occurred during security verification'
      });
    }
  }

  private getClientIp(request: any): string {
    const possibleHeaders = [
      'cf-connecting-ip', // Cloudflare
      'x-forwarded-for', // Proxy/Load balancer
      'x-real-ip', // Nginx
      'x-client-ip', // Apache
      'x-cluster-client-ip', // Cluster
      'forwarded-for',
      'forwarded',
    ];

    for (const header of possibleHeaders) {
      const value = request.headers[header];
      if (value) {
        // Para x-forwarded-for, pegar o primeiro IP
        const ip = value.split(',')[0].trim();
        if (this.isValidIp(ip)) {
          return ip;
        }
      }
    }

    // Fallback para IPs da conexão
    return (
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      request.ip ||
      '0.0.0.0'
    );
  }

  private isValidIp(ip: string): boolean {
    // Regex simples para validar IPv4 e IPv6
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }
}