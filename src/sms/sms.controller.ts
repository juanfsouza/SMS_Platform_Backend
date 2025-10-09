import { Controller, Get, Post, Body, Query, Param, UseGuards, Req, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { SmsService } from './sms.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { PrismaService } from '../prisma/prisma.service';
import { BuySmsDto } from './dtos/buy-sms.dto';
import { WebhookDto } from './dtos/webhook.dto';
import { StatusDto } from './dtos/status.dto';

@Controller('sms')
export class SmsController {
  private readonly logger = new Logger(SmsController.name);

  constructor(
    private readonly smsService: SmsService,
    private readonly prismaService: PrismaService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('numbers-status')
  async getNumbersStatus(@Query('country') country: string, @Query('operator') operator: string) {
    return this.smsService.getNumbersStatus(country, operator);
  }

  @UseGuards(JwtAuthGuard)
  @Post('buy')
  async buyNumber(@Body(new ZodValidationPipe(BuySmsDto)) body: BuySmsDto, @Req() req) {
    const userId = req.user.id;
    return this.smsService.getNumber(body.service, body.country, userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('status/:activationId')
  async getStatus(@Param('activationId') activationId: string, @Req() req): Promise<any> {
    const userId = req.user.id;
    const status = await this.smsService.getActivationStatus(activationId);

    // Parsear o status usando StatusDto
    const parsedStatus = StatusDto.parse(status);

    // Buscar informações adicionais do banco de dados
    const activation = await this.prismaService.smsActivation.findUnique({
      where: { activationId },
      include: { transactions: true },
    });

    if (!activation || activation.userId !== userId) {
      throw new NotFoundException(`No SmsActivation record found for activationId: ${activationId}`);
    }

    // Montar a resposta no formato desejado
    return {
      status: parsedStatus.status,
      array: [
        {
          id: activation.activationId,
          userid: activation.userId.toString(),
          service: activation.service,
          phone: this.formatPhoneNumber(activation.number, activation.country),
          cost: activation.transactions.find((t) => t.type === 'DEBIT')?.amount || 0,
          status: parsedStatus.status === 'success' ? '2' : parsedStatus.status === 'pending' ? '1' : '8',
          moreCodes: Buffer.from(JSON.stringify([parsedStatus.code])).toString('base64'),
          moreSms: Buffer.from(
            JSON.stringify([parsedStatus.code ? `${parsedStatus.code} é seu código de ${activation.service}. Não o compartilhe.` : '']),
          ).toString('base64'),
          createDate: Math.floor(activation.createdAt.getTime() / 1000),
          receiveSmsDate: parsedStatus.code ? Math.floor(Date.now() / 1000) : 0,
          estDate: Math.floor(activation.createdAt.getTime() / 1000 + 3600),
          finishDate: parsedStatus.status === 'success' ? -62169993017 : 0,
          forward: '0',
          ref: '0',
          country: activation.country,
          addSms: '1',
          countryCode: activation.country,
          activationType: '0',
          currency: 840,
          code: parsedStatus.code || '',
          smsText: parsedStatus.code ? `${parsedStatus.code} é seu código de ${activation.service}. Não o compartilhe.` : '',
          seconds: 3600,
          operator: null,
          hint: 0,
          name: `${activation.service}+Threads`,
        },
      ],
      time: new Date().toISOString().slice(0, 19).replace('T', ' '),
      stat: [],
      quant: 1,
      totalCount: 1,
      order: 'id',
      orderBy: 'desc',
      needSound: false,
      currentTime: Math.floor(Date.now() / 1000),
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('activations/recent')
  async getRecentActivations(@Req() req) {
    const userId = req.user.id;
    return this.smsService.getRecentActivations(userId);
  }

  @Post('webhook')
  async handleWebhook(@Body(new ZodValidationPipe(WebhookDto)) body: WebhookDto) {
    const { activationId, status, code } = body;
    try {
      const activation = await this.prismaService.smsActivation.findUnique({
        where: { activationId },
        include: { transactions: true },
      });
      if (!activation) {
        throw new NotFoundException(`No SmsActivation record found for activationId: ${activationId}`);
      }

      const updateData: any = {
        status: status === '6' ? 'COMPLETED' : status === '8' ? 'CANCELLED' : 'PENDING',
        code: code || null,
      };

      if (status === '8') {
        const debitTransaction = activation.transactions.find(
          (t) => t.type === 'DEBIT' && t.status === 'COMPLETED' && t.smsActivationId === activation.id,
        );
        if (debitTransaction && debitTransaction.amount > 0) {
          await this.prismaService.$transaction([
            this.prismaService.user.update({
              where: { id: activation.userId },
              data: { balance: { increment: debitTransaction.amount } },
            }),
            this.prismaService.transaction.create({
              data: {
                userId: activation.userId,
                amount: debitTransaction.amount,
                type: 'REFUNDED',
                status: 'COMPLETED',
                description: `Refund for SMS activation: ${activation.service} (${activation.country})`,
                smsActivationId: activation.id,
              },
            }),
            this.prismaService.transaction.update({
              where: { id: debitTransaction.id },
              data: { status: 'REFUNDED' },
            }),
            this.prismaService.smsActivation.update({
              where: { activationId },
              data: updateData,
            }),
          ]);
          this.logger.log(`Refunded ${debitTransaction.amount} credits for activation ${activationId}`);
        } else {
          await this.prismaService.smsActivation.update({
            where: { activationId },
            data: updateData,
          });
        }
      } else {
        await this.prismaService.smsActivation.update({
          where: { activationId },
          data: updateData,
        });
      }

      return { status: 'received' };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to process webhook: ' + error.message);
    }
  }

  @Post('webhook/active-sms')
  async handleActiveSmsWebhook(@Body() body: any) {
    this.logger.log(`ActiveSMS webhook received: ${JSON.stringify(body)}`);
    
    try {
      // Parsear formato do ActiveSMS (baseado na documentação oficial)
      const { activationId, service, text, code, country, receivedAt } = body;
      
      if (!activationId) {
        throw new BadRequestException('activationId is required');
      }

      const activation = await this.prismaService.smsActivation.findUnique({
        where: { activationId: activationId.toString() },
        include: { transactions: true },
      });

      if (!activation) {
        this.logger.warn(`No activation found for ActiveSMS webhook: ${activationId}`);
        return { status: 'ignored' };
      }

      // Se recebeu código, significa que foi completado
      const newStatus = code ? 'COMPLETED' : 'PENDING';

      const updateData: any = {
        status: newStatus,
        code: code || null,
      };

      // Se recebeu código, também atualizar o número formatado se necessário
      if (code && text) {
        // Extrair número do texto se disponível
        const phoneFromText = text.match(/\+\d+/);
        if (phoneFromText) {
          updateData.number = phoneFromText[0];
        }
      }

      this.logger.log(`Updating activation ${activationId} to status: ${newStatus}, code: ${code || 'none'}, receivedAt: ${receivedAt}`);

      // Atualizar o registro
      await this.prismaService.smsActivation.update({
        where: { activationId: activationId.toString() },
        data: updateData,
      });

      this.logger.log(`ActiveSMS webhook processed successfully for activationId: ${activationId}`);
      return { status: 'received' };
    } catch (error) {
      this.logger.error(`ActiveSMS webhook processing failed: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to process ActiveSMS webhook: ' + error.message);
    }
  }

  @Post('webhook/active-sms-cancel')
  async handleActiveSmsCancelWebhook(@Body() body: any) {
    this.logger.log(`ActiveSMS cancel webhook received: ${JSON.stringify(body)}`);
    
    try {
      // Para cancelamentos/timeout, o ActiveSMS pode enviar um webhook diferente
      const { activationId } = body;
      
      if (!activationId) {
        throw new BadRequestException('activationId is required');
      }

      const activation = await this.prismaService.smsActivation.findUnique({
        where: { activationId: activationId.toString() },
        include: { transactions: true },
      });

      if (!activation) {
        this.logger.warn(`No activation found for ActiveSMS cancel webhook: ${activationId}`);
        return { status: 'ignored' };
      }

      // Processar estorno para cancelamento
      if (activation.status !== 'COMPLETED') {
        const debitTransaction = activation.transactions.find(
          (t) => t.type === 'DEBIT' && t.status === 'COMPLETED' && t.smsActivationId === activation.id,
        );
        
        // Verificar se já existe estorno para evitar duplicação
        const existingRefund = activation.transactions.find(
          (t) => t.type === 'REFUNDED' && t.smsActivationId === activation.id,
        );
        
        if (debitTransaction && debitTransaction.amount > 0 && !existingRefund) {
          await this.prismaService.$transaction([
            this.prismaService.user.update({
              where: { id: activation.userId },
              data: { balance: { increment: debitTransaction.amount } },
            }),
            this.prismaService.transaction.create({
              data: {
                userId: activation.userId,
                amount: debitTransaction.amount,
                type: 'REFUNDED',
                status: 'COMPLETED',
                description: `Refund for SMS activation: ${activation.service} (${activation.country}) - ActiveSMS timeout`,
                smsActivationId: activation.id,
              },
            }),
            this.prismaService.transaction.update({
              where: { id: debitTransaction.id },
              data: { status: 'REFUNDED' },
            }),
            this.prismaService.smsActivation.update({
              where: { activationId: activationId.toString() },
              data: { status: 'CANCELLED' },
            }),
          ]);
          this.logger.log(`Refunded ${debitTransaction.amount} credits for activation ${activationId} via ActiveSMS cancel webhook`);
        } else if (existingRefund) {
          this.logger.log(`Activation ${activationId} already has refund, skipping ActiveSMS cancel webhook`);
        }
      }

      this.logger.log(`ActiveSMS cancel webhook processed successfully for activationId: ${activationId}`);
      return { status: 'received' };
    } catch (error) {
      this.logger.error(`ActiveSMS cancel webhook processing failed: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to process ActiveSMS cancel webhook: ' + error.message);
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
}