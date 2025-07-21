import { Controller, Post, Get, Patch, Body, UseGuards, Req, Query, Param, UnauthorizedException } from '@nestjs/common';
import { AffiliateService } from './affiliate.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { SetAffiliateCommissionDto, RequestWithdrawalDto } from './dtos/affiliate.dto';

@Controller('affiliate')
export class AffiliateController {
  constructor(private readonly affiliateService: AffiliateService) {}

  @UseGuards(JwtAuthGuard)
  @Get('link')
  async getAffiliateLink(@Req() req) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    const code = await this.affiliateService.generateAffiliateLink(userId);
    return { affiliateLink: `https://your-domain.com/register?aff=${code}` };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('commission')
  async setCommission(@Body(new ZodValidationPipe(SetAffiliateCommissionDto)) body: SetAffiliateCommissionDto) {
    await this.affiliateService.setCommissionPercentage(body.percentage);
    return { message: `Affiliate commission set to ${body.percentage}%` };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('commission')
  async getCommission() {
    const percentage = await this.affiliateService.getCommissionPercentage();
    return { percentage };
  }

  @UseGuards(JwtAuthGuard)
  @Post('withdrawal')
  async requestWithdrawal(@Req() req, @Body(new ZodValidationPipe(RequestWithdrawalDto)) body: RequestWithdrawalDto) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    await this.affiliateService.requestWithdrawal(userId, body.amount, body.pixKey);
    return { message: 'Withdrawal request submitted' };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('withdrawals')
  async getWithdrawals(@Query('status') status?: string) {
    return this.affiliateService.getWithdrawalRequests(status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Patch('withdrawals/:id')
  async updateWithdrawal(@Param('id') id: string, @Body() body: { status: 'APPROVED' | 'CANCELLED' }) {
    await this.affiliateService.updateWithdrawalRequest(parseInt(id), body.status);
    return { message: `Withdrawal request ${body.status.toLowerCase()}` };
  }
}