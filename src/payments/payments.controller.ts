import { Controller, Post, Get, Param, Body, UseGuards, Req, UnauthorizedException, BadRequestException, Query } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';

const CreateCheckoutDto = z.object({
  amount: z.number().positive().min(0.50, 'Amount must be at least 0.50 BRL'),
  affiliateCode: z.string().optional(),
});

const VerifyPaymentDto = z.object({
  transactionId: z.string().min(1, 'Transaction ID is required'),
});

type CreateCheckoutDto = z.infer<typeof CreateCheckoutDto>;
type VerifyPaymentDto = z.infer<typeof VerifyPaymentDto>;

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('create-checkout')
  async createCheckout(@Req() req, @Body() body: CreateCheckoutDto) {
    try {
      const validatedBody = CreateCheckoutDto.parse(body);
      const userId = req.user?.id;
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }
      return await this.paymentsService.createCheckoutLink(userId, validatedBody.amount, validatedBody.affiliateCode);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @Post('webhook')
  async handleWebhook(@Body() payload: any, @Req() req) {
    // Removida validação de webhookSecret e allowedIps
    return await this.paymentsService.handlePaymentWebhook(payload);
  }

  @UseGuards(JwtAuthGuard)
  @Get('transactions/:id')
  async getTransactionStatus(@Req() req, @Param('id') id: string) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return await this.paymentsService.getTransactionStatus(id, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('check-and-process/:id')
  async checkAndProcessPayment(@Req() req, @Param('id') id: string) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    
    try {
      const status = await this.paymentsService.getTransactionStatus(id, userId);
      
      if (status.autoProcessed) {
        return {
          message: 'Payment processed successfully',
          ...status
        };
      }
      
      return {
        message: 'Transaction status checked',
        ...status
      };
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('verify-and-update')
  async verifyAndUpdatePayment(@Body(new ZodValidationPipe(VerifyPaymentDto)) body: VerifyPaymentDto) {
    try {
      return await this.paymentsService.verifyAndUpdatePayment(body.transactionId);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('transactions')
  async getUserTransactions(@Req() req, @Query('page') page?: string, @Query('limit') limit?: string) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    
    const pageNumber = page ? parseInt(page) : 1;
    const limitNumber = limit ? parseInt(limit) : 10;
    
    return await this.paymentsService.getUserTransactions(userId, pageNumber, limitNumber);
  }
}