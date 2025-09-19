import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { LogsService } from '../logs.service';
import { LogCategory } from '../dtos/create-log.dto';

/**
 * Exemplos práticos de como usar o sistema de logs
 * em diferentes cenários da aplicação
 */
@Controller('examples')
@UseGuards(JwtAuthGuard)
export class PracticalUsageExampleController {
  constructor(private readonly logsService: LogsService) {}

  // Exemplo 1: Log de acesso à documentação
  @Get('documentation')
  async accessDocumentation(@Request() req: any) {
    const userId = req.user.id;
    const ipAddress = req.ipAddress || req.ip;
    const userAgent = req.userAgent || req.get('User-Agent');

    await this.logsService.createLog({
      category: LogCategory.DOCUMENTATION,
      action: 'Acessou a Página de Documentação',
      description: 'Acessou a Página de Documentação - API Reference',
      metadata: { 
        page: 'API Reference',
        userId,
        timestamp: new Date().toISOString()
      },
      ipAddress,
      userAgent,
    }, userId);

    return { message: 'Documentation accessed' };
  }

  // Exemplo 2: Log de acesso ao painel de APIs
  @Get('my-apis')
  async accessMyApis(@Request() req: any) {
    const userId = req.user.id;
    const ipAddress = req.ipAddress || req.ip;
    const userAgent = req.userAgent || req.get('User-Agent');

    await this.logsService.createLog({
      category: LogCategory.MY_APIS,
      action: 'Acessou o painel minhas APIs',
      description: 'Acessou o painel minhas APIs',
      metadata: { 
        userId,
        section: 'dashboard'
      },
      ipAddress,
      userAgent,
    }, userId);

    return { message: 'My APIs accessed' };
  }

  // Exemplo 3: Log de acesso ao perfil
  @Get('profile')
  async accessProfile(@Request() req: any) {
    const userId = req.user.id;
    const ipAddress = req.ipAddress || req.ip;
    const userAgent = req.userAgent || req.get('User-Agent');

    await this.logsService.logProfile(
      userId,
      'Acessou a página de perfil',
      'Acessou a página de perfil',
      { userId, section: 'profile' },
      ipAddress,
      userAgent
    );

    return { message: 'Profile accessed' };
  }

  // Exemplo 4: Log de criação de rota/endpoint
  @Post('create-route')
  async createRoute(@Body() routeData: any, @Request() req: any) {
    const userId = req.user.id;
    const ipAddress = req.ipAddress || req.ip;
    const userAgent = req.userAgent || req.get('User-Agent');

    // Simular criação da rota
    const routeId = Math.random().toString(36).substr(2, 9);
    const token = Math.random().toString(36).substr(2, 16);

    await this.logsService.createLog({
      category: LogCategory.ROUTES_CREATED,
      action: 'CRIADOR: ... a Token',
      description: `CRIADOR: ${routeData.name} a Token: ${token.substring(0, 10)}...`,
      metadata: { 
        routeId,
        routeName: routeData.name,
        token: token.substring(0, 10),
        userId
      },
      ipAddress,
      userAgent,
    }, userId);

    return { 
      message: 'Route created',
      routeId,
      token: token.substring(0, 10) + '...'
    };
  }

  // Exemplo 5: Log de recarga de saldo
  @Post('recharge')
  async rechargeBalance(@Body() rechargeData: any, @Request() req: any) {
    const userId = req.user.id;
    const ipAddress = req.ipAddress || req.ip;
    const userAgent = req.userAgent || req.get('User-Agent');

    await this.logsService.logRecharge(
      userId,
      'Realizou recarga',
      `Realizou recarga - Valor: R$ ${rechargeData.amount.toFixed(2)} - Método: ${rechargeData.method}`,
      { 
        amount: rechargeData.amount,
        method: rechargeData.method,
        userId
      },
      ipAddress,
      userAgent
    );

    return { message: 'Recharge processed' };
  }

  // Exemplo 6: Log de ativação SMS
  @Post('sms-activation')
  async activateSms(@Body() activationData: any, @Request() req: any) {
    const userId = req.user.id;
    const ipAddress = req.ipAddress || req.ip;
    const userAgent = req.userAgent || req.get('User-Agent');

    await this.logsService.logSmsActivation(
      userId,
      'Ativou SMS',
      `Ativou SMS - Serviço: ${activationData.service} - País: ${activationData.country} - Número: ${activationData.number}`,
      { 
        service: activationData.service,
        country: activationData.country,
        number: activationData.number,
        userId
      },
      ipAddress,
      userAgent
    );

    return { message: 'SMS activated' };
  }

  // Exemplo 7: Log de ação de afiliado
  @Post('affiliate-action')
  async affiliateAction(@Body() affiliateData: any, @Request() req: any) {
    const userId = req.user.id;
    const ipAddress = req.ipAddress || req.ip;
    const userAgent = req.userAgent || req.get('User-Agent');

    await this.logsService.createLog({
      category: LogCategory.AFFILIATE,
      action: affiliateData.action,
      description: `Ação de afiliado: ${affiliateData.action} - Código: ${affiliateData.code}`,
      metadata: { 
        action: affiliateData.action,
        code: affiliateData.code,
        userId
      },
      ipAddress,
      userAgent,
    }, userId);

    return { message: 'Affiliate action logged' };
  }

  // Exemplo 8: Log de exclusão de conta
  @Post('delete-account')
  async deleteAccount(@Request() req: any) {
    const userId = req.user.id;
    const userEmail = req.user.email;
    const ipAddress = req.ipAddress || req.ip;
    const userAgent = req.userAgent || req.get('User-Agent');

    await this.logsService.createLog({
      category: LogCategory.ACCOUNT_DELETED,
      action: 'Deletou sua conta',
      description: `Deletou sua conta ⭐ Email: ${userEmail}`,
      metadata: { 
        email: userEmail,
        userId,
        deletedAt: new Date().toISOString()
      },
      ipAddress,
      userAgent,
    }, userId);

    return { message: 'Account deletion logged' };
  }

  // Exemplo 9: Log geral do sistema
  @Post('general-action')
  async generalAction(@Body() actionData: any, @Request() req: any) {
    const userId = req.user.id;
    const ipAddress = req.ipAddress || req.ip;
    const userAgent = req.userAgent || req.get('User-Agent');

    await this.logsService.logGeneral(
      actionData.action,
      `Ação geral: ${actionData.action} - Descrição: ${actionData.description}`,
      { 
        action: actionData.action,
        description: actionData.description,
        userId
      },
      userId,
      ipAddress,
      userAgent
    );

    return { message: 'General action logged' };
  }

  // Exemplo 10: Buscar logs do usuário
  @Get('my-logs')
  async getMyLogs(@Request() req: any) {
    const userId = req.user.id;
    
    // Buscar logs agrupados (como na imagem)
    const groupedLogs = await this.logsService.getLogsGrouped({}, userId);
    
    // Buscar estatísticas
    const stats = await this.logsService.getLogStats(userId);

    return {
      groupedLogs,
      stats,
      message: 'Logs retrieved successfully'
    };
  }
}
