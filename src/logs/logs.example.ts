import { LogsService } from './logs.service';
import { LogCategory } from './dtos/create-log.dto';

/**
 * Exemplo de como usar o sistema de logs
 */
export class LogsExample {
  constructor(private readonly logsService: LogsService) {}

  // Exemplo de log de documentação
  async logDocumentationAccess(userId: number, page: string, ipAddress?: string, userAgent?: string) {
    return this.logsService.createLog({
      category: LogCategory.DOCUMENTATION,
      action: 'Acessou a Página de Documentação',
      description: `Acessou a Página de Documentação - ${page}`,
      metadata: { page, userId },
      ipAddress,
      userAgent,
    }, userId);
  }

  // Exemplo de log de perfil
  async logProfileAccess(userId: number, action: string, ipAddress?: string, userAgent?: string) {
    return this.logsService.logProfile(
      userId,
      action,
      `Acessou a página de perfil - ${action}`,
      { userId, action },
      ipAddress,
      userAgent
    );
  }

  // Exemplo de log de APIs
  async logApiAccess(userId: number, apiName: string, ipAddress?: string, userAgent?: string) {
    return this.logsService.createLog({
      category: LogCategory.MY_APIS,
      action: 'Acessou o painel minhas APIs',
      description: `Acessou o painel minhas APIs - ${apiName}`,
      metadata: { apiName, userId },
      ipAddress,
      userAgent,
    }, userId);
  }

  // Exemplo de log de rotas criadas
  async logRouteCreated(userId: number, routeName: string, token: string, ipAddress?: string, userAgent?: string) {
    return this.logsService.createLog({
      category: LogCategory.ROUTES_CREATED,
      action: 'CRIADOR: ... a Token',
      description: `CRIADOR: ${routeName} a Token: ${token.substring(0, 10)}...`,
      metadata: { routeName, token: token.substring(0, 10), userId },
      ipAddress,
      userAgent,
    }, userId);
  }

  // Exemplo de log de conta deletada
  async logAccountDeleted(userId: number, email: string, ipAddress?: string, userAgent?: string) {
    return this.logsService.createLog({
      category: LogCategory.ACCOUNT_DELETED,
      action: 'Deletou sua conta',
      description: `Deletou sua conta ⭐ Email: ${email}`,
      metadata: { email, userId },
      ipAddress,
      userAgent,
    }, userId);
  }

  // Exemplo de log de recarga
  async logRecharge(userId: number, amount: number, method: string, ipAddress?: string, userAgent?: string) {
    return this.logsService.logRecharge(
      userId,
      'Realizou recarga',
      `Realizou recarga - Valor: R$ ${amount.toFixed(2)} - Método: ${method}`,
      { amount, method, userId },
      ipAddress,
      userAgent
    );
  }

  // Exemplo de log de ativação SMS
  async logSmsActivation(userId: number, service: string, country: string, number: string, ipAddress?: string, userAgent?: string) {
    return this.logsService.logSmsActivation(
      userId,
      'Ativou SMS',
      `Ativou SMS - Serviço: ${service} - País: ${country} - Número: ${number}`,
      { service, country, number, userId },
      ipAddress,
      userAgent
    );
  }

  // Exemplo de log de afiliado
  async logAffiliateAction(userId: number, action: string, description: string, ipAddress?: string, userAgent?: string) {
    return this.logsService.createLog({
      category: LogCategory.AFFILIATE,
      action,
      description,
      metadata: { userId, action },
      ipAddress,
      userAgent,
    }, userId);
  }

  // Exemplo de log de admin
  async logAdminAction(adminId: number, action: string, description: string, targetUserId?: number, ipAddress?: string, userAgent?: string) {
    return this.logsService.createLog({
      category: LogCategory.ADMIN,
      action,
      description,
      metadata: { adminId, targetUserId, action },
      ipAddress,
      userAgent,
    }, adminId);
  }

  // Exemplo de log geral
  async logGeneralAction(action: string, description: string, userId?: number, ipAddress?: string, userAgent?: string) {
    return this.logsService.logGeneral(
      action,
      description,
      { userId, action },
      userId,
      ipAddress,
      userAgent
    );
  }
}
