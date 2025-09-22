import { Injectable, Logger } from '@nestjs/common';
import { TelegramService } from '../telegram/telegram.service';
import { LogsService } from '../logs/logs.service';
import { LogCategory } from '../logs/dtos/create-log.dto';

export interface FrontendAction {
  action: string;
  description: string;
  category: LogCategory;
  userId?: number;
  metadata?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly telegramService: TelegramService,
    private readonly logsService: LogsService,
  ) {}

  /**
   * Notifica ações importantes do frontend
   */
  async notifyFrontendAction(action: FrontendAction): Promise<void> {
    try {
      // Criar log da ação
      const log = await this.logsService.createLog({
        category: action.category,
        action: action.action,
        description: action.description,
        metadata: action.metadata,
        ipAddress: action.ipAddress,
        userAgent: action.userAgent,
      }, action.userId);

      // Enviar notificação específica para o Telegram
      await this.sendFrontendNotification(log, action);

      this.logger.log(`Frontend action notified: ${action.action} - ${action.description}`);
    } catch (error) {
      this.logger.error('Failed to notify frontend action:', error);
    }
  }

  /**
   * Notifica compra de SMS
   */
  async notifySmsPurchase(userId: number, service: string, country: string, amount: number, metadata?: any): Promise<void> {
    await this.notifyFrontendAction({
      action: 'SMS Purchase',
      description: `Usuário comprou SMS para ${service} (${country}) - R$ ${amount.toFixed(2)}`,
      category: LogCategory.SMS_ACTIVATION,
      userId,
      metadata: {
        service,
        country,
        amount,
        ...metadata
      }
    });
  }

  /**
   * Notifica recarga de saldo
   */
  async notifyBalanceRecharge(userId: number, amount: number, paymentMethod: string, metadata?: any): Promise<void> {
    await this.notifyFrontendAction({
      action: 'Balance Recharge',
      description: `Usuário recarregou saldo - R$ ${amount.toFixed(2)} via ${paymentMethod}`,
      category: LogCategory.RECHARGE,
      userId,
      metadata: {
        amount,
        paymentMethod,
        ...metadata
      }
    });
  }

  /**
   * Notifica login do usuário
   */
  async notifyUserLogin(userId: number, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.notifyFrontendAction({
      action: 'User Login',
      description: 'Usuário fez login no sistema',
      category: LogCategory.LOGIN,
      userId,
      ipAddress,
      userAgent
    });
  }

  /**
   * Notifica registro de usuário
   */
  async notifyUserRegistration(userId: number, email: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.notifyFrontendAction({
      action: 'User Registration',
      description: `Novo usuário registrado: ${email}`,
      category: LogCategory.LOGIN,
      userId,
      ipAddress,
      userAgent,
      metadata: { email }
    });
  }

  /**
   * Notifica atualização de perfil
   */
  async notifyProfileUpdate(userId: number, changes: string[], ipAddress?: string, userAgent?: string): Promise<void> {
    await this.notifyFrontendAction({
      action: 'Profile Updated',
      description: `Usuário atualizou perfil: ${changes.join(', ')}`,
      category: LogCategory.PROFILE,
      userId,
      ipAddress,
      userAgent,
      metadata: { changes }
    });
  }

  /**
   * Notifica tentativa de fraude
   */
  async notifyFraudAttempt(ipAddress: string, action: string, description: string, userAgent?: string): Promise<void> {
    await this.notifyFrontendAction({
      action: `Fraud Attempt - ${action}`,
      description,
      category: LogCategory.FRAUD_ATTEMPT,
      ipAddress,
      userAgent
    });
  }

  /**
   * Notifica erro crítico
   */
  async notifyCriticalError(error: string, context: string, userId?: number, metadata?: any): Promise<void> {
    await this.notifyFrontendAction({
      action: 'Critical Error',
      description: `Erro crítico em ${context}: ${error}`,
      category: LogCategory.ADMIN,
      userId,
      metadata: { error, context, ...metadata }
    });
  }

  /**
   * Envia notificação específica para o Telegram
   */
  private async sendFrontendNotification(log: any, action: FrontendAction): Promise<void> {
    if (!this.telegramService) return;

    try {
      const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
      if (!adminChatId) return;

      const categoryIcon = this.getCategoryIcon(action.category);
      const priority = this.getPriority(action.category);
      const priorityIcon = this.getPriorityIcon(priority);
      const time = this.formatTime(new Date());
      const userInfo = log.user ? `👤 ${log.user.name || log.user.email}` : '👤 Usuário não identificado';

      let message = `${priorityIcon} **${priority} - AÇÃO DO FRONTEND**\n\n`;
      message += `${categoryIcon} **${action.action}**\n`;
      message += `📝 ${action.description}\n`;
      message += `${userInfo} • 🕒 ${time}\n`;

      // Adicionar informações específicas baseadas na ação
      if (action.metadata) {
        message += `\n📊 **Detalhes:**\n`;
        
        if (action.metadata.amount) {
          message += `💰 Valor: R$ ${action.metadata.amount.toFixed(2)}\n`;
        }
        if (action.metadata.service) {
          message += `🔧 Serviço: ${action.metadata.service}\n`;
        }
        if (action.metadata.country) {
          message += `🌍 País: ${action.metadata.country}\n`;
        }
        if (action.metadata.paymentMethod) {
          message += `💳 Método: ${action.metadata.paymentMethod}\n`;
        }
        if (action.metadata.email) {
          message += `📧 Email: ${action.metadata.email}\n`;
        }
        if (action.metadata.changes) {
          message += `🔄 Mudanças: ${action.metadata.changes.join(', ')}\n`;
        }
        if (action.ipAddress) {
          message += `🌐 IP: ${action.ipAddress}\n`;
        }
      }

      await this.telegramService['bot']?.sendMessage(adminChatId, message, { parse_mode: 'Markdown' });
    } catch (error) {
      this.logger.error('Failed to send frontend notification:', error);
    }
  }

  private getCategoryIcon(category: LogCategory): string {
    const icons: Record<string, string> = {
      'SMS_ACTIVATION': '📱',
      'RECHARGE': '💰',
      'LOGIN': '🔐',
      'PROFILE': '👤',
      'FRAUD_ATTEMPT': '⚠️',
      'ADMIN': '👑',
      'PAYMENT_CONFIRMED': '✅',
      'PAYMENT_GENERATED': '💳',
      'GENERAL': '📝'
    };
    
    return icons[category] || '📄';
  }

  private getPriority(category: LogCategory): string {
    const priorities: Record<string, string> = {
      'FRAUD_ATTEMPT': 'ALTA',
      'ADMIN': 'ALTA',
      'SMS_ACTIVATION': 'MÉDIA',
      'RECHARGE': 'MÉDIA',
      'PAYMENT_CONFIRMED': 'MÉDIA',
      'LOGIN': 'BAIXA',
      'PROFILE': 'BAIXA',
      'GENERAL': 'BAIXA'
    };
    
    return priorities[category] || 'BAIXA';
  }

  private getPriorityIcon(priority: string): string {
    const icons: Record<string, string> = {
      'ALTA': '🔴',
      'MÉDIA': '🟡',
      'BAIXA': '🟢'
    };
    
    return icons[priority] || '🟢';
  }

  private formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) {
      return `${minutes}m atrás`;
    } else if (hours < 24) {
      return `${hours}h atrás`;
    } else {
      return `${days}d atrás`;
    }
  }
}
