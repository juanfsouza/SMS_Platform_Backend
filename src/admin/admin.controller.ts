import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  UseGuards,
  Req,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { AdminService, RefundRequest } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { z } from 'zod';

const RefundDto = z.object({
  activationId: z.string().min(1, 'Activation ID is required'),
  reason: z.string().optional(),
});

const RefundUserDto = z.object({
  userEmail: z.string().email('Invalid email address'),
  reason: z.string().optional(),
});

const PaginationDto = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
  status: z.string().optional(),
  userEmail: z.string().optional(),
  service: z.string().optional(),
});

type RefundDto = z.infer<typeof RefundDto>;
type RefundUserDto = z.infer<typeof RefundUserDto>;
type PaginationDto = z.infer<typeof PaginationDto>;

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * GET /admin/purchase-logs
   * Busca logs de compras de SMS para o admin
   */
  @Get('purchase-logs')
  async getPurchaseLogs(@Query() query: any) {
    const validated = PaginationDto.parse(query);
    
    return await this.adminService.getPurchaseLogs(
      validated.page,
      validated.limit,
      validated.status,
      validated.userEmail,
      validated.service
    );
  }

  /**
   * POST /admin/refund
   * Processa estorno manual de uma compra
   */
  @Post('refund')
  async processRefund(
    @Body(new ZodValidationPipe(RefundDto)) body: RefundDto,
    @Req() req
  ) {
    const adminUserId = req.user?.id;
    if (!adminUserId) {
      throw new UnauthorizedException('Admin not authenticated');
    }

    return await this.adminService.processRefund(
      body.activationId,
      adminUserId,
      body.reason
    );
  }

  /**
   * POST /admin/refund-user
   * Processa estorno de todas as compras elegíveis de um usuário
   */
  @Post('refund-user')
  async processUserRefunds(
    @Body(new ZodValidationPipe(RefundUserDto)) body: RefundUserDto,
    @Req() req
  ) {
    const adminUserId = req.user?.id;
    if (!adminUserId) {
      throw new UnauthorizedException('Admin not authenticated');
    }

    return await this.adminService.processUserRefunds(
      body.userEmail,
      adminUserId,
      body.reason
    );
  }

  /**
   * POST /admin/process-automatic-refunds
   * Executa processo de estorno automático
   */
  @Post('process-automatic-refunds')
  async processAutomaticRefunds(@Req() req) {
    const adminUserId = req.user?.id;
    if (!adminUserId) {
      throw new UnauthorizedException('Admin not authenticated');
    }

    return await this.adminService.processAutomaticRefunds();
  }

  /**
   * GET /admin/stats
   * Busca estatísticas do admin
   */
  @Get('stats')
  async getAdminStats() {
    return await this.adminService.getAdminStats();
  }

  /**
   * GET /admin/purchase-logs/:activationId
   * Busca detalhes de uma compra específica
   */
  @Get('purchase-logs/:activationId')
  async getPurchaseDetails(@Param('activationId') activationId: string) {
    if (!activationId) {
      throw new BadRequestException('Activation ID is required');
    }

    return await this.adminService.getPurchaseLogByActivationId(activationId);
  }
}