import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class TurnstileService {
  constructor(private configService: ConfigService) {}

  async validateTurnstileToken(token: string, remoteIp?: string): Promise<boolean> {
    const secretKey = this.configService.get<string>('TURNSTILE_SECRET_KEY');
    
    if (!secretKey) {
      throw new BadRequestException('Turnstile secret key not configured');
    }

    try {
      const response = await axios.post(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          secret: secretKey,
          response: token,
          remoteip: remoteIp,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data.success;
    } catch (error) {
      console.error('Turnstile validation error:', error);
      return false;
    }
  }
}