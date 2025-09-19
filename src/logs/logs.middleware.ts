import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LogsMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Adicionar informações de IP e User-Agent ao request
    req['ipAddress'] = this.getClientIp(req);
    req['userAgent'] = req.get('User-Agent') || 'Unknown';
    
    next();
  }

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    const ip = forwarded 
      ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim())
      : req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
    
    return ip;
  }
}
