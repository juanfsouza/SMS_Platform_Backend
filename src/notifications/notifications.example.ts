import { Controller, Post, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications-examples')
export class NotificationsExampleController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('test-sms-purchase')
  async testSmsPurchase() {
    await this.notificationsService.notifySmsPurchase(
      123,
      'whatsapp',
      'BR',
      2.50,
      {
        activationId: 'test123',
        phoneNumber: '+5511999999999',
        priceUsd: 0.50
      }
    );

    return {
      message: 'Notificação de compra de SMS enviada',
      action: 'SMS Purchase'
    };
  }

  @Post('test-balance-recharge')
  async testBalanceRecharge() {
    await this.notificationsService.notifyBalanceRecharge(
      123,
      100.00,
      'PIX',
      {
        transactionId: 'pix123',
        newBalance: 150.00,
        email: 'test@example.com'
      }
    );

    return {
      message: 'Notificação de recarga de saldo enviada',
      action: 'Balance Recharge'
    };
  }

  @Post('test-user-login')
  async testUserLogin() {
    await this.notificationsService.notifyUserLogin(
      123,
      '192.168.1.1',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );

    return {
      message: 'Notificação de login enviada',
      action: 'User Login'
    };
  }

  @Post('test-user-registration')
  async testUserRegistration() {
    await this.notificationsService.notifyUserRegistration(
      123,
      'newuser@example.com',
      '192.168.1.1',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );

    return {
      message: 'Notificação de registro enviada',
      action: 'User Registration'
    };
  }

  @Post('test-profile-update')
  async testProfileUpdate() {
    await this.notificationsService.notifyProfileUpdate(
      123,
      ['name', 'email'],
      '192.168.1.1',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );

    return {
      message: 'Notificação de atualização de perfil enviada',
      action: 'Profile Updated'
    };
  }

  @Post('test-fraud-attempt')
  async testFraudAttempt() {
    await this.notificationsService.notifyFraudAttempt(
      '192.168.1.1',
      'Multiple Failed Login Attempts',
      'Detectadas 5 tentativas de login falhadas em 5 minutos',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    );

    return {
      message: 'Notificação de tentativa de fraude enviada',
      action: 'Fraud Attempt'
    };
  }

  @Post('test-critical-error')
  async testCriticalError() {
    await this.notificationsService.notifyCriticalError(
      'Database connection failed',
      'Payment Processing',
      123,
      {
        errorCode: 'DB_CONNECTION_ERROR',
        timestamp: new Date().toISOString(),
        stack: 'Error: Connection timeout at Database.connect()'
      }
    );

    return {
      message: 'Notificação de erro crítico enviada',
      action: 'Critical Error'
    };
  }

  @Post('test-all-notifications')
  async testAllNotifications() {
    const tests = [
      () => this.testSmsPurchase(),
      () => this.testBalanceRecharge(),
      () => this.testUserLogin(),
      () => this.testUserRegistration(),
      () => this.testProfileUpdate(),
      () => this.testFraudAttempt(),
      () => this.testCriticalError()
    ];

    const results: Array<{ success: boolean } & Record<string, any>> = [];
    for (const test of tests) {
      try {
        const result = await test();
        results.push({ success: true, ...result });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }

    return {
      message: 'Todos os testes de notificação executados',
      results
    };
  }
}
