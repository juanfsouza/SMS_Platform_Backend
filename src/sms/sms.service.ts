import { Injectable, Logger, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreditsService } from '../credits/credits.service';
import { CountryMapService, mapToSmsActivateCodes } from './dtos/buy-sms.dto';
import { StatusDto } from './dtos/status.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SmsService {
  private readonly apiUrl = 'https://api.sms-activate.ae/stubs/handler_api.php';
  private readonly activeSmsUrl = 'https://findexsms.com/sms';
  private readonly logger = new Logger(SmsService.name);
  private readonly MAX_ACTIVATION_AGE = 20 * 60 * 1000; // 20 minutes in milliseconds

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly creditsService: CreditsService,
    private readonly countryMapService: CountryMapService,
    @Inject(forwardRef(() => NotificationsService)) private readonly notificationsService: NotificationsService,
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
    this.logger.log(`Processing getNumber: service=${service}, country=${country}, userId=${userId}`);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      this.logger.error(`User not found: userId=${userId}`);
      throw new BadRequestException('User not found');
    }

    const { service: mappedService, country: mappedCountry } = await mapToSmsActivateCodes(service, country, this.countryMapService);
    this.logger.log(`Mapped: service=${mappedService}, country=${mappedCountry}`);

    let price;
    try {
      price = await this.creditsService.getServicePrice(mappedService, mappedCountry);
      this.logger.log(`Price found: priceBrl=${price.priceBrl}, priceUsd=${price.priceUsd}`);
    } catch (error) {
      this.logger.error(`Price not found for service=${mappedService}, country=${mappedCountry}`);
      throw new BadRequestException(`Price not available for service ${service} and country ${country}. Please refresh prices.`);
    }
    const { priceBrl, priceUsd } = price;

    if (user.balance < priceBrl) {
      this.logger.warn(`Insufficient credits: userId=${userId}, required=${priceBrl}, available=${user.balance}`);
      throw new ForbiddenException(`Insufficient credits. Required: ${priceBrl} credits, Available: ${user.balance} credits`);
    }

    try {
      this.logger.log(`Requesting SMS-Activate: action=getNumber, service=${mappedService}, country=${mappedCountry}`);
      const response = await lastValueFrom(
        this.httpService.get(`${this.apiUrl}?api_key=${apiKey}&action=getNumber&service=${mappedService}&country=${mappedCountry}`)
      );
      this.logger.log(`SMS-Activate response: ${response.data}`);

      const [status, activationId, phoneNumber] = response.data.split(':');
      if (status !== 'ACCESS_NUMBER') {
        this.logger.error(`Invalid SMS-Activate status: ${status}, response: ${response.data}`);
        
        // Tratamento específico para diferentes status de erro
        if (status === 'NO_BALANCE') {
          throw new BadRequestException('SMS-Activate account has insufficient balance. Please contact support to add funds to the SMS-Activate account.');
        } else if (status === 'NO_NUMBERS') {
          throw new BadRequestException('No phone numbers available for this service and country at the moment. Please try again later.');
        } else if (status === 'WRONG_SERVICE') {
          throw new BadRequestException('Invalid service selected. Please choose a different service.');
        } else if (status === 'WRONG_COUNTRY') {
          throw new BadRequestException('Invalid country selected. Please choose a different country.');
        } else if (status === 'BAD_ACTION') {
          throw new BadRequestException('Invalid action. Please contact support.');
        } else if (status === 'BAD_SERVICE') {
          throw new BadRequestException('Service not available. Please choose a different service.');
        } else if (status === 'BAD_KEY') {
          throw new BadRequestException('SMS-Activate API key is invalid. Please contact support.');
        } else if (status === 'ERROR_SQL') {
          throw new BadRequestException('Database error on SMS-Activate. Please try again later.');
        } else if (status === 'BANNED') {
          throw new BadRequestException('Account is banned. Please contact support.');
        } else {
          throw new BadRequestException(`Failed to get number: Invalid status "${status}" from SMS-Activate`);
        }
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
            description: `SMS purchase: ${service} (${country}), expected ${priceUsd} USD`,
            smsActivationId: null,
          },
        }),
      ]);

      await this.prisma.transaction.update({
        where: { id: activation[2].id },
        data: { smsActivationId: activation[1].id },
      });

      // Notificar compra de SMS
      try {
        await this.notificationsService.notifySmsPurchase(
          userId,
          service,
          country,
          priceBrl,
          {
            activationId,
            phoneNumber,
            priceUsd,
            mappedService,
            mappedCountry
          }
        );
      } catch (notificationError) {
        this.logger.error('Failed to send SMS purchase notification:', notificationError);
      }

      this.logger.warn(`Please verify SMS-Activate account balance for activationId: ${activationId}`);
      return {
        activationId,
        phoneNumber,
        activationIdFromDb: activation[1].id,
        creditsSpent: priceBrl,
        balance: activation[0].balance,
      };
    } catch (error) {
      this.logger.error(`Failed to get number: ${error.message}, stack: ${error.stack}`);
      throw new BadRequestException(`Failed to get number: ${error.message}`);
    }
  }

  async getActivationStatus(activationId: string): Promise<any> {
    const apiKey = this.configService.get('smsActivate.apiKey');
    try {
      const response = await lastValueFrom(
        this.httpService.get(`${this.apiUrl}?api_key=${apiKey}&action=getStatus&id=${activationId}`),
      );
      this.logger.log(`getActivationStatus response for activationId=${activationId}: ${response.data}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get activation status for activationId=${activationId}: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get activation status: ${error.message}`);
    }
  }

  async getActiveSmsStatus(activationId: string): Promise<any> {
    try {
      const response = await lastValueFrom(
        this.httpService.get(`${this.activeSmsUrl}/status/${activationId}`),
      );
      this.logger.log(`ActiveSMS status response for activationId=${activationId}: ${JSON.stringify(response.data)}`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get ActiveSMS status for activationId=${activationId}: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get ActiveSMS status: ${error.message}`);
    }
  }

  async buyActiveSmsNumber(service: string, country: string, userId: number): Promise<any> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Mapear serviço e país para ActiveSMS
    const mappedService = this.mapServiceToActiveSms(service);
    const mappedCountry = this.mapCountryToActiveSms(country);

    // Obter preço
    const priceUsd = await this.getActiveSmsPrice(mappedService, mappedCountry);
    const priceBrl = priceUsd * 5.5; // Conversão USD para BRL (ajuste conforme necessário)

    if (user.balance < priceBrl) {
      throw new BadRequestException(`Insufficient balance. Required: ${priceBrl.toFixed(2)} credits, Available: ${user.balance} credits`);
    }

    try {
      this.logger.log(`Requesting ActiveSMS: service=${mappedService}, country=${mappedCountry}`);
      
      // Fazer a compra no ActiveSMS
      const buyResponse = await lastValueFrom(
        this.httpService.post(`${this.activeSmsUrl}/buy`, {
          service: mappedService,
          country: mappedCountry,
        }),
      );
      
      this.logger.log(`ActiveSMS buy response: ${JSON.stringify(buyResponse.data)}`);
      
      if (buyResponse.data.status !== 'success' || !buyResponse.data.array || buyResponse.data.array.length === 0) {
        throw new BadRequestException('Failed to purchase number from ActiveSMS');
      }

      const activationData = buyResponse.data.array[0];
      const activationId = activationData.id;
      const phoneNumber = activationData.phone;

      // Criar registro no banco de dados
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
            description: `SMS purchase: ${service} (${country}), expected ${priceUsd} USD`,
            smsActivationId: null,
          },
        }),
      ]);

      await this.prisma.transaction.update({
        where: { id: activation[2].id },
        data: { smsActivationId: activation[1].id },
      });

      // Notificar compra de SMS
      try {
        await this.notificationsService.notifySmsPurchase(
          userId,
          service,
          country,
          priceBrl,
          {
            activationId,
            phoneNumber,
            priceUsd,
            mappedService,
            mappedCountry
          }
        );
      } catch (notificationError) {
        this.logger.error('Failed to send SMS purchase notification:', notificationError);
      }

      this.logger.log(`ActiveSMS purchase successful for activationId: ${activationId}`);
      return {
        activationId,
        phoneNumber,
        activationIdFromDb: activation[1].id,
        creditsSpent: priceBrl,
        balance: activation[0].balance,
      };
    } catch (error) {
      this.logger.error(`Failed to buy ActiveSMS number: ${error.message}, stack: ${error.stack}`);
      throw new BadRequestException(`Failed to buy number: ${error.message}`);
    }
  }

  private mapServiceToActiveSms(service: string): string {
    // Mapear serviços do seu sistema para ActiveSMS
    const serviceMap: Record<string, string> = {
      'telegram': 'tg',
      'whatsapp': 'wa',
      'twitter': 'tw',
      'instagram': 'ig',
      'facebook': 'fb',
      'google': 'go',
      'youtube': 'yt',
      'tiktok': 'tt',
      'discord': 'ds',
      'snapchat': 'sc',
      'linkedin': 'li',
      'twitch': 'tw',
      'viber': 'vi',
      'line': 'ln',
      'wechat': 'wc',
      'kakao': 'kk',
    };
    return serviceMap[service.toLowerCase()] || service;
  }

  private mapCountryToActiveSms(country: string): string {
    // Mapear países do seu sistema para ActiveSMS
    const countryMap: Record<string, string> = {
      'brazil': '48',
      'usa': '1',
      'uk': '44',
      'germany': '49',
      'france': '33',
      'spain': '34',
      'italy': '39',
      'russia': '7',
      'china': '86',
      'india': '91',
      'japan': '81',
      'southkorea': '82',
      'thailand': '66',
      'vietnam': '84',
      'philippines': '63',
      'indonesia': '62',
      'malaysia': '60',
      'singapore': '65',
      'australia': '61',
      'canada': '1',
      'mexico': '52',
      'argentina': '54',
      'chile': '56',
      'colombia': '57',
      'peru': '51',
      'venezuela': '58',
      'ecuador': '593',
      'uruguay': '598',
      'paraguay': '595',
      'bolivia': '591',
    };
    return countryMap[country.toLowerCase()] || country;
  }

  private async getActiveSmsPrice(service: string, country: string): Promise<number> {
    // Implementar lógica para obter preços do ActiveSMS
    // Por enquanto, retornar um valor padrão
    return 0.35; // USD
  }

  async getSmsActivateBalance(): Promise<any> {
    const apiKey = this.configService.get('smsActivate.apiKey');
    try {
      const response = await lastValueFrom(
        this.httpService.get(`${this.apiUrl}?api_key=${apiKey}&action=getBalance`),
      );
      this.logger.log(`SMS-Activate balance response: ${response.data}`);
      
      // A resposta do SMS-Activate para getBalance é: ACCESS_BALANCE:valor
      const [status, balance] = response.data.split(':');
      if (status !== 'ACCESS_BALANCE') {
        throw new BadRequestException(`Failed to get balance: ${response.data}`);
      }
      
      return {
        balance: parseFloat(balance),
        currency: 'USD',
        status: 'success'
      };
    } catch (error) {
      this.logger.error(`Failed to get SMS-Activate balance: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get SMS-Activate balance: ${error.message}`);
    }
  }

  async getRecentActivations(userId: number): Promise<any> {
    const cutoffTime = new Date(Date.now() - this.MAX_ACTIVATION_AGE);
    try {
      const activations = await this.prisma.smsActivation.findMany({
        where: {
          userId,
          createdAt: { gte: cutoffTime },
          OR: [
            { status: { notIn: ['COMPLETED', 'CANCELLED'] } },
            { code: { not: null } },
          ],
        },
        include: { transactions: true },
        orderBy: { createdAt: 'desc' },
      });

      const result = await Promise.all(
        activations.map(async (activation) => {
          let parsedStatus = { status: activation.status.toLowerCase(), code: activation.code };
          if (activation.activationId) {
            const statusData = await this.getActivationStatus(activation.activationId);
            parsedStatus = StatusDto.parse(statusData);
          } else {
            this.logger.warn(`No activationId for SmsActivation id=${activation.id}, using database status`);
          }

          const debitTransaction = activation.transactions.find(
            (t) => t.type === 'DEBIT' && t.status === 'COMPLETED',
          );
          return {
            activationId: activation.activationId || `missing-${activation.id}`,
            phoneNumber: activation.number,
            creditsSpent: debitTransaction?.amount || 0,
            service: activation.service,
            countryId: activation.country,
            priceBrl: debitTransaction?.amount || 0,
            createdAt: activation.createdAt.getTime(),
            status: parsedStatus.status === 'success' ? '2' : parsedStatus.status === 'pending' ? '1' : '8',
            code: parsedStatus.code || null,
          };
        })
      );

      this.logger.log(`Fetched ${result.length} recent activations for user ${userId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to fetch recent activations for user ${userId}: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to fetch recent activations: ${error.message}`);
    }
  }
}