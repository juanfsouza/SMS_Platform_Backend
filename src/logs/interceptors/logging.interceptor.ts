import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { LogsService } from '../logs.service';
import { LOG_ACTION_KEY, LogActionOptions } from '../decorators/log-action.decorator';
import { LogCategory } from '../dtos/create-log.dto';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly logsService: LogsService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const logOptions = this.reflector.get<LogActionOptions>(
      LOG_ACTION_KEY,
      context.getHandler(),
    );

    if (!logOptions) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const ipAddress = request.ipAddress || request.ip;
    const userAgent = request.userAgent || request.get('User-Agent');

    return next.handle().pipe(
      tap(async (data) => {
        try {
          const description = logOptions.description || 
            `${logOptions.action} - ${this.getContextInfo(request, data)}`;

          await this.logsService.createLog({
            category: logOptions.category,
            action: logOptions.action,
            description,
            metadata: this.buildMetadata(request, data, logOptions),
            ipAddress,
            userAgent,
          }, userId);
        } catch (error) {
          console.error('Failed to log action:', error);
        }
      }),
    );
  }

  private getContextInfo(request: any, data: any): string {
    const method = request.method;
    const url = request.url;
    const status = data?.status || 'success';
    
    return `${method} ${url} - Status: ${status}`;
  }

  private buildMetadata(request: any, data: any, options: LogActionOptions): any {
    const metadata: any = {};

    if (options.includeUser && request.user) {
      metadata.user = {
        id: request.user.id,
        email: request.user.email,
        role: request.user.role,
      };
    }

    if (options.includeRequest) {
      metadata.request = {
        method: request.method,
        url: request.url,
        body: this.sanitizeRequestData(request.body),
        query: request.query,
        params: request.params,
      };
    }

    if (data) {
      metadata.response = this.sanitizeResponseData(data);
    }

    return metadata;
  }

  private sanitizeRequestData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });

    return sanitized;
  }

  private sanitizeResponseData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'secret', 'key'];

    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });

    return sanitized;
  }
}
