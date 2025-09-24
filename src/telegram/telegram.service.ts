import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LogsService } from '../logs/logs.service';
import { LogCategory } from '../logs/dtos/create-log.dto';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private bot: any;

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => LogsService)) private readonly logsService: LogsService,
  ) {
    this.initializeBot();
  }

  private initializeBot() {
    try {
      const TelegramBot = require('node-telegram-bot-api');
      const token = this.configService.get('telegram.botToken');
      
      if (!token) {
        this.logger.warn('Telegram bot token not configured');
        console.log('TELEGRAM_BOT_TOKEN not found in environment variables');
        return;
      }

      this.bot = new TelegramBot(token, { polling: true });
      this.setupCommands();
      this.logger.log('Telegram bot initialized successfully');
      console.log('Telegram bot initialized successfully');
      
      // Teste de envio de mensagem inicial
      this.sendTestMessage();
    } catch (error) {
      this.logger.error('Failed to initialize Telegram bot:', error);
      console.error('Failed to initialize Telegram bot:', error);
    }
  }

  private async sendTestMessage() {
    try {
      const adminChatId = this.configService.get('telegram.adminChatId');
      if (adminChatId && this.bot) {
        // Validar se o chat ID não é de um bot
        if (this.isBotChatId(adminChatId)) {
          console.error('❌ ERRO: TELEGRAM_ADMIN_CHAT_ID está configurado com ID de bot. Use seu ID de usuário pessoal.');
          console.log('📋 Para obter seu ID de usuário:');
          console.log('1. Abra o Telegram e procure por @userinfobot');
          console.log('2. Envie /start');
          console.log('3. Copie o ID fornecido');
          console.log('4. Atualize a variável TELEGRAM_ADMIN_CHAT_ID no .env');
          return;
        }
        
        await this.bot.sendMessage(adminChatId, '🤖 Bot de notificações iniciado com sucesso!', { parse_mode: 'Markdown' });
        console.log('✅ Test message sent successfully');
      }
    } catch (error) {
      console.error('Failed to send test message:', error);
      if (error.message?.includes("bots can't send messages to bots")) {
        console.error('❌ ERRO: TELEGRAM_ADMIN_CHAT_ID está configurado com ID de bot.');
        console.log('📋 Configure com seu ID de usuário pessoal (veja instruções acima)');
      }
    }
  }

  private isBotChatId(chatId: string): boolean {
    // IDs de bot geralmente começam com o mesmo número do token
    // ou têm padrões específicos. Vamos verificar se é um ID de bot.
    const botToken = this.configService.get('telegram.botToken');
    if (botToken) {
      const botId = botToken.split(':')[0];
      return chatId === botId || chatId.startsWith(botId);
    }
    return false;
  }

  async getMyChatId(): Promise<string | null> {
    try {
      const adminChatId = this.configService.get('telegram.adminChatId');
      if (adminChatId && this.bot) {
        // Tentar enviar uma mensagem de teste para verificar se o chat existe
        await this.bot.sendMessage(adminChatId, '🔍 Teste de chat ID - se você recebeu esta mensagem, o chat ID está correto!');
        return adminChatId;
      }
      return null;
    } catch (error) {
      console.error('Error testing chat ID:', error);
      return null;
    }
  }

  private setupCommands() {
    if (!this.bot) return;

    // Comando /start
    this.bot.onText(/\/start/, (msg: any) => {
      const chatId = msg.chat.id;
      const welcomeMessage = `
🤖 **Bot de Logs da API**

Olá! Eu sou o bot que mostra os logs da sua API SMS Platform.

📋 **Comandos disponíveis:**
/logs - Ver logs recentes
/logs_grouped - Ver logs agrupados por categoria
/stats - Ver estatísticas dos logs
/help - Mostrar esta ajuda

🔐 **Para acessar logs específicos:**
/logs_user <user_id> - Logs de um usuário específico
/logs_category <categoria> - Logs de uma categoria específica

💡 **Exemplo:**
/logs_user 123
/logs_category LOGIN
      `;
      
      this.bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
    });

    // Comando /help
    this.bot.onText(/\/help/, (msg: any) => {
      const chatId = msg.chat.id;
      this.bot.sendMessage(chatId, this.getHelpMessage(), { parse_mode: 'Markdown' });
    });

    // Comando /myid - Mostrar o ID do chat
    this.bot.onText(/\/myid/, (msg: any) => {
      const chatId = msg.chat.id;
      const userId = msg.from.id;
      const username = msg.from.username || 'N/A';
      const firstName = msg.from.first_name || 'N/A';
      
      const message = `
🆔 **Seu ID de Chat:**
\`${chatId}\`

👤 **Seu ID de Usuário:** \`${userId}\`
📝 **Nome:** ${firstName}
🔗 **Username:** @${username}

💡 **Para configurar no sistema:**
Adicione esta linha no seu arquivo \`.env\`:
\`\`\`
TELEGRAM_ADMIN_CHAT_ID=${chatId}
\`\`\`
      `;
      
      this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
    });

    // Comando /logs - logs recentes
    this.bot.onText(/\/logs(?: (\d+))?/, async (msg: any, match: any) => {
      const chatId = msg.chat.id;
      const limit = match[1] ? parseInt(match[1]) : 10;
      
      try {
        const result = await this.logsService.getLogs({ limit }, undefined);
        const message = this.formatLogsMessage(result.logs, '📋 **Logs Recentes**');
        this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        this.bot.sendMessage(chatId, '❌ Erro ao buscar logs: ' + error.message);
      }
    });

    // Comando /logs_grouped - logs agrupados
    this.bot.onText(/\/logs_grouped/, async (msg: any) => {
      const chatId = msg.chat.id;
      
      try {
        const groupedLogs = await this.logsService.getLogsGrouped({ limit: 100 }, undefined);
        const message = this.formatGroupedLogsMessage(groupedLogs);
        this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        this.bot.sendMessage(chatId, '❌ Erro ao buscar logs agrupados: ' + error.message);
      }
    });

    // Comando /stats - estatísticas
    this.bot.onText(/\/stats/, async (msg: any) => {
      const chatId = msg.chat.id;
      
      try {
        const stats = await this.logsService.getLogStats();
        const message = this.formatStatsMessage(stats);
        this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        this.bot.sendMessage(chatId, '❌ Erro ao buscar estatísticas: ' + error.message);
      }
    });

    // Comando /logs_user - logs de usuário específico
    this.bot.onText(/\/logs_user (\d+)(?: (\d+))?/, async (msg: any, match: any) => {
      const chatId = msg.chat.id;
      const userId = parseInt(match[1]);
      const limit = match[2] ? parseInt(match[2]) : 10;
      
      try {
        const result = await this.logsService.getLogs({ limit }, userId);
        const message = this.formatLogsMessage(result.logs, `👤 **Logs do Usuário ${userId}**`);
        this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        this.bot.sendMessage(chatId, '❌ Erro ao buscar logs do usuário: ' + error.message);
      }
    });

    // Comando /logs_category - logs de categoria específica
    this.bot.onText(/\/logs_category (\w+)(?: (\d+))?/, async (msg: any, match: any) => {
      const chatId = msg.chat.id;
      const category = match[1].toUpperCase();
      const limit = match[2] ? parseInt(match[2]) : 10;
      
      try {
        const result = await this.logsService.getLogs({ category: category as LogCategory, limit }, undefined);
        const message = this.formatLogsMessage(result.logs, `📁 **Logs da Categoria ${category}**`);
        this.bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        this.bot.sendMessage(chatId, '❌ Erro ao buscar logs da categoria: ' + error.message);
      }
    });

    // Tratamento de erros
    this.bot.on('polling_error', (error: any) => {
      this.logger.error('Telegram bot polling error:', error);
    });
  }

  private formatLogsMessage(logs: any[], title: string): string {
    if (logs.length === 0) {
      return `${title}\n\n📭 Nenhum log encontrado.`;
    }

    let message = `${title}\n\n`;
    
    logs.forEach((log, index) => {
      const categoryIcon = this.getCategoryIcon(log.category);
      const time = this.formatTime(log.createdAt);
      const userInfo = log.user ? `👤 ${log.user.name || log.user.email}` : '👤 Usuário não identificado';
      
      message += `${categoryIcon} **${log.action}**\n`;
      message += `   ${log.description}\n`;
      message += `   ${userInfo} • 🕒 ${time}\n`;
      
      if (index < logs.length - 1) {
        message += '\n';
      }
    });

    return message;
  }

  private formatGroupedLogsMessage(groupedLogs: any[]): string {
    if (groupedLogs.length === 0) {
      return '📋 **Logs Agrupados**\n\n📭 Nenhum log encontrado.';
    }

    let message = '📋 **Logs Agrupados por Categoria**\n\n';
    
    groupedLogs.forEach((group, index) => {
      message += `${group.icon} **${group.categoryName}** (${group.count})\n`;
      
      // Mostrar os primeiros 3 logs de cada categoria
      const recentLogs = group.logs.slice(0, 3);
      recentLogs.forEach((log: any) => {
        const time = this.formatTime(log.createdAt);
        const userInfo = log.user ? `👤 ${log.user.name || log.user.email}` : '👤 Usuário não identificado';
        
        message += `   • ${log.action} - ${userInfo} • 🕒 ${time}\n`;
      });
      
      if (group.logs.length > 3) {
        message += `   • ... e mais ${group.logs.length - 3} logs\n`;
      }
      
      message += '\n';
    });

    return message;
  }

  private formatStatsMessage(stats: any): string {
    let message = '📊 **Estatísticas dos Logs**\n\n';
    message += `📈 **Total de Logs:** ${stats.totalLogs}\n\n`;
    message += '📋 **Por Categoria:**\n';
    
    stats.categoryStats.forEach((stat: any) => {
      message += `${stat.icon} **${stat.categoryName}:** ${stat.count} logs\n`;
    });

    return message;
  }

  private getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      'DOCUMENTATION': '📁',
      'LOGIN': '🔐',
      'MY_APIS': '🔧',
      'PROFILE': '👤',
      'PAYMENT_GENERATED': '💳',
      'PAYMENT_CONFIRMED': '✅',
      'ROUTES_CREATED': '🛣️',
      'ACCOUNT_DELETED': '🗑️',
      'GENERAL': '📝',
      'FRAUD_ATTEMPT': '⚠️',
      'RECHARGE': '💰',
      'SMS_ACTIVATION': '📱',
      'AFFILIATE': '🤝',
      'ADMIN': '👑'
    };
    
    return icons[category] || '📄';
  }

  private formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
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

  private getHelpMessage(): string {
    return `
🤖 **Bot de Logs da API - Ajuda**

📋 **Comandos principais:**
• /start - Iniciar o bot
• /help - Mostrar esta ajuda
• /logs [limite] - Ver logs recentes (padrão: 10)
• /logs_grouped - Ver logs agrupados por categoria
• /stats - Ver estatísticas dos logs

🔍 **Comandos de busca:**
• /logs_user <user_id> [limite] - Logs de usuário específico
• /logs_category <categoria> [limite] - Logs de categoria específica

📁 **Categorias disponíveis:**
• DOCUMENTATION, LOGIN, MY_APIS, PROFILE
• PAYMENT_GENERATED, PAYMENT_CONFIRMED, ROUTES_CREATED
• ACCOUNT_DELETED, GENERAL, FRAUD_ATTEMPT
• RECHARGE, SMS_ACTIVATION, AFFILIATE, ADMIN

💡 **Exemplos:**
• /logs 20 - Ver 20 logs recentes
• /logs_user 123 - Logs do usuário 123
• /logs_category LOGIN - Logs de login
• /logs_category PAYMENT_CONFIRMED 5 - 5 logs de pagamentos confirmados
    `;
  }

  // Método para enviar notificações automáticas
  async sendLogNotification(log: any): Promise<void> {
    console.log('sendLogNotification called with log:', log);
    
    if (!this.bot) {
      console.log('Bot not initialized, cannot send notification');
      return;
    }

    try {
      const adminChatId = this.configService.get('telegram.adminChatId');
      console.log('Admin chat ID:', adminChatId);
      
      if (!adminChatId) {
        console.log('Admin chat ID not configured');
        return;
      }

      // Validar se o chat ID não é de um bot
      if (this.isBotChatId(adminChatId)) {
        console.error('❌ ERRO: TELEGRAM_ADMIN_CHAT_ID está configurado com ID de bot. Use seu ID de usuário pessoal.');
        return;
      }

      const categoryIcon = this.getCategoryIcon(log.category);
      const time = this.formatTime(log.createdAt);
      const userInfo = log.user ? `👤 ${log.user.name || log.user.email}` : '👤 Usuário não identificado';
      
      // Determinar prioridade baseada na categoria
      const priority = this.getNotificationPriority(log.category);
      const priorityIcon = this.getPriorityIcon(priority);

      let message = `${priorityIcon} **${priority} - ${log.category}**\n\n`;
      message += `${categoryIcon} **${log.action}**\n`;
      message += `📝 ${log.description}\n`;
      message += `${userInfo} • 🕒 ${time}\n`;

      // Adicionar informações adicionais se disponíveis
      if (log.metadata) {
        message += `\n📊 **Detalhes:**\n`;
        if (log.metadata.amount) {
          message += `💰 Valor: R$ ${log.metadata.amount}\n`;
        }
        if (log.metadata.service) {
          message += `🔧 Serviço: ${log.metadata.service}\n`;
        }
        if (log.metadata.country) {
          message += `🌍 País: ${log.metadata.country}\n`;
        }
        if (log.metadata.ipAddress) {
          message += `🌐 IP: ${log.metadata.ipAddress}\n`;
        }
      }

      console.log('Sending message to Telegram:', message);
      await this.bot.sendMessage(adminChatId, message, { parse_mode: 'Markdown' });
      console.log('Message sent successfully to Telegram');
    } catch (error) {
      console.error('Failed to send log notification:', error);
      this.logger.error('Failed to send log notification:', error);
    }
  }

  private getNotificationPriority(category: string): string {
    const priorities: Record<string, string> = {
      'FRAUD_ATTEMPT': 'ALTA',
      'ACCOUNT_DELETED': 'ALTA',
      'ADMIN': 'ALTA',
      'PAYMENT_CONFIRMED': 'MÉDIA',
      'PAYMENT_GENERATED': 'MÉDIA',
      'SMS_ACTIVATION': 'MÉDIA',
      'RECHARGE': 'MÉDIA',
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
}
