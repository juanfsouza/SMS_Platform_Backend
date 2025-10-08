import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface PurchaseLog {
  id: number;
  userId: number;
  userName: string | null;
  userEmail: string;
  service: string;
  country: string;
  phoneNumber: string;
  creditsSpent: number;
  userBalance: number;
  activationId: string | null;
  status: string;
  code: string | null;
  purchaseDate: Date;
  canRefund: boolean;
  transactionId?: number;
}

export interface RefundRequest {
  activationId: string;
  reason?: string;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  private readonly MAX_REFUND_AGE = 20 * 60 * 1000; // 20 minutos em milliseconds

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Busca todos os logs de compras de SMS para o admin
   */
  async getPurchaseLogs(
    page: number = 1,
    limit: number = 20,
    status?: string,
    userEmail?: string,
    service?: string
  ): Promise<{ logs: PurchaseLog[]; total: number; pages: number }> {
    try {
      const skip = (page - 1) * limit;
      
      // Construir filtros
      const where: any = {};
      if (status) where.status = status;
      if (userEmail) where.user = { email: userEmail };
      if (service) where.service = { contains: service, mode: 'insensitive' };

      // Buscar ativações com informações do usuário e transações
      const [activations, total] = await Promise.all([
        this.prisma.smsActivation.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                balance: true,
              },
            },
            transactions: {
              where: {
                type: 'DEBIT',
                status: { in: ['COMPLETED', 'REFUNDED'] },
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.smsActivation.count({ where }),
      ]);

      // Mapear para o formato do log
      const logs: PurchaseLog[] = activations.map((activation) => {
        const transaction = activation.transactions[0];
        const canRefund = 
          transaction && 
          transaction.status === 'COMPLETED' &&
          activation.status !== 'COMPLETED';

        return {
          id: activation.id,
          userId: activation.userId,
          userName: activation.user.name,
          userEmail: activation.user.email,
          service: activation.service,
          country: activation.country,
          phoneNumber: this.formatPhoneNumber(activation.number, activation.country),
          creditsSpent: transaction?.amount || 0,
          userBalance: activation.user.balance,
          activationId: activation.activationId,
          status: activation.status,
          code: activation.code,
          purchaseDate: activation.createdAt,
          canRefund,
          transactionId: transaction?.id,
        };
      });

      return {
        logs,
        total,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`Failed to get purchase logs: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get purchase logs: ${error.message}`);
    }
  }

  private formatPhoneNumber(phoneNumber: string, country: string): string {
    if (!phoneNumber || !country) return phoneNumber;

    // Mapear códigos de país para DDDs (todos os países suportados pelo ActiveSMS)
    const countryCodeMap: Record<string, string> = {
      // América do Norte
      '1': '+1',   // EUA/Canadá
      '52': '+52', // México
      
      // América do Sul
      '48': '+55', // Brasil
      '54': '+54', // Argentina
      '56': '+56', // Chile
      '57': '+57', // Colômbia
      '51': '+51', // Peru
      '58': '+58', // Venezuela
      '593': '+593', // Equador
      '598': '+598', // Uruguai
      '595': '+595', // Paraguai
      '591': '+591', // Bolívia
      
      // Europa
      '44': '+44', // Reino Unido
      '49': '+49', // Alemanha
      '33': '+33', // França
      '34': '+34', // Espanha
      '39': '+39', // Itália
      '7': '+7',   // Rússia
      '380': '+380', // Ucrânia
      '420': '+420', // República Tcheca
      '421': '+421', // Eslováquia
      '36': '+36', // Hungria
      '40': '+40', // Romênia
      '359': '+359', // Bulgária
      '385': '+385', // Croácia
      '386': '+386', // Eslovênia
      '387': '+387', // Bósnia
      '389': '+389', // Macedônia
      '381': '+381', // Sérvia
      '382': '+382', // Montenegro
      '383': '+383', // Kosovo
      '355': '+355', // Albânia
      '30': '+30', // Grécia
      '90': '+90', // Turquia
      '31': '+31', // Holanda
      '32': '+32', // Bélgica
      '41': '+41', // Suíça
      '43': '+43', // Áustria
      '45': '+45', // Dinamarca
      '46': '+46', // Suécia
      '47': '+47', // Noruega
      '358': '+358', // Finlândia
      '372': '+372', // Estônia
      '371': '+371', // Letônia
      '370': '+370', // Lituânia
      '353': '+353', // Irlanda
      '351': '+351', // Portugal
      '375': '+375', // Belarus
      '373': '+373', // Moldávia
      
      // Ásia
      '86': '+86', // China
      '91': '+91', // Índia
      '81': '+81', // Japão
      '82': '+82', // Coreia do Sul
      '66': '+66', // Tailândia
      '84': '+84', // Vietnã
      '63': '+63', // Filipinas
      '62': '+62', // Indonésia
      '60': '+60', // Malásia
      '65': '+65', // Singapura
      '886': '+886', // Taiwan
      '852': '+852', // Hong Kong
      '853': '+853', // Macau
      '880': '+880', // Bangladesh
      '92': '+92', // Paquistão
      '93': '+93', // Afeganistão
      '94': '+94', // Sri Lanka
      '977': '+977', // Nepal
      '975': '+975', // Butão
      '960': '+960', // Maldivas
      '673': '+673', // Brunei
      '855': '+855', // Camboja
      '856': '+856', // Laos
      '95': '+95', // Myanmar
      '98': '+98', // Irã
      '964': '+964', // Iraque
      '965': '+965', // Kuwait
      '966': '+966', // Arábia Saudita
      '971': '+971', // Emirados Árabes
      '973': '+973', // Bahrein
      '974': '+974', // Qatar
      '968': '+968', // Omã
      '962': '+962', // Jordânia
      '961': '+961', // Líbano
      '963': '+963', // Síria
      '972': '+972', // Israel
      '970': '+970', // Palestina
      '967': '+967', // Iêmen
      '976': '+976', // Mongólia
      '992': '+992', // Tajiquistão
      '993': '+993', // Turcomenistão
      '994': '+994', // Azerbaijão
      '995': '+995', // Geórgia
      '996': '+996', // Quirguistão
      '998': '+998', // Uzbequistão
      
      // África
      '20': '+20', // Egito
      '218': '+218', // Líbia
      '216': '+216', // Tunísia
      '213': '+213', // Argélia
      '212': '+212', // Marrocos
      '222': '+222', // Mauritânia
      '220': '+220', // Gâmbia
      '221': '+221', // Senegal
      '223': '+223', // Mali
      '224': '+224', // Guiné
      '225': '+225', // Costa do Marfim
      '226': '+226', // Burkina Faso
      '227': '+227', // Níger
      '228': '+228', // Togo
      '229': '+229', // Benim
      '230': '+230', // Maurício
      '231': '+231', // Libéria
      '232': '+232', // Serra Leoa
      '233': '+233', // Gana
      '234': '+234', // Nigéria
      '235': '+235', // Chade
      '236': '+236', // República Centro-Africana
      '237': '+237', // Camarões
      '238': '+238', // Cabo Verde
      '239': '+239', // São Tomé e Príncipe
      '240': '+240', // Guiné Equatorial
      '241': '+241', // Gabão
      '242': '+242', // República do Congo
      '243': '+243', // República Democrática do Congo
      '244': '+244', // Angola
      '245': '+245', // Guiné-Bissau
      '246': '+246', // Território Britânico do Oceano Índico
      '248': '+248', // Seicheles
      '249': '+249', // Sudão
      '250': '+250', // Ruanda
      '251': '+251', // Etiópia
      '252': '+252', // Somália
      '253': '+253', // Djibuti
      '254': '+254', // Quênia
      '255': '+255', // Tanzânia
      '256': '+256', // Uganda
      '257': '+257', // Burundi
      '258': '+258', // Moçambique
      '260': '+260', // Zâmbia
      '261': '+261', // Madagáscar
      '262': '+262', // Reunião
      '263': '+263', // Zimbábue
      '264': '+264', // Namíbia
      '265': '+265', // Malawi
      '266': '+266', // Lesoto
      '267': '+267', // Botsuana
      '268': '+268', // Suazilândia
      '269': '+269', // Comores
      '290': '+290', // Santa Helena
      '291': '+291', // Eritreia
      
      // Oceania
      '61': '+61', // Austrália
      '64': '+64', // Nova Zelândia
      '675': '+675', // Papua-Nova Guiné
      '676': '+676', // Tonga
      '677': '+677', // Ilhas Salomão
      '678': '+678', // Vanuatu
      '679': '+679', // Fiji
      '680': '+680', // Palau
      '681': '+681', // Wallis e Futuna
      '682': '+682', // Ilhas Cook
      '683': '+683', // Niue
      '684': '+684', // Samoa Americana
      '685': '+685', // Samoa
      '686': '+686', // Kiribati
      '687': '+687', // Nova Caledônia
      '688': '+688', // Tuvalu
      '689': '+689', // Polinésia Francesa
      '690': '+690', // Tokelau
      '691': '+691', // Micronésia
      '692': '+692', // Ilhas Marshall
      '674': '+674', // Nauru
      
      // Territórios e ilhas
      '500': '+500', // Ilhas Malvinas
      '501': '+501', // Belize
      '502': '+502', // Guatemala
      '503': '+503', // El Salvador
      '504': '+504', // Honduras
      '505': '+505', // Nicarágua
      '506': '+506', // Costa Rica
      '507': '+507', // Panamá
      '508': '+508', // São Pedro e Miquelon
      '509': '+509', // Haiti
      '590': '+590', // Guadalupe
      '592': '+592', // Guiana
      '594': '+594', // Guiana Francesa
      '596': '+596', // Martinica
      '597': '+597', // Suriname
      '599': '+599', // Antilhas Holandesas
      '670': '+670', // Timor-Leste
      '672': '+672', // Território Antártico Australiano
      '850': '+850', // Coreia do Norte
      
      // Microestados europeus
      '350': '+350', // Gibraltar
      '352': '+352', // Luxemburgo
      '354': '+354', // Islândia
      '356': '+356', // Malta
      '357': '+357', // Chipre
      '374': '+374', // Armênia
      '376': '+376', // Andorra
      '377': '+377', // Mônaco
      '378': '+378', // San Marino
      '423': '+423', // Liechtenstein
      '297': '+297', // Aruba
      '298': '+298', // Ilhas Feroé
      '299': '+299', // Groenlândia
    };

    const countryCode = countryCodeMap[country] || `+${country}`;
    
    // Remover espaços e caracteres especiais
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Se o número já começar com o código do país, não adicionar novamente
    if (cleanNumber.startsWith(country.replace(/\D/g, ''))) {
      return `+${cleanNumber}`;
    }
    
    // Adicionar código do país
    return `${countryCode}${cleanNumber}`;
  }

  /**
   * Busca detalhes de uma compra específica por activationId
   */
  async getPurchaseLogByActivationId(activationId: string): Promise<PurchaseLog> {
    try {
      const activation = await this.prisma.smsActivation.findUnique({
        where: { activationId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              balance: true,
            },
          },
          transactions: {
            where: {
              type: 'DEBIT',
              status: { in: ['COMPLETED', 'REFUNDED'] },
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!activation) {
        throw new BadRequestException(`Activation ${activationId} not found`);
      }

      const transaction = activation.transactions[0];
      const canRefund =
        transaction &&
        transaction.status === 'COMPLETED' &&
        activation.status !== 'COMPLETED';

      return {
        id: activation.id,
        userId: activation.userId,
        userName: activation.user.name,
        userEmail: activation.user.email,
        service: activation.service,
        country: activation.country,
        phoneNumber: activation.number,
        creditsSpent: transaction?.amount || 0,
        userBalance: activation.user.balance,
        activationId: activation.activationId,
        status: activation.status,
        code: activation.code,
        purchaseDate: activation.createdAt,
        canRefund,
        transactionId: transaction?.id,
      };
    } catch (error) {
      this.logger.error(`Failed to get purchase log for activation ${activationId}: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get purchase log: ${error.message}`);
    }
  }

  /**
   * Processa estorno manual de uma compra
   */
  async processRefund(activationId: string, adminUserId: number, reason?: string): Promise<any> {
    try {
      this.logger.log(`Processing manual refund for activation: ${activationId} by admin: ${adminUserId}`);

      // Buscar a ativação com transações
      const activation = await this.prisma.smsActivation.findUnique({
        where: { activationId },
        include: {
          user: true,
          transactions: {
            where: {
              type: 'DEBIT',
              status: 'COMPLETED',
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!activation) {
        throw new BadRequestException(`Activation ${activationId} not found`);
      }

      if (!activation.transactions.length) {
        throw new BadRequestException(`No debit transaction found for activation ${activationId}`);
      }

      const transaction = activation.transactions[0];

      // Verificar se já foi estornado
      const existingRefund = await this.prisma.transaction.findFirst({
        where: {
          smsActivationId: activation.id,
          type: 'REFUNDED',
          status: 'COMPLETED',
        },
      });

      if (existingRefund) {
        throw new BadRequestException(`Activation ${activationId} already refunded`);
      }

      // Verificar se o SMS foi recebido (se sim, não permitir estorno)
      if (activation.status === 'COMPLETED' && activation.code) {
        throw new BadRequestException(`Cannot refund activation ${activationId} - SMS code was already received`);
      }

      // Processar estorno em transação
      const result = await this.prisma.$transaction(async (tx) => {
        // 1. Atualizar saldo do usuário
        const updatedUser = await tx.user.update({
          where: { id: activation.userId },
          data: { balance: { increment: transaction.amount } },
        });

        // 2. Criar transação de estorno
        const refundTransaction = await tx.transaction.create({
          data: {
            userId: activation.userId,
            amount: transaction.amount,
            type: 'REFUNDED',
            status: 'COMPLETED',
            description: `Manual refund for SMS activation: ${activation.service} (${activation.country}) - Reason: ${reason || 'Manual admin refund'}`,
            smsActivationId: activation.id,
          },
        });

        // 3. Marcar transação original como estornada
        await tx.transaction.update({
          where: { id: transaction.id },
          data: { status: 'REFUNDED' },
        });

        // 4. Atualizar status da ativação
        await tx.smsActivation.update({
          where: { id: activation.id },
          data: { status: 'CANCELLED' },
        });

        return {
          refundTransaction,
          updatedUser,
          refundedAmount: transaction.amount,
        };
      });

      this.logger.log(`Manual refund processed: ${transaction.amount} credits returned to user ${activation.userId}`);

      return {
        success: true,
        message: `Refund processed successfully`,
        activationId,
        refundedAmount: result.refundedAmount,
        userNewBalance: result.updatedUser.balance,
        refundTransactionId: result.refundTransaction.id,
      };
    } catch (error) {
      this.logger.error(`Failed to process refund for ${activationId}: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to process refund: ${error.message}`);
    }
  }

  /**
   * Processa estornos de todas as compras elegíveis de um usuário
   */
  async processUserRefunds(userEmail: string, adminUserId: number, reason?: string): Promise<any> {
    try {
      this.logger.log(`Processing refunds for user email: ${userEmail} by admin: ${adminUserId}`);

      // Buscar usuário pelo email
      const user = await this.prisma.user.findUnique({
        where: { email: userEmail },
      });

      if (!user) {
        throw new BadRequestException(`User with email ${userEmail} not found`);
      }

      // Buscar ativações elegíveis para estorno
      const cutoffTime = new Date(Date.now() - this.MAX_REFUND_AGE);
      const eligibleActivations = await this.prisma.smsActivation.findMany({
        where: {
          userId: user.id,
          createdAt: { lte: cutoffTime },
          status: { in: ['PENDING', 'WAITING'] },
          transactions: {
            some: {
              type: 'DEBIT',
              status: 'COMPLETED',
            },
          },
        },
        include: {
          transactions: {
            where: {
              type: 'DEBIT',
              status: 'COMPLETED',
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          user: true,
        },
      });

      this.logger.log(`Found ${eligibleActivations.length} eligible activations for refund for user ${userEmail}`);

      let processedRefunds = 0;
      const results: { activationId: string | null; refundedAmount: number }[] = [];

      for (const activation of eligibleActivations) {
        try {
          const transaction = activation.transactions[0];
          if (!transaction) continue;

          // Verificar se já existe estorno
          const existingRefund = await this.prisma.transaction.findFirst({
            where: {
              smsActivationId: activation.id,
              type: 'REFUNDED',
            },
          });

          if (existingRefund) {
            this.logger.log(`Activation ${activation.activationId} already has refund, skipping`);
            continue;
          }

          // Processar estorno
          await this.prisma.$transaction(async (tx) => {
            // Atualizar saldo
            await tx.user.update({
              where: { id: activation.userId },
              data: { balance: { increment: transaction.amount } },
            });

            // Criar transação de estorno
            await tx.transaction.create({
              data: {
                userId: activation.userId,
                amount: transaction.amount,
                type: 'REFUNDED',
                status: 'COMPLETED',
                description: `User refund for SMS activation: ${activation.service} (${activation.country}) - Reason: ${reason || 'Admin-initiated user refund'}`,
                smsActivationId: activation.id,
              },
            });

            // Marcar transação original como estornada
            await tx.transaction.update({
              where: { id: transaction.id },
              data: { status: 'REFUNDED' },
            });

            // Atualizar ativação
            await tx.smsActivation.update({
              where: { id: activation.id },
              data: { status: 'CANCELLED' },
            });
          });

          processedRefunds++;
          results.push({
            activationId: activation.activationId,
            refundedAmount: transaction.amount,
          });

          this.logger.log(`Refund processed for activation ${activation.activationId} for user ${userEmail}`);
        } catch (error) {
          this.logger.error(`Failed to process refund for activation ${activation.id}: ${error.message}`);
        }
      }

      this.logger.log(`User refunds completed: ${processedRefunds} processed for user ${userEmail}`);

      const updatedUser = await this.prisma.user.findUnique({
        where: { id: user.id },
        select: { balance: true },
      });

      return {
        success: true,
        processedCount: processedRefunds,
        userId: user.id,
        userEmail,
        userNewBalance: updatedUser?.balance || 0,
        results,
      };
    } catch (error) {
      this.logger.error(`Failed to process refunds for user ${userEmail}: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to process user refunds: ${error.message}`);
    }
  }

  /**
   * Verifica e processa estornos automáticos para ativações expiradas
   */
  async processAutomaticRefunds(): Promise<any> {
    try {
      this.logger.log('Starting automatic refunds check...');

      const cutoffTime = new Date(Date.now() - this.MAX_REFUND_AGE);

      // Buscar ativações que precisam de estorno automático
      const expiredActivations = await this.prisma.smsActivation.findMany({
        where: {
          createdAt: { lte: cutoffTime },
          status: { in: ['PENDING', 'WAITING'] },
          transactions: {
            some: {
              type: 'DEBIT',
              status: 'COMPLETED',
            },
          },
        },
        include: {
          transactions: {
            where: {
              type: 'DEBIT',
              status: 'COMPLETED',
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          user: true,
        },
      });

      this.logger.log(`Found ${expiredActivations.length} activations for automatic refund`);

      let processedRefunds = 0;
      const results: { activationId: string | null; userId: number; refundedAmount: number }[] = [];

      for (const activation of expiredActivations) {
        try {
          const transaction = activation.transactions[0];
          if (!transaction) continue;

          // Verificar se já existe estorno
          const existingRefund = await this.prisma.transaction.findFirst({
            where: {
              smsActivationId: activation.id,
              type: 'REFUNDED',
            },
          });

          if (existingRefund) {
            this.logger.log(`Activation ${activation.activationId} already has refund, skipping`);
            continue;
          }

          // Processar estorno automático
          await this.prisma.$transaction(async (tx) => {
            // Atualizar saldo
            await tx.user.update({
              where: { id: activation.userId },
              data: { balance: { increment: transaction.amount } },
            });

            // Criar transação de estorno
            await tx.transaction.create({
              data: {
                userId: activation.userId,
                amount: transaction.amount,
                type: 'REFUNDED',
                status: 'COMPLETED',
                description: `Automatic refund for expired SMS activation: ${activation.service} (${activation.country}) - 20 minute timeout`,
                smsActivationId: activation.id,
              },
            });

            // Marcar original como estornada
            await tx.transaction.update({
              where: { id: transaction.id },
              data: { status: 'REFUNDED' },
            });

            // Atualizar ativação
            await tx.smsActivation.update({
              where: { id: activation.id },
              data: { status: 'CANCELLED' },
            });
          });

          processedRefunds++;
          results.push({
            activationId: activation.activationId,
            userId: activation.userId,
            refundedAmount: transaction.amount,
          });

          this.logger.log(`Automatic refund processed for activation ${activation.activationId}`);
        } catch (error) {
          this.logger.error(`Failed to process automatic refund for activation ${activation.id}: ${error.message}`);
        }
      }

      this.logger.log(`Automatic refunds completed: ${processedRefunds} processed`);

      return {
        success: true,
        processedCount: processedRefunds,
        results,
      };
    } catch (error) {
      this.logger.error(`Failed to process automatic refunds: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to process automatic refunds: ${error.message}`);
    }
  }

  /**
   * Cron job para processar estornos automáticos a cada 5 minutos
   */
  @Cron('*/5 * * * *') // A cada 5 minutos
  async handleAutomaticRefundsCron() {
    this.logger.log('Running scheduled automatic refunds cron job');
    try {
      const result = await this.processAutomaticRefunds();
      this.logger.log(`Cron job completed: ${result.processedCount} refunds processed`);
    } catch (error) {
      this.logger.error(`Cron job failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Busca estatísticas do admin
   */
  async getAdminStats(): Promise<any> {
    try {
      const [
        totalPurchases,
        totalRefunded,
        totalRevenue,
        activeUsers,
        todayPurchases,
        pendingActivations,
      ] = await Promise.all([
        this.prisma.smsActivation.count(),
        this.prisma.transaction.count({
          where: { type: 'REFUNDED', status: 'COMPLETED' },
        }),
        this.prisma.transaction.aggregate({
          where: { type: 'DEBIT', status: 'COMPLETED' },
          _sum: { amount: true },
        }),
        this.prisma.user.count({
          where: { role: 'USER' },
        }),
        this.prisma.smsActivation.count({
          where: {
            createdAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        }),
        this.prisma.smsActivation.count({
          where: { status: { in: ['PENDING', 'WAITING'] } },
        }),
      ]);

      return {
        totalPurchases,
        totalRefunded,
        totalRevenue: totalRevenue._sum.amount || 0,
        activeUsers,
        todayPurchases,
        pendingActivations,
      };
    } catch (error) {
      this.logger.error(`Failed to get admin stats: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to get admin stats: ${error.message}`);
    }
  }
}