import { Injectable, Inject, Optional, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLogDto, LogCategory } from './dtos/create-log.dto';
import { LogResponseDto, LogGroupResponseDto } from './dtos/log-response.dto';
import { GetLogsDto } from './dtos/get-logs.dto';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class LogsService {
  constructor(
    private prisma: PrismaService,
    @Optional() @Inject(forwardRef(() => TelegramService)) private telegramService?: TelegramService,
  ) {}

  private readonly categoryConfig = {
    [LogCategory.DOCUMENTATION]: {
      name: 'Documentação',
      icon: '📁',
      color: '#6B7280'
    },
    [LogCategory.LOGIN]: {
      name: 'Login & Registro',
      icon: 'L',
      color: '#EF4444'
    },
    [LogCategory.MY_APIS]: {
      name: 'Minhas APIs',
      icon: 'M',
      color: '#EF4444'
    },
    [LogCategory.PROFILE]: {
      name: 'Perfil',
      icon: 'P',
      color: '#F97316'
    },
    [LogCategory.PAYMENT_GENERATED]: {
      name: 'Pagamento Gerado',
      icon: 'P',
      color: '#F97316'
    },
    [LogCategory.PAYMENT_CONFIRMED]: {
      name: 'Pagamento Confirmado',
      icon: '$',
      color: '#10B981'
    },
    [LogCategory.ROUTES_CREATED]: {
      name: 'Rotas Criadas',
      icon: 'R',
      color: '#EF4444'
    },
    [LogCategory.ACCOUNT_DELETED]: {
      name: 'Deletou sua conta',
      icon: '✏️',
      color: '#6B7280'
    },
    [LogCategory.GENERAL]: {
      name: 'General',
      icon: '#',
      color: '#10B981'
    },
    [LogCategory.FRAUD_ATTEMPT]: {
      name: 'Tentativa de Fraude',
      icon: 'T',
      color: '#EF4444'
    },
    [LogCategory.RECHARGE]: {
      name: 'Recarga',
      icon: 'R',
      color: '#3B82F6'
    },
    [LogCategory.SMS_ACTIVATION]: {
      name: 'Ativação SMS',
      icon: 'S',
      color: '#8B5CF6'
    },
    [LogCategory.AFFILIATE]: {
      name: 'Afiliado',
      icon: 'A',
      color: '#F59E0B'
    },
    [LogCategory.ADMIN]: {
      name: 'Admin',
      icon: 'A',
      color: '#DC2626'
    }
  };

  async createLog(createLogDto: CreateLogDto, userId?: number): Promise<LogResponseDto> {
    const log = await this.prisma.apiLog.create({
      data: {
        ...createLogDto,
        userId,
        metadata: createLogDto.metadata ? JSON.stringify(createLogDto.metadata) : null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    const formattedLog = {
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
    };

    // Enviar notificação para Telegram se for um log importante
    this.sendTelegramNotificationIfImportant(formattedLog);

    return formattedLog;
  }

  async getLogs(getLogsDto: GetLogsDto, userId?: number): Promise<{
    logs: LogResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { category, search, page = 1, limit = 50, startDate, endDate } = getLogsDto;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (userId) {
      where.userId = userId;
    }

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const [logs, total] = await Promise.all([
      this.prisma.apiLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.apiLog.count({ where }),
    ]);

    const formattedLogs = logs.map(log => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
    }));

    return {
      logs: formattedLogs,
      total,
      page,
      limit,
    };
  }

  async getLogsGrouped(getLogsDto: GetLogsDto, userId?: number): Promise<LogGroupResponseDto[]> {
    const { logs } = await this.getLogs({ ...getLogsDto, limit: 1000 }, userId);

    const grouped = logs.reduce((acc, log) => {
      if (!acc[log.category]) {
        acc[log.category] = [];
      }
      acc[log.category].push(log);
      return acc;
    }, {} as Record<string, LogResponseDto[]>);

    return Object.entries(grouped).map(([category, categoryLogs]) => {
      const config = this.categoryConfig[category as LogCategory];
      return {
        category,
        categoryName: config?.name || category,
        icon: config?.icon || '?',
        color: config?.color || '#6B7280',
        logs: categoryLogs,
        count: categoryLogs.length,
      };
    }).sort((a, b) => b.logs[0].createdAt.getTime() - a.logs[0].createdAt.getTime());
  }

  async getLogStats(userId?: number): Promise<{
    totalLogs: number;
    categoryStats: Array<{
      category: string;
      categoryName: string;
      count: number;
      icon: string;
      color: string;
    }>;
  }> {
    const where = userId ? { userId } : {};

    const [totalLogs, categoryStats] = await Promise.all([
      this.prisma.apiLog.count({ where }),
      this.prisma.apiLog.groupBy({
        by: ['category'],
        where,
        _count: { category: true },
      }),
    ]);

    const formattedCategoryStats = categoryStats.map(stat => {
      const config = this.categoryConfig[stat.category as LogCategory];
      return {
        category: stat.category,
        categoryName: config?.name || stat.category,
        count: stat._count.category,
        icon: config?.icon || '?',
        color: config?.color || '#6B7280',
      };
    });

    return {
      totalLogs,
      categoryStats: formattedCategoryStats,
    };
  }

  // Métodos de conveniência para criar logs específicos
  async logLogin(userId: number, action: string, description: string, metadata?: any, ipAddress?: string, userAgent?: string) {
    return this.createLog({
      category: LogCategory.LOGIN,
      action,
      description,
      metadata,
      ipAddress,
      userAgent,
    }, userId);
  }

  async logPayment(userId: number, action: string, description: string, metadata?: any, ipAddress?: string, userAgent?: string) {
    return this.createLog({
      category: LogCategory.PAYMENT_GENERATED,
      action,
      description,
      metadata,
      ipAddress,
      userAgent,
    }, userId);
  }

  async logPaymentConfirmed(userId: number, action: string, description: string, metadata?: any, ipAddress?: string, userAgent?: string) {
    return this.createLog({
      category: LogCategory.PAYMENT_CONFIRMED,
      action,
      description,
      metadata,
      ipAddress,
      userAgent,
    }, userId);
  }

  async logProfile(userId: number, action: string, description: string, metadata?: any, ipAddress?: string, userAgent?: string) {
    return this.createLog({
      category: LogCategory.PROFILE,
      action,
      description,
      metadata,
      ipAddress,
      userAgent,
    }, userId);
  }

  async logRecharge(userId: number, action: string, description: string, metadata?: any, ipAddress?: string, userAgent?: string) {
    return this.createLog({
      category: LogCategory.RECHARGE,
      action,
      description,
      metadata,
      ipAddress,
      userAgent,
    }, userId);
  }

  async logSmsActivation(userId: number, action: string, description: string, metadata?: any, ipAddress?: string, userAgent?: string) {
    return this.createLog({
      category: LogCategory.SMS_ACTIVATION,
      action,
      description,
      metadata,
      ipAddress,
      userAgent,
    }, userId);
  }

  async logFraudAttempt(ipAddress: string, action: string, description: string, metadata?: any, userAgent?: string) {
    return this.createLog({
      category: LogCategory.FRAUD_ATTEMPT,
      action,
      description,
      metadata,
      ipAddress,
      userAgent,
    });
  }

  async logGeneral(action: string, description: string, metadata?: any, userId?: number, ipAddress?: string, userAgent?: string) {
    return this.createLog({
      category: LogCategory.GENERAL,
      action,
      description,
      metadata,
      ipAddress,
      userAgent,
    }, userId);
  }

  private async sendTelegramNotificationIfImportant(log: LogResponseDto) {
    if (!this.telegramService) return;

    // Categorias importantes para notificar
    const importantCategories = [
      LogCategory.FRAUD_ATTEMPT,
      LogCategory.PAYMENT_CONFIRMED,
      LogCategory.ACCOUNT_DELETED,
      LogCategory.ADMIN
    ];

    if (importantCategories.includes(log.category as LogCategory)) {
      try {
        await this.telegramService.sendLogNotification(log);
      } catch (error) {
        console.error('Failed to send Telegram notification:', error);
      }
    }
  }
}
