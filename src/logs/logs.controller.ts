import { Controller, Get, Post, Body, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { LogsService } from './logs.service';
import { CreateLogDto } from './dtos/create-log.dto';
import { GetLogsDto } from './dtos/get-logs.dto';
import { LogResponseDto, LogGroupResponseDto } from './dtos/log-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TelegramService } from '../telegram/telegram.service';
import { ConfigService } from '@nestjs/config';

@Controller('logs')
export class LogsController {
  constructor(
    private readonly logsService: LogsService,
    private readonly telegramService: TelegramService,
    private readonly configService: ConfigService
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createLog(@Body() createLogDto: CreateLogDto): Promise<LogResponseDto> {
    return this.logsService.createLog(createLogDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getLogs(
    @Query() getLogsDto: GetLogsDto,
    @Request() req: any
  ): Promise<{
    logs: LogResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.logsService.getLogs(getLogsDto, req.user?.id);
  }

  @Get('grouped')
  @UseGuards(JwtAuthGuard)
  async getLogsGrouped(
    @Query() getLogsDto: GetLogsDto,
    @Request() req: any
  ): Promise<LogGroupResponseDto[]> {
    return this.logsService.getLogsGrouped(getLogsDto, req.user?.id);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getLogStats(@Request() req: any): Promise<{
    totalLogs: number;
    categoryStats: Array<{
      category: string;
      categoryName: string;
      count: number;
      icon: string;
      color: string;
    }>;
  }> {
    return this.logsService.getLogStats(req.user?.id);
  }

  @Get('admin')
  async getAdminLogs(
    @Query() getLogsDto: GetLogsDto
  ): Promise<{
    logs: LogResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    // Endpoint para administradores verem todos os logs
    return this.logsService.getLogs(getLogsDto);
  }

  @Get('admin/grouped')
  async getAdminLogsGrouped(
    @Query() getLogsDto: GetLogsDto
  ): Promise<LogGroupResponseDto[]> {
    return this.logsService.getLogsGrouped(getLogsDto);
  }

  @Get('admin/stats')
  async getAdminLogStats(): Promise<{
    totalLogs: number;
    categoryStats: Array<{
      category: string;
      categoryName: string;
      count: number;
      icon: string;
      color: string;
    }>;
  }> {
    return this.logsService.getLogStats();
  }

  @Post('test-telegram')
  @UseGuards(JwtAuthGuard)
  async testTelegramNotification(@Request() req: any): Promise<{ message: string }> {
    try {
      const testLog = {
        id: 999999,
        category: 'ADMIN',
        action: 'Teste de Notificação',
        description: 'Teste manual do sistema de notificações do Telegram',
        metadata: {
          test: true,
          timestamp: new Date().toISOString(),
          user: req.user?.email || 'Test User'
        },
        createdAt: new Date(),
        user: {
          id: req.user?.id || 1,
          email: req.user?.email || 'test@example.com',
          name: req.user?.name || 'Test User'
        }
      };

      await this.telegramService.sendLogNotification(testLog);
      return { message: 'Notificação de teste enviada com sucesso!' };
    } catch (error) {
      console.error('Error testing Telegram notification:', error);
      return { message: `Erro ao enviar notificação de teste: ${error.message}` };
    }
  }

  @Post('test-login-notification')
  @UseGuards(JwtAuthGuard)
  async testLoginNotification(@Request() req: any): Promise<{ message: string; logId?: number }> {
    try {
      // Criar um log de login real para testar o fluxo completo
      const loginLog = await this.logsService.logLogin(
        req.user?.id || 1,
        'Teste de Login',
        'Teste manual do sistema de notificações para login',
        { email: req.user?.email || 'test@example.com', test: true },
        '127.0.0.1',
        'Test User Agent'
      );
      
      return { 
        message: 'Log de login criado e notificação enviada!', 
        logId: loginLog.id 
      };
    } catch (error) {
      console.error('Error testing login notification:', error);
      return { message: `Erro ao testar notificação de login: ${error.message}` };
    }
  }

  @Get('get-my-chat-id')
  @UseGuards(JwtAuthGuard)
  async getMyChatId(@Request() req: any): Promise<{ message: string; chatId: string }> {
    try {
      const adminChatId = this.configService.get('telegram.adminChatId');
      return { 
        message: 'Chat ID configurado no sistema', 
        chatId: adminChatId || 'Não configurado'
      };
    } catch (error) {
      console.error('Error getting chat ID:', error);
      return { message: `Erro ao obter chat ID: ${error.message}`, chatId: 'Erro' };
    }
  }
}
