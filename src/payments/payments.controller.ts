import { Controller, Post, Body, UseGuards, Req, UnauthorizedException, Headers } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { z } from 'zod';

const CreateCheckoutDto = z.object({
  amount: z.number().positive().min(1, 'Amount must be at least 1'),
});

type CreateCheckoutDto = z.infer<typeof CreateCheckoutDto>;

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create-checkout')
  async createCheckout(@Req() req, @Body(new ZodValidationPipe(CreateCheckoutDto)) body: CreateCheckoutDto) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.paymentsService.createCheckoutLink(userId, body.amount);
  }

  @Post('webhook')
  async handleWebhook(@Body() payload: any, @Headers('x-signature') signature: string) {
    return this.paymentsService.handlePaymentWebhook(payload, signature);
  }
}