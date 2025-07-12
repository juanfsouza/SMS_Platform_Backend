import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { mapToSmsActivateCodes } from './dtos/buy-sms.dto';

@Injectable()
export class SmsService {
  private readonly apiUrl = 'https://api.sms-activate.ae/stubs/handler_api.php';
  private readonly logger = new Logger(SmsService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly creditsService: CreditsService,
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
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Map user-facing codes to SMS-Activate codes
    const { service: mappedService, country: mappedCountry } = mapToSmsActivateCodes(service, country);

    const { priceBrl, priceUsd } = await this.creditsService.getServicePrice(mappedService, mappedCountry);
    if (user.balance < priceBrl) {
      throw new ForbiddenException(`Insufficient credits. Required: ${priceBrl} credits, Available: ${user.balance} credits`);
    }

    try {
      this.logger.log(`Requesting number for service: ${service}, country: ${country}, mapped to service: ${mappedService}, country: ${mappedCountry}, expected price: ${priceUsd} USD`);
      const response = await lastValueFrom(
        this.httpService.get(`${this.apiUrl}?api_key=${apiKey}&action=getNumber&service=${service}&country=${country}`),
      );
      this.logger.log(`getNumber response: ${response.data}`);

      const [status, activationId, phoneNumber] = response.data.split(':');
      if (status !== 'ACCESS_NUMBER') {
        throw new BadRequestException(`Failed to get number: Invalid status "${status}" from SMS-Activate`);
      }

      const activation = await this.prisma.$transaction([
        this.prisma.user.update({
          where: { id: userId },
          data: { balance: { decrement: priceBrl } },
        }),
        this.prisma.smsActivation.create({
          data: {
            userId,
            service: mappedService,
            country: mappedCountry,
            number: phoneNumber,
            status: 'PENDING',
            activationId,
          },
        }),
        this.prisma.transaction.create({
          data: {
            userId,
            amount: priceBrl,
            type: 'DEBIT',
            status: 'COMPLETED',
            description: `SMS purchase: ${service} (${country}), charged ${priceUsd} USD`,
            smsActivationId: null,
          },
        }),
      ]);

      await this.prisma.transaction.update({
        where: { id: activation[2].id },
        data: { smsActivationId: activation[1].id },
      });

      this.logger.warn(`Please verify SMS-Activate account balance to confirm if ${priceUsd} USD was charged for activationId: ${activationId}`);
      return {
        activationId,
        phoneNumber,
        activationIdFromDb: activation[1].id,
        creditsSpent: priceBrl,
      };
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