import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { LogsService } from '../logs/logs.service';
import { LogCategory } from '../logs/dtos/create-log.dto';

/**
 * Exemplo de como usar o bot do Telegram para visualizar logs
 */
@Controller('telegram-examples')
export class TelegramExampleController {
  constructor(
    private readonly telegramService: TelegramService,
    private readonly logsService: LogsService,
  ) {}

  // Exemplo: Criar um log e receber notificação no Telegram
  @Post('create-log-with-notification')
  async createLogWithNotification(@Body() logData: any) {
    // Criar um log importante que gerará notificação
    const log = await this.logsService.createLog({
      category: LogCategory.FRAUD_ATTEMPT,
      action: 'Tentativa de login suspeita',
      description: 'Tentativa de login com credenciais inválidas - IP: 192.168.1.100',
      metadata: { 
        ip: '192.168.1.100',
        attempts: 5,
        reason: 'multiple_failed_attempts'
      },
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0...',
    });

    return {
      message: 'Log criado e notificação enviada para o Telegram',
      log,
    };
  }

  // Exemplo: Enviar notificação manual
  @Post('send-manual-notification')
  async sendManualNotification(@Body() notificationData: any) {
    const mockLog = {
      id: 999,
      category: LogCategory.PAYMENT_CONFIRMED,
      action: 'Pagamento Confirmado',
      description: 'Pagamento de R$ 100.00 confirmado - Usuário: joao@example.com',
      metadata: { amount: 100, email: 'joao@example.com' },
      createdAt: new Date(),
      user: {
        id: 123,
        email: 'joao@example.com',
        name: 'João Silva',
      },
    };

    await this.telegramService.sendLogNotification(mockLog);

    return {
      message: 'Notificação manual enviada para o Telegram',
    };
  }

  // Exemplo: Testar todos os comandos do bot
  @Post('test-bot-commands')
  async testBotCommands() {
    const commands = [
      {
        command: '/start',
        description: 'Iniciar o bot',
        example: 'Envie /start para iniciar'
      },
      {
        command: '/help',
        description: 'Mostrar ajuda',
        example: 'Envie /help para ver todos os comandos'
      },
      {
        command: '/logs',
        description: 'Ver logs recentes',
        example: 'Envie /logs 10 para ver 10 logs recentes'
      },
      {
        command: '/logs_grouped',
        description: 'Ver logs agrupados',
        example: 'Envie /logs_grouped para ver logs por categoria'
      },
      {
        command: '/stats',
        description: 'Ver estatísticas',
        example: 'Envie /stats para ver estatísticas dos logs'
      },
      {
        command: '/logs_user',
        description: 'Logs de usuário específico',
        example: 'Envie /logs_user 123 para ver logs do usuário 123'
      },
      {
        command: '/logs_category',
        description: 'Logs de categoria específica',
        example: 'Envie /logs_category LOGIN para ver logs de login'
      }
    ];

    return {
      message: 'Comandos do bot disponíveis',
      commands,
      instructions: [
        '1. Configure o TELEGRAM_BOT_TOKEN no .env',
        '2. Configure o TELEGRAM_ADMIN_CHAT_ID no .env',
        '3. Inicie o servidor: npm run start:dev',
        '4. Envie os comandos no Telegram para testar'
      ]
    };
  }

  // Exemplo: Criar logs de diferentes categorias para testar
  @Post('create-sample-logs')
  async createSampleLogs() {
    const sampleLogs = [
      {
        category: LogCategory.LOGIN,
        action: 'Fez login na plataforma',
        description: 'Fez login na plataforma - Email: user@example.com',
        metadata: { email: 'user@example.com' }
      },
      {
        category: LogCategory.PAYMENT_GENERATED,
        action: 'Gerou um pagamento',
        description: 'Gerou um pagamento - Valor: R$ 50.00',
        metadata: { amount: 50, method: 'PIX' }
      },
      {
        category: LogCategory.PAYMENT_CONFIRMED,
        action: 'Pagamento Sucesso',
        description: 'Pagamento Sucesso ⭐ Email: user@example.com - Valor: R$ 50.00',
        metadata: { amount: 50, email: 'user@example.com' }
      },
      {
        category: LogCategory.PROFILE,
        action: 'Acessou a página de perfil',
        description: 'Acessou a página de perfil',
        metadata: { section: 'profile' }
      },
      {
        category: LogCategory.DOCUMENTATION,
        action: 'Acessou a Página de Documentação',
        description: 'Acessou a Página de Documentação - API Reference',
        metadata: { page: 'API Reference' }
      }
    ];

    // Fix: Explicitly type the array to avoid TypeScript inference issues
    const createdLogs: Awaited<ReturnType<typeof this.logsService.createLog>>[] = [];
    
    for (const logData of sampleLogs) {
      const log = await this.logsService.createLog(logData);
      createdLogs.push(log);
    }

    return {
      message: 'Logs de exemplo criados com sucesso',
      logs: createdLogs,
      instructions: [
        'Agora você pode testar os comandos do bot:',
        '/logs - Ver todos os logs criados',
        '/logs_grouped - Ver logs agrupados por categoria',
        '/stats - Ver estatísticas dos logs'
      ]
    };
  }
}