export class LogResponseDto {
  id: number;
  userId?: number | null;
  category: string;
  action: string;
  description: string;
  metadata?: any;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
  user?: {
    id: number;
    email: string;
    name?: string | null;
  } | null;
}

export class LogGroupResponseDto {
  category: string;
  categoryName: string;
  icon: string;
  color: string;
  logs: LogResponseDto[];
  count: number;
}
