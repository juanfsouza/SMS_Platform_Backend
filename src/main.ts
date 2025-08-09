import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // CORS - Configure ANTES do helmet
  app.enableCors({
    origin: [
      'http://localhost:3001',
      'http://localhost:3000',
      'https://www.findexsms.com',
      // Adicione outros domínios conforme necessário
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With',
      'cf-turnstile-response',
      'turnstile-token'
    ],
    credentials: true,
    optionsSuccessStatus: 200, // Para browsers legados
  });

  // Helmet for secure headers - Configure DEPOIS do CORS
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'", 
          "'unsafe-inline'", 
          "'unsafe-eval'", // Necessário para alguns frameworks
          "https://challenges.cloudflare.com",
          "blob:", // Para scripts dinâmicos
        ],
        styleSrc: [
          "'self'", 
          "'unsafe-inline'",
          "https://challenges.cloudflare.com",
        ],
        connectSrc: [
          "'self'", 
          'https://www.findexsms.com',
          'https://challenges.cloudflare.com', // Importante para Turnstile
          'wss:', // WebSockets
        ],
        frameSrc: [
          "'self'", 
          "https://challenges.cloudflare.com", // Essencial para Turnstile
        ],
        imgSrc: [
          "'self'", 
          "data:", 
          "https:", // Imagens HTTPS
        ],
        fontSrc: [
          "'self'", 
          "data:",
          "https://fonts.gstatic.com",
        ],
        objectSrc: ["'none'"], // Segurança
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Disable para evitar problemas com Turnstile
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: { 
      maxAge: 31536000, 
      includeSubDomains: true, 
      preload: true 
    },
  }));

  // Request logging com mais detalhes
  app.use((req, res, next) => {
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const origin = req.headers.origin || req.headers.host || 'Unknown';
    
    logger.log(`${req.method} ${req.url} - Origin: ${origin} - IP: ${req.ip} - UA: ${userAgent.substring(0, 50)}`);
    
    // Log para requests de Turnstile
    if (req.body?.turnstileToken) {
      logger.log(`Turnstile token received: ${req.body.turnstileToken.substring(0, 20)}...`);
    }
    
    next();
  });

  // Global error handler
  app.use((error: any, req: any, res: any, next: any) => {
    logger.error(`Global error: ${error.message}`, error.stack);
    if (!res.headersSent) {
      res.status(500).json({
        message: 'Internal server error',
        timestamp: new Date().toISOString(),
      });
    }
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`🚀 Application is running on: http://localhost:${port}`);
  logger.log(`🔒 CORS enabled for origins: http://localhost:3001, https://www.findexsms.com`);
  logger.log(`🛡️ Turnstile protection enabled`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});