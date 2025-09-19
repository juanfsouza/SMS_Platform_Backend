export const LOGS_CONFIG = {
  // Configurações de paginação
  DEFAULT_PAGE_SIZE: 50,
  MAX_PAGE_SIZE: 100,
  
  // Configurações de retenção de logs
  RETENTION_DAYS: 90, // Manter logs por 90 dias
  
  // Configurações de categorias
  CATEGORIES: {
    DOCUMENTATION: {
      name: 'Documentação',
      icon: '📁',
      color: '#6B7280',
      priority: 1
    },
    LOGIN: {
      name: 'Login & Registro',
      icon: 'L',
      color: '#EF4444',
      priority: 2
    },
    MY_APIS: {
      name: 'Minhas APIs',
      icon: 'M',
      color: '#EF4444',
      priority: 3
    },
    PROFILE: {
      name: 'Perfil',
      icon: 'P',
      color: '#F97316',
      priority: 4
    },
    PAYMENT_GENERATED: {
      name: 'Pagamento Gerado',
      icon: 'P',
      color: '#F97316',
      priority: 5
    },
    PAYMENT_CONFIRMED: {
      name: 'Pagamento Confirmado',
      icon: '$',
      color: '#10B981',
      priority: 6
    },
    ROUTES_CREATED: {
      name: 'Rotas Criadas',
      icon: 'R',
      color: '#EF4444',
      priority: 7
    },
    ACCOUNT_DELETED: {
      name: 'Deletou sua conta',
      icon: '✏️',
      color: '#6B7280',
      priority: 8
    },
    GENERAL: {
      name: 'General',
      icon: '#',
      color: '#10B981',
      priority: 9
    },
    FRAUD_ATTEMPT: {
      name: 'Tentativa de Fraude',
      icon: 'T',
      color: '#EF4444',
      priority: 10
    },
    RECHARGE: {
      name: 'Recarga',
      icon: 'R',
      color: '#3B82F6',
      priority: 11
    },
    SMS_ACTIVATION: {
      name: 'Ativação SMS',
      icon: 'S',
      color: '#8B5CF6',
      priority: 12
    },
    AFFILIATE: {
      name: 'Afiliado',
      icon: 'A',
      color: '#F59E0B',
      priority: 13
    },
    ADMIN: {
      name: 'Admin',
      icon: 'A',
      color: '#DC2626',
      priority: 14
    }
  },
  
  // Configurações de filtros
  FILTERS: {
    SEARCH_FIELDS: ['action', 'description'],
    DATE_FORMAT: 'YYYY-MM-DD'
  },
  
  // Configurações de segurança
  SECURITY: {
    MAX_LOGS_PER_REQUEST: 1000,
    RATE_LIMIT_PER_MINUTE: 60,
    SENSITIVE_FIELDS: ['password', 'token', 'secret', 'key']
  }
};

// Função para obter categorias permitidas
export const getAllowedCategories = (): string[] => {
  return Object.keys(LOGS_CONFIG.CATEGORIES);
};
