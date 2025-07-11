import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SmsService {
  private readonly apiUrl = 'https://api.sms-activate.ae/stubs/handler_api.php';
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async getNumbersStatus(country: string, operator: string): Promise<any> {
    const apiKey = this.configService.get('smsActivate.apiKey');
    try {
      const response = await lastValueFrom(
        this.httpService.get(`${this.apiUrl}?api_key=${apiKey}&action=getNumbersStatus&country=${country}&operator=${operator}`),
      );
      this.logger.log(`getNumbersStatus response: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get numbers status: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get numbers status: ${error.message}`);
    }
  }

  async getNumber(service: string, country: string, userId: number): Promise<any> {
    const apiKey = this.configService.get('smsActivate.apiKey');
    try {
      const response = await lastValueFrom(
        this.httpService.get(`${this.apiUrl}?api_key=${apiKey}&action=getNumber&service=${service}&country=${country}`),
      );
      this.logger.log(`getNumber response: ${response.data}`);
      
      const [status, activationId, phoneNumber] = response.data.split(':');
      if (status !== 'ACCESS_NUMBER') {
        throw new BadRequestException(`Failed to get number: Invalid status "${status}" from SMS-Activate`);
      }

      // Salvar ativação no banco
      const activation = await this.prisma.smsActivation.create({
        data: {
          userId,
          service,
          country,
          number: phoneNumber,
          status: 'PENDING',
          activationId,
        },
      });

      return { activationId, phoneNumber, activationIdFromDb: activation.id };
    } catch (error) {
      this.logger.error(`Failed to get number: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get number: ${error.message}`);
    }
  }

  async getActivationStatus(activationId: string): Promise<any> {
    const apiKey = this.configService.get('smsActivate.apiKey');
    try {
      const response = await lastValueFrom(
        this.httpService.get(`${this.apiUrl}?api_key=${apiKey}&action=getStatus&id=${activationId}`),
      );
      this.logger.log(`getActivationStatus response: ${response.data}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get activation status: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get activation status: ${error.message}`);
    }
  }
}