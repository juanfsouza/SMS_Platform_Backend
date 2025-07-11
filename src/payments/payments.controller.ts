import { Controller, Post, Body, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { CreatePaymentDto } from './dtos/payments.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createPayment(@Req() req, @Body(new ZodValidationPipe(CreatePaymentDto)) body: CreatePaymentDto) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.paymentsService.createPayment(userId, body.amount);
  }
}