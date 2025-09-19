export const telegramConfig = {
  botToken: process.env.TELEGRAM_BOT_TOKEN,
  adminChatId: process.env.TELEGRAM_ADMIN_CHAT_ID,
  webhookUrl: process.env.TELEGRAM_WEBHOOK_URL,
  
  // Configurações do bot
  polling: {
    interval: 300,
    autoStart: true,
    params: {
      timeout: 10,
    },
  },
  
  // Configurações de notificações
  notifications: {
    enabled: true,
    logCategories: [
      'FRAUD_ATTEMPT',
      'PAYMENT_CONFIRMED',
      'ACCOUNT_DELETED',
      'ADMIN'
    ],
    maxNotificationsPerMinute: 10,
  },
  
  // Configurações de formatação
  formatting: {
    maxMessageLength: 4096,
    truncateLongMessages: true,
    showUserInfo: true,
    showTimestamps: true,
    useMarkdown: true,
  },
  
  // Configurações de segurança
  security: {
    allowedUsers: process.env.TELEGRAM_ALLOWED_USERS?.split(',') || [],
    requireAdminForSensitiveCommands: true,
    logAllCommands: true,
  }
};
