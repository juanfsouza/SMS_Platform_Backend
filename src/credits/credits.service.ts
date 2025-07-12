import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { lastValueFrom } from 'rxjs';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class CreditsService {
  private readonly logger = new Logger(CreditsService.name);
  private readonly smsActivateApiUrl = 'https://api.sms-activate.ae/stubs/handler_api.php';

  // Manual price overrides for known discrepancies
  private readonly PRICE_OVERRIDES: Record<string, { service: string; country: string; priceUsd: number }> = {
    '0_baa': { service: '0', country: 'baa', priceUsd: 0.97 },
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
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
    const markupPercentage = await this.getMarkupPercentage();

    try {
      const response = await lastValueFrom(
        this.httpService.get(`${this.smsActivateApiUrl}?api_key=${apiKey}&action=getPrices`),
      );
      this.logger.log(`Fetched SMS-Activate prices: ${JSON.stringify(response.data)}`);

      const prices = response.data;
      if (!prices || typeof prices !== 'object') {
        throw new BadRequestException('Invalid SMS-Activate prices response');
      }

      const priceRecords: Array<{ service: string; country: string; priceUsd: number; priceBrl: number }> = [];
      for (const service of Object.keys(prices)) {
        const countries = prices[service];
        if (!countries || typeof countries !== 'object') {
          this.logger.warn(`No countries found for service: ${service}`);
          continue;
        }
        for (const country in countries) {
          let priceUsd = parseFloat(countries[country].cost);
          if (isNaN(priceUsd) || priceUsd <= 0) {
            this.logger.warn(`Invalid price for service: ${service}, country: ${country}`);
            continue;
          }

          // Apply manual override if exists
          const overrideKey = `${service}_${country}`;
          if (this.PRICE_OVERRIDES[overrideKey]) {
            priceUsd = this.PRICE_OVERRIDES[overrideKey].priceUsd;
            this.logger.warn(`Applied price override for service: ${service}, country: ${country}, priceUsd: ${priceUsd}`);
          }

          const priceBrl = priceUsd * exchangeRate * (1 + markupPercentage / 100);
          priceRecords.push({
            service,
            country,
            priceUsd,
            priceBrl: parseFloat(priceBrl.toFixed(2)),
          });
        }
      }

      if (priceRecords.length === 0) {
        throw new BadRequestException('No valid prices found from SMS-Activate');
      }

      await this.prisma.$transaction([
        this.prisma.servicePrice.deleteMany(),
        this.prisma.servicePrice.createMany({ data: priceRecords }),
      ]);
      this.logger.log(`Cached ${priceRecords.length} service prices with ${markupPercentage}% markup`);
    } catch (error) {
      this.logger.error(`Failed to fetch SMS-Activate prices: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to fetch SMS-Activate prices: ${error.message}`);
    }
  }

  async getServicePrice(service: string, country: string): Promise<{ priceBrl: number; priceUsd: number }> {
    const price = await this.prisma.servicePrice.findFirst({
      where: { service, country },
    });
    if (!price) {
      throw new BadRequestException(`Price not found for service ${service} and country ${country}. Please refresh prices.`);
    }
    return { priceBrl: price.priceBrl, priceUsd: price.priceUsd };
  }

  async getAllServicePrices(): Promise<Array<{ service: string; country: string; priceBrl: number; priceUsd: number }>> {
    const prices = await this.prisma.servicePrice.findMany({
      select: { service: true, country: true, priceBrl: true, priceUsd: true },
    });
    if (prices.length === 0) {
      throw new BadRequestException('No prices available. Please refresh prices.');
    }
    return prices;
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handlePriceRefreshCron() {
    this.logger.log('Running daily price refresh cron job');
    await this.fetchAndCacheServicePrices();
    this.logger.log('Daily price refresh completed');
  }
}