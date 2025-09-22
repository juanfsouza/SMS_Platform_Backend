import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { NotificationsService, FrontendAction } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('frontend-action')
  @UseGuards(JwtAuthGuard)
  async notifyFrontendAction(
    @Body() action: FrontendAction,
    @Request() req: any
  ) {
    // Adicionar informações do usuário e IP se não fornecidas
    const enhancedAction = {
      ...action,
      userId: action.userId || req.user?.id,
      ipAddress: action.ipAddress || req.ip,
      userAgent: action.userAgent || req.get('User-Agent'),
    };

    await this.notificationsService.notifyFrontendAction(enhancedAction);
    
    return {
      message: 'Ação notificada com sucesso',
      action: action.action
    };
  }

  @Post('sms-purchase')
  @UseGuards(JwtAuthGuard)
  async notifySmsPurchase(
    @Body() data: {
      service: string;
      country: string;
      amount: number;
      metadata?: any;
    },
    @Request() req: any
  ) {
    await this.notificationsService.notifySmsPurchase(
      req.user.id,
      data.service,
      data.country,
      data.amount,
      data.metadata
    );
    
    return {
      message: 'Compra de SMS notificada com sucesso'
    };
  }

  @Post('balance-recharge')
  @UseGuards(JwtAuthGuard)
  async notifyBalanceRecharge(
    @Body() data: {
      amount: number;
      paymentMethod: string;
      metadata?: any;
    },
    @Request() req: any
  ) {
    await this.notificationsService.notifyBalanceRecharge(
      req.user.id,
      data.amount,
      data.paymentMethod,
      data.metadata
    );
    
    return {
      message: 'Recarga de saldo notificada com sucesso'
    };
  }

  @Post('user-login')
  @UseGuards(JwtAuthGuard)
  async notifyUserLogin(@Request() req: any) {
    await this.notificationsService.notifyUserLogin(
      req.user.id,
      req.ip,
      req.get('User-Agent')
    );
    
    return {
      message: 'Login notificado com sucesso'
    };
  }

  @Post('user-registration')
  async notifyUserRegistration(
    @Body() data: {
      userId: number;
      email: string;
    },
    @Request() req: any
  ) {
    await this.notificationsService.notifyUserRegistration(
      data.userId,
      data.email,
      req.ip,
      req.get('User-Agent')
    );
    
    return {
      message: 'Registro de usuário notificado com sucesso'
    };
  }

  @Post('profile-update')
  @UseGuards(JwtAuthGuard)
  async notifyProfileUpdate(
    @Body() data: {
      changes: string[];
    },
    @Request() req: any
  ) {
    await this.notificationsService.notifyProfileUpdate(
      req.user.id,
      data.changes,
      req.ip,
      req.get('User-Agent')
    );
    
    return {
      message: 'Atualização de perfil notificada com sucesso'
    };
  }

  @Post('fraud-attempt')
  async notifyFraudAttempt(
    @Body() data: {
      action: string;
      description: string;
    },
    @Request() req: any
  ) {
    await this.notificationsService.notifyFraudAttempt(
      req.ip,
      data.action,
      data.description,
      req.get('User-Agent')
    );
    
    return {
      message: 'Tentativa de fraude notificada com sucesso'
    };
  }

  @Post('critical-error')
  async notifyCriticalError(
    @Body() data: {
      error: string;
      context: string;
      userId?: number;
      metadata?: any;
    }
  ) {
    await this.notificationsService.notifyCriticalError(
      data.error,
      data.context,
      data.userId,
      data.metadata
    );
    
    return {
      message: 'Erro crítico notificado com sucesso'
    };
  }
}
