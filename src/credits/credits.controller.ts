import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { CreditsService } from './credits.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { SetMarkupDto, UpdateMarkupDto } from './dtos/credits.dto';
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
  async getServicePrices() {
    return this.creditsService.getAllServicePrices();
  }

  @UseGuards(JwtAuthGuard)
  @Get('prices/filter')
  async getFilteredServicePrices(
    @Query('service') service?: string,
    @Query('country') country?: string,
    @Query('limit') limit: string = '1000',
    @Query('offset') offset: string = '0',
  ) {
    const where = {};
    if (service) where['service'] = service.split(',').map(id => id.trim()); // Array of country IDs
    if (country) where['country'] = country.split(',').map(code => code.trim()); // Array of service codes
    const prices = await this.creditsService.getFilteredServicePrices(
      where,
      parseInt(limit),
      parseInt(offset),
    );
    console.log('Filtered prices:', prices.map((p) => ({ service: p.service, country: p.country })));
    return prices;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('refresh-prices')
  async refreshServicePrices() {
    await this.creditsService.fetchAndCacheServicePrices();
    return { message: 'Service prices refreshed' };
  }
}