import { SetMetadata } from '@nestjs/common';
import { LogCategory } from '../dtos/create-log.dto';

export const LOG_ACTION_KEY = 'log_action';

export interface LogActionOptions {
  category: LogCategory;
  action: string;
  description?: string;
  includeUser?: boolean;
  includeRequest?: boolean;
}

export const LogAction = (options: LogActionOptions) => 
  SetMetadata(LOG_ACTION_KEY, options);
