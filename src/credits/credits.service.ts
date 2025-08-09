import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CountryMapService } from '../sms/country-map.service';

@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);
  private readonly smsActivateApiUrl = 'https://api.sms-activate.ae/stubs/handler_api.php';
  private readonly FIXED_MARKUP = 1.5;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly countryMapService: CountryMapService,
  ) {}

  async updateMarkupPercentage(percentage: number): Promise<void> {
    if (percentage < 0 || percentage > 1000) {
      throw new BadRequestException('Markup percentage must be between 0 and 1000');
    }
    await this.prisma.markup.upsert({
      where: { id: 1 },
      update: { percentage, updatedAt: new Date() },
      create: { id: 1, percentage, createdAt: new Date(), updatedAt: new Date() },
    });
    this.logger.log(`Markup percentage updated to ${percentage}%`);
    await this.fetchAndCacheServicePrices();
  }

  async setMarkupPercentage(percentage: number): Promise<void> {
    if (percentage < 0 || percentage > 1000) {
      throw new BadRequestException('Markup percentage must be between 0 and 1000');
    }
    await this.prisma.markup.upsert({
      where: { id: 1 },
      update: { percentage, updatedAt: new Date() },
      create: { id: 1, percentage, createdAt: new Date(), updatedAt: new Date() },
    });
    this.logger.log(`Markup percentage set to ${percentage}%`);
  }

  async getMarkupPercentage(): Promise<number> {
    const markup = await this.prisma.markup.findFirst({ where: { id: 1 } });
    return markup?.percentage || 0;
  }

  async fetchAndCacheServicePrices(): Promise<void> {
    const apiKey = this.configService.get('smsActivate.apiKey');
    const exchangeRate = parseFloat(this.configService.get('usdBrlExchangeRate') || '5.5');
    const adminMarkupPercentage = await this.getMarkupPercentage();
    const priceRecords: Array<{ service: string; country: string; priceUsd: number; priceBrl: number }> = [];

    const countryMap = await this.countryMapService.getCountryMap();
    const countryCodes = Object.keys(countryMap);
    this.logger.log(`Country map has ${countryCodes.length} countries: ${countryCodes.join(', ')}`);

    this.logger.log(`Fetching prices for all countries and services`);

    try {
      const response = await lastValueFrom(
        this.httpService.get(`${this.smsActivateApiUrl}?api_key=${apiKey}&action=getPrices`),
      );
      const prices = response.data;
      this.logger.debug(`Fetched SMS-Activate prices: ${JSON.stringify(prices, null, 2)}`);

      if (!prices || typeof prices !== 'object') {
        throw new BadRequestException('Invalid SMS-Activate prices response');
      }

      const countryIds = Object.keys(prices);
      this.logger.log(`Found ${countryIds.length} country IDs from SMS-Activate API: ${countryIds.join(', ')}`);

      for (const countryId of countryIds) {
        if (!countryCodes.includes(countryId)) {
          this.logger.warn(`Country ID ${countryId} not found in countryMap, skipping`);
          continue;
        }
        const services = prices[countryId];
        if (!services || typeof services !== 'object') {
          this.logger.warn(`No services found for country ID: ${countryId}`);
          continue;
        }
        const serviceCodes = Object.keys(services);
        this.logger.debug(`Country ${countryId} has ${serviceCodes.length} services: ${serviceCodes.join(', ')}`);
        for (const service of serviceCodes) {
          const priceData = services[service];
          const priceUsdBase = parseFloat(priceData.cost);
          if (isNaN(priceUsdBase) || priceUsdBase <= 0) {
            this.logger.warn(`Invalid price for country: ${countryId}, service: ${service}, cost: ${priceData.cost}`);
            continue;
          }

          const priceUsd = priceUsdBase * this.FIXED_MARKUP;
          const priceBrl = priceUsd * exchangeRate * (1 + adminMarkupPercentage / 100);
          priceRecords.push({
            service: service,
            country: countryId,
            priceUsd: parseFloat(priceUsd.toFixed(2)),
            priceBrl: parseFloat(priceBrl.toFixed(2)),
          });
        }
      }

      if (priceRecords.length === 0) {
        this.logger.warn('No valid prices found from SMS-Activate API after processing, but proceeding with empty cache');
      } else {
        await this.prisma.$transaction([
          this.prisma.servicePrice.deleteMany(),
          this.prisma.servicePrice.createMany({ data: priceRecords }),
        ]);
        this.logger.log(`Cached ${priceRecords.length} service prices with 50% fixed markup and ${adminMarkupPercentage}% admin markup`);
      }
    } catch (error) {
      this.logger.error(`Failed to fetch SMS-Activate prices: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to fetch SMS-Activate prices: ${error.message}`);
    }
  }

  async getServicePrice(service: string, country: string): Promise<{ priceBrl: number; priceUsd: number }> {
    let price = await this.prisma.servicePrice.findFirst({
      where: { service, country },
    });
    if (!price) {
      this.logger.warn(`Price not found for service=${service}, country=${country}. Triggering price refresh.`);
      await this.fetchAndCacheServicePrices();
      price = await this.prisma.servicePrice.findFirst({
        where: { service, country },
      });
      if (!price) {
        throw new BadRequestException(`Price not found for service ${service} and country ${country} after refresh.`);
      }
    }
    return { priceBrl: price.priceBrl, priceUsd: price.priceUsd };
  }

  async getAllServicePrices(): Promise<Array<{ service: string; country: string; priceBrl: number; priceUsd: number }>> {
    const prices = await this.prisma.servicePrice.findMany({
      select: { service: true, country: true, priceBrl: true, priceUsd: true },
    });
    if (prices.length === 0) {
      this.logger.warn('No prices available in cache');
    }
    this.logger.log(`Returning ${prices.length} service prices`);
    return prices;
  }

  async getFilteredServicePrices(
    where: { service?: string[]; country?: string[] },
    limit: number,
    offset: number,
  ): Promise<Array<{ service: string; country: string; priceBrl: number; priceUsd: number }>> {
    const query: any = {};
    if (where.service?.length) query.service = { in: where.service };
    if (where.country?.length) query.country = { in: where.country };
    const prices = await this.prisma.servicePrice.findMany({
      where: query,
      select: { service: true, country: true, priceBrl: true, priceUsd: true },
      take: limit,
      skip: offset,
    });
    this.logger.log(`Returning ${prices.length} filtered service prices for query: ${JSON.stringify(query)}`);
    return prices;
  }

  async updateSingleServicePrice(service: string, country: string, priceBrl: number, priceUsd: number): Promise<void> {
    const existingPrice = await this.prisma.servicePrice.findFirst({
      where: { service, country },
    });

    if (!existingPrice) {
      throw new BadRequestException(`Price not found for service ${service} and country ${country}`);
    }

    await this.prisma.servicePrice.updateMany({
      where: { service, country },
      data: { 
        priceBrl: parseFloat(priceBrl.toFixed(2)), 
        priceUsd: parseFloat(priceUsd.toFixed(2)) 
      },
    });

    this.logger.log(`Updated single price for service=${service}, country=${country} to BRL=${priceBrl}, USD=${priceUsd}`);
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handlePriceRefreshCron() {
    this.logger.log('Running daily price refresh cron job');
    await this.fetchAndCacheServicePrices();
    this.logger.log('Daily price refresh completed');
  }
}