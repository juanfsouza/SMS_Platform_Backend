import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface TurnstileValidationResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
  action?: string;
  cdata?: string;
}

@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);

  constructor(private configService: ConfigService) {}

  async validateTurnstileToken(token: string, remoteIp?: string): Promise<boolean> {
    // Configuração condicional baseada no ambiente
    let secretKey = this.configService.get('turnstile.secretKey') as string | undefined;
    
    // Se não tiver chave configurada e estiver em desenvolvimento, use a chave de teste
    if (!secretKey && process.env.NODE_ENV === 'development') {
      secretKey = '0x4AAAAAABpxumDQpduqUec8CJiD3dVOV9Y';
      this.logger.warn('Using test Turnstile secret key for development');
    }
    
    if (!secretKey || typeof secretKey !== 'string') {
      this.logger.error('Turnstile secret key not configured or invalid');
      throw new BadRequestException('Turnstile secret key not configured');
    }

    // Validação básica do token
    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      this.logger.warn('Invalid or empty turnstile token provided');
      return false;
    }

    try {
      // Preparar dados do formulário (application/x-www-form-urlencoded)
      const formData = new URLSearchParams();
      formData.append('secret', secretKey); // TypeScript agora sabe que secretKey é string
      formData.append('response', token.trim());
      
      if (remoteIp && remoteIp !== 'unknown') {
        formData.append('remoteip', remoteIp);
      }

      this.logger.log(`Validating turnstile token for IP: ${remoteIp || 'unknown'}`);
      this.logger.debug(`Using secret key: ${secretKey.substring(0, 10)}...`);

      const response = await axios.post<TurnstileValidationResponse>(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'FindexSMS/1.0',
          },
          timeout: 10000, // 10 segundos timeout
        }
      );

      this.logger.log(`Turnstile API response: ${JSON.stringify(response.data)}`);

      if (!response.data.success) {
        const errorCodes = response.data['error-codes'] || [];
        this.logger.warn(`Turnstile validation failed. Errors: ${errorCodes.join(', ')}`);
        
        // Log específico para diferentes tipos de erro
        if (errorCodes.includes('invalid-input-secret')) {
          this.logger.error('Invalid Turnstile secret key');
        } else if (errorCodes.includes('invalid-input-response')) {
          this.logger.warn('Invalid Turnstile response token');
        } else if (errorCodes.includes('timeout-or-duplicate')) {
          this.logger.warn('Turnstile token timeout or duplicate');
        } else if (errorCodes.includes('invalid-input-remoteip')) {
          this.logger.warn('Invalid remote IP address');
        }
        
        return false;
      }

      this.logger.log('Turnstile validation successful');
      return true;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        this.logger.error(`Turnstile API error: ${error.response?.status} - ${error.response?.statusText}`);
        this.logger.error(`Response data: ${JSON.stringify(error.response?.data)}`);
        
        if (error.code === 'ECONNREFUSED') {
          this.logger.error('Cannot connect to Turnstile API - network issue');
        } else if (error.code === 'ETIMEDOUT') {
          this.logger.error('Turnstile API request timeout');
        }
      } else {
        this.logger.error(`Turnstile validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      return false;
    }
  }

  /**
   * Método para testar a conectividade com a API do Turnstile
   */
  async testConnection(): Promise<boolean> {
    try {
      // Faz um GET para testar conectividade (vai retornar 405 Method Not Allowed, mas confirma conectividade)
      const response = await axios.get('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        timeout: 5000,
        validateStatus: (status) => status === 405, // 405 é o esperado para GET
      });
      
      this.logger.log('Turnstile API connection test successful');
      return true;
    } catch (error) {
      this.logger.error(`Turnstile connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Método para obter informações de configuração (debug)
   */
  getConfigInfo() {
    const secretKey = this.configService.get('turnstile.secretKey') as string | undefined;
    const siteKey = this.configService.get('turnstile.siteKey') as string | undefined;

    return {
      hasSecretKey: !!secretKey,
      hasSiteKey: !!siteKey,
      secretKeyPrefix: secretKey ? secretKey.substring(0, 10) + '...' : 'N/A',
      siteKeyPrefix: siteKey ? siteKey.substring(0, 10) + '...' : 'N/A',
    };
  }
}