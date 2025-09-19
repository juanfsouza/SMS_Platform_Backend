import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';

export enum LogCategory {
  DOCUMENTATION = 'DOCUMENTATION',
  LOGIN = 'LOGIN',
  MY_APIS = 'MY_APIS',
  PROFILE = 'PROFILE',
  PAYMENT_GENERATED = 'PAYMENT_GENERATED',
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  ROUTES_CREATED = 'ROUTES_CREATED',
  ACCOUNT_DELETED = 'ACCOUNT_DELETED',
  GENERAL = 'GENERAL',
  FRAUD_ATTEMPT = 'FRAUD_ATTEMPT',
  RECHARGE = 'RECHARGE',
  SMS_ACTIVATION = 'SMS_ACTIVATION',
  AFFILIATE = 'AFFILIATE',
  ADMIN = 'ADMIN'
}

export class CreateLogDto {
  @IsEnum(LogCategory)
  category: LogCategory;

  @IsString()
  action: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsObject()
  metadata?: any;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}
