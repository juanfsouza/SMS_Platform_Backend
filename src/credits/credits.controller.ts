import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { CreditsService } from './credits.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { SetMarkupDto, UpdateMarkupDto, UpdateSinglePriceDto } from './dtos/credits.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('credits')
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('markup')
  async setMarkup(@Body(new ZodValidationPipe(SetMarkupDto)) body: SetMarkupDto) {
    await this.creditsService.setMarkupPercentage(body.percentage);
    return { message: `Markup set to ${body.percentage}%` };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('update-markup')
  async updateMarkup(@Body(new ZodValidationPipe(UpdateMarkupDto)) body: UpdateMarkupDto) {
    await this.creditsService.updateMarkupPercentage(body.percentage);
    return { message: `Markup updated to ${body.percentage}% and prices refreshed` };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('markup')
  async getMarkup() {
    const percentage = await this.creditsService.getMarkupPercentage();
    return { percentage };
  }

  @UseGuards(JwtAuthGuard)
  @Get('prices')
  async getServicePrices(
    @Query('limit') limit: string = '1000',
    @Query('offset') offset: string = '0',
    @Query('includeTotal') includeTotal: string = 'false'
  ) {
    const prices = await this.creditsService.getPaginatedServicePrices(
      parseInt(limit),
      parseInt(offset),
      includeTotal === 'true'
    );
    return prices;
  }

  @UseGuards(JwtAuthGuard)
  @Get('prices/filter')
  async getFilteredServicePrices(
    @Query('service') service?: string,
    @Query('country') country?: string,
    @Query('limit') limit: string = '100',
    @Query('offset') offset: string = '0',
    @Query('includeTotal') includeTotal: string = 'false'
  ) {
    const where = {};
    if (service) where['service'] = service.split(',').map(id => id.trim());
    if (country) where['country'] = country.split(',').map(code => code.trim());
    
    const prices = await this.creditsService.getFilteredServicePricesWithTotal(
      where,
      parseInt(limit),
      parseInt(offset),
      includeTotal === 'true'
    );
    
    console.log('Filtered prices:', Array.isArray(prices) ? prices.map((p: any) => ({ service: p.service, serviceName: p.serviceName, country: p.country })) : prices.prices?.map((p: any) => ({ service: p.service, serviceName: p.serviceName, country: p.country })));
    return prices;
  }

  @UseGuards(JwtAuthGuard)
  @Get('prices/filter-by-name')
  async getFilteredServicePricesByName(
    @Query('serviceName') serviceName: string,
    @Query('limit') limit: string = '100',
    @Query('offset') offset: string = '0',
    @Query('includeTotal') includeTotal: string = 'false'
  ) {
    if (!serviceName || serviceName.trim().length === 0) {
      return { prices: [], total: 0 };
    }
    
    const prices = await this.creditsService.getFilteredServicePricesByName(
      serviceName.trim(),
      parseInt(limit),
      parseInt(offset),
      includeTotal === 'true'
    );
    
    console.log('Filtered prices by name:', Array.isArray(prices) ? prices.map((p: any) => ({ service: p.service, serviceName: p.serviceName, country: p.country })) : prices.prices?.map((p: any) => ({ service: p.service, serviceName: p.serviceName, country: p.country })));
    return prices;
  }

  @UseGuards(JwtAuthGuard)
  @Get('prices/filter-by-country-name')
  async getFilteredServicePricesByCountryName(
    @Query('countryName') countryName: string,
    @Query('limit') limit: string = '100',
    @Query('offset') offset: string = '0',
    @Query('includeTotal') includeTotal: string = 'false'
  ) {
    if (!countryName || countryName.trim().length === 0) {
      return { prices: [], total: 0 };
    }
    
    const prices = await this.creditsService.getFilteredServicePricesByCountryName(
      countryName.trim(),
      parseInt(limit),
      parseInt(offset),
      includeTotal === 'true'
    );
    
    console.log('Filtered prices by country name:', Array.isArray(prices) ? prices.map((p: any) => ({ service: p.service, serviceName: p.serviceName, country: p.country })) : prices.prices?.map((p: any) => ({ service: p.service, serviceName: p.serviceName, country: p.country })));
    return prices;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('refresh-prices')
  async refreshServicePrices() {
    await this.creditsService.fetchAndCacheServicePrices();
    return { message: 'Service prices refreshed' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('update-single-price')
  async updateSinglePrice(@Body(new ZodValidationPipe(UpdateSinglePriceDto)) body: UpdateSinglePriceDto) {
    await this.creditsService.updateSingleServicePrice(
      body.service,
      body.country,
      body.priceBrl,
      body.priceUsd
    );
    return { message: `Price updated for service ${body.service} in country ${body.country}` };
  }
}