import { Test, TestingModule } from '@nestjs/testing';
import { LogsService } from './logs.service';
import { PrismaService } from '../prisma/prisma.service';
import { LogCategory } from './dtos/create-log.dto';

describe('LogsService', () => {
  let service: LogsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    apiLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LogsService>(LogsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createLog', () => {
    it('should create a log successfully', async () => {
      const createLogDto = {
        category: LogCategory.LOGIN,
        action: 'Fez login na plataforma',
        description: 'Fez login na plataforma - Email: user@example.com',
        metadata: { email: 'user@example.com' },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
      };

      const expectedLog = {
        id: 1,
        userId: 123,
        ...createLogDto,
        createdAt: new Date(),
        user: {
          id: 123,
          email: 'user@example.com',
          name: 'João Silva',
        },
      };

      mockPrismaService.apiLog.create.mockResolvedValue(expectedLog);

      const result = await service.createLog(createLogDto, 123);

      expect(result).toEqual(expectedLog);
      expect(mockPrismaService.apiLog.create).toHaveBeenCalledWith({
        data: {
          ...createLogDto,
          userId: 123,
          metadata: JSON.stringify(createLogDto.metadata),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });
    });
  });

  describe('getLogs', () => {
    it('should return logs with pagination', async () => {
      const mockLogs = [
        {
          id: 1,
          userId: 123,
          category: LogCategory.LOGIN,
          action: 'Fez login na plataforma',
          description: 'Fez login na plataforma - Email: user@example.com',
          metadata: JSON.stringify({ email: 'user@example.com' }),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          createdAt: new Date(),
          user: {
            id: 123,
            email: 'user@example.com',
            name: 'João Silva',
          },
        },
      ];

      mockPrismaService.apiLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.apiLog.count.mockResolvedValue(1);

      const result = await service.getLogs({ page: 1, limit: 10 }, 123);

      expect(result).toEqual({
        logs: [
          {
            ...mockLogs[0],
            metadata: { email: 'user@example.com' },
          },
        ],
        total: 1,
        page: 1,
        limit: 10,
      });
    });
  });

  describe('getLogsGrouped', () => {
    it('should return logs grouped by category', async () => {
      const mockLogs = [
        {
          id: 1,
          userId: 123,
          category: LogCategory.LOGIN,
          action: 'Fez login na plataforma',
          description: 'Fez login na plataforma',
          metadata: null,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0...',
          createdAt: new Date(),
          user: {
            id: 123,
            email: 'user@example.com',
            name: 'João Silva',
          },
        },
      ];

      mockPrismaService.apiLog.findMany.mockResolvedValue(mockLogs);
      mockPrismaService.apiLog.count.mockResolvedValue(1);

      const result = await service.getLogsGrouped({}, 123);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        category: LogCategory.LOGIN,
        categoryName: 'Login & Registro',
        icon: 'L',
        color: '#EF4444',
        count: 1,
      });
    });
  });
});
