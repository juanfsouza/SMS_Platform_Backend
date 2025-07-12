import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { CreditsService } from './credits.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { SetMarkupDto, UpdateMarkupDto } from './dtos/credits.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';

@Controller('credits')
export class CreditsController {
  constructor(private readonly creditsService: CreditsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('markup')
  async setMarkup(@Body(new ZodValidationPipe(SetMarkupDto)) body: SetMarkupDto) {
    await this.creditsService.setMarkupPercentage(body.percentage);
    return { message: `Markup set to ${body.percentage}%` };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('update-markup')
  async updateMarkup(@Body(new ZodValidationPipe(UpdateMarkupDto)) body: UpdateMarkupDto) {
    await this.creditsService.updateMarkupPercentage(body.percentage);
    return { message: `Markup updated to ${body.percentage}% and prices refreshed` };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('refresh-prices')
  async refreshServicePrices() {
    await this.creditsService.fetchAndCacheServicePrices();
    return { message: 'Service prices refreshed' };
  }
}