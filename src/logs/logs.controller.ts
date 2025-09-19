import { Controller, Get, Post, Body, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { LogsService } from './logs.service';
import { CreateLogDto } from './dtos/create-log.dto';
import { GetLogsDto } from './dtos/get-logs.dto';
import { LogResponseDto, LogGroupResponseDto } from './dtos/log-response.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

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
}
