import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { LogsService } from './logs.service';
import { LogCategory } from './dtos/create-log.dto';

@Injectable()
export class GlobalLoggingMiddleware implements NestMiddleware {
  constructor(private readonly logsService: LogsService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    
    // Capturar informações da requisição
    const method = req.method;
    const url = req.url;
    const userId = (req as any).user?.id;
    const ipAddress = this.getClientIp(req);
    const userAgent = req.get('User-Agent') || 'Unknown';

    // Pular logs para rotas que não são importantes
    if (this.shouldSkipLogging(url, method)) {
      return next();
    }

    // Interceptar a resposta para capturar o status
    const originalSend = res.send;
    res.send = function(data) {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      
      // Log assíncrono para não bloquear a resposta
      setImmediate(async () => {
        try {
          await GlobalLoggingMiddleware.prototype.logRequest({
            method,
            url,
            statusCode,
            duration,
            userId,
            ipAddress,
            userAgent,
            body: req.body,
            query: req.query,
            params: req.params
          });
        } catch (error) {
          console.error('Failed to log request:', error);
        }
      });

      return originalSend.call(this, data);
    };

    next();
  }

  private async logRequest(requestInfo: {
    method: string;
    url: string;
    statusCode: number;
    duration: number;
    userId?: number;
    ipAddress: string;
    userAgent: string;
    body: any;
    query: any;
    params: any;
  }) {
    const { method, url, statusCode, duration, userId, ipAddress, userAgent, body, query, params } = requestInfo;

    // Determinar categoria e ação baseado na URL e método
    const { category, action, description } = this.categorizeRequest(method, url, body, query, params);

    // Só criar log se for uma ação importante e se o usuário estiver autenticado
    if (this.isImportantAction(category, action) && userId) {
      await this.logsService.createLog({
        category,
        action,
        description,
        metadata: {
          method,
          url,
          statusCode,
          duration,
          body: this.sanitizeBody(body),
          query,
          params,
          timestamp: new Date().toISOString()
        },
        ipAddress,
        userAgent
      }, userId);
    }
  }

  private categorizeRequest(method: string, url: string, body: any, query: any, params: any): {
    category: LogCategory;
    action: string;
    description: string;
  } {
    // Mapear URLs para categorias e ações
    const urlLower = url.toLowerCase();

    // Login e autenticação
    if (urlLower.includes('/auth/login')) {
      return {
        category: LogCategory.LOGIN,
        action: 'Fez login na plataforma',
        description: 'Usuário fez login no sistema'
      };
    }

    if (urlLower.includes('/auth/register')) {
      return {
        category: LogCategory.LOGIN,
        action: 'Registrou nova conta',
        description: 'Usuário registrou uma nova conta'
      };
    }

    // Perfil
    if (urlLower.includes('/profile') || urlLower.includes('/user/profile')) {
      if (method === 'GET') {
        return {
          category: LogCategory.PROFILE,
          action: 'Acessou perfil',
          description: 'Usuário acessou página de perfil'
        };
      } else if (method === 'PUT' || method === 'PATCH') {
        return {
          category: LogCategory.PROFILE,
          action: 'Atualizou perfil',
          description: 'Usuário atualizou informações do perfil'
        };
      }
    }

    // APIs
    if (urlLower.includes('/my-apis') || urlLower.includes('/api-keys')) {
      if (method === 'GET') {
        return {
          category: LogCategory.MY_APIS,
          action: 'Acessou minhas APIs',
          description: 'Usuário acessou painel de APIs'
        };
      } else if (method === 'POST') {
        return {
          category: LogCategory.MY_APIS,
          action: 'Criou nova API',
          description: 'Usuário criou uma nova chave de API'
        };
      } else if (method === 'DELETE') {
        return {
          category: LogCategory.MY_APIS,
          action: 'Deletou API',
          description: 'Usuário deletou uma chave de API'
        };
      }
    }

    // SMS
    if (urlLower.includes('/sms')) {
      if (urlLower.includes('/buy') || urlLower.includes('/purchase')) {
        return {
          category: LogCategory.SMS_ACTIVATION,
          action: 'Comprou SMS',
          description: 'Usuário comprou ativação SMS'
        };
      } else if (urlLower.includes('/activate')) {
        return {
          category: LogCategory.SMS_ACTIVATION,
          action: 'Ativou SMS',
          description: 'Usuário ativou número SMS'
        };
      } else if (method === 'GET') {
        return {
          category: LogCategory.SMS_ACTIVATION,
          action: 'Acessou SMS',
          description: 'Usuário acessou painel de SMS'
        };
      }
    }

    // Pagamentos
    if (urlLower.includes('/payment') || urlLower.includes('/pix') || urlLower.includes('/credits')) {
      if (urlLower.includes('/generate') || urlLower.includes('/create')) {
        return {
          category: LogCategory.PAYMENT_GENERATED,
          action: 'Gerou pagamento',
          description: 'Usuário gerou link de pagamento'
        };
      } else if (urlLower.includes('/confirm') || urlLower.includes('/webhook')) {
        return {
          category: LogCategory.PAYMENT_CONFIRMED,
          action: 'Pagamento confirmado',
          description: 'Pagamento foi confirmado'
        };
      } else if (method === 'GET') {
        return {
          category: LogCategory.RECHARGE,
          action: 'Acessou recarga',
          description: 'Usuário acessou página de recarga'
        };
      }
    }

    // Afiliados
    if (urlLower.includes('/affiliate')) {
      if (method === 'GET') {
        return {
          category: LogCategory.AFFILIATE,
          action: 'Acessou afiliados',
          description: 'Usuário acessou painel de afiliados'
        };
      } else if (method === 'POST') {
        return {
          category: LogCategory.AFFILIATE,
          action: 'Ação de afiliado',
          description: 'Usuário realizou ação de afiliado'
        };
      }
    }

    // Documentação
    if (urlLower.includes('/docs') || urlLower.includes('/documentation')) {
      return {
        category: LogCategory.DOCUMENTATION,
        action: 'Acessou documentação',
        description: 'Usuário acessou documentação da API'
      };
    }

    // Admin
    if (urlLower.includes('/admin')) {
      return {
        category: LogCategory.ADMIN,
        action: 'Ação administrativa',
        description: 'Usuário realizou ação administrativa'
      };
    }

    // Ação genérica
    return {
      category: LogCategory.GENERAL,
      action: `${method} ${url}`,
      description: `Usuário acessou ${url}`
    };
  }

  private isImportantAction(category: LogCategory, action: string): boolean {
    // Lista de categorias importantes
    const importantCategories = [
      LogCategory.LOGIN,
      LogCategory.PROFILE,
      LogCategory.MY_APIS,
      LogCategory.SMS_ACTIVATION,
      LogCategory.PAYMENT_GENERATED,
      LogCategory.PAYMENT_CONFIRMED,
      LogCategory.RECHARGE,
      LogCategory.AFFILIATE,
      LogCategory.ADMIN
    ];

    // Lista de ações importantes
    const importantActions = [
      'Fez login',
      'Registrou',
      'Atualizou',
      'Criou',
      'Deletou',
      'Comprou',
      'Ativou',
      'Gerou',
      'Confirmou',
      'Acessou'
    ];

    return importantCategories.includes(category) || 
           importantActions.some(importantAction => action.toLowerCase().includes(importantAction.toLowerCase()));
  }

  private shouldSkipLogging(url: string, method: string): boolean {
    const skipPatterns = [
      '/health',
      '/metrics',
      '/favicon.ico',
      '/static/',
      '/assets/',
      '/_next/',
      '/api/health',
      '/logs/test-telegram',
      '/logs/test-login-notification'
    ];

    return skipPatterns.some(pattern => url.includes(pattern)) || method === 'OPTIONS';
  }

  private sanitizeBody(body: any): any {
    if (!body) return null;
    
    // Remover informações sensíveis
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded 
      ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim())
      : req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
    
    return ip;
  }
}
