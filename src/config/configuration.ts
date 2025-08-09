import { ConfigModule } from '@nestjs/config';

export default () => ({
  port: parseInt(process.env.PORT ?? '', 10) || 3000,
  database: {
    url: process.env.DATABASE_URL,
  },
  smsActivate: {
    apiKey: process.env.SMS_ACTIVATE_API_KEY,
  },
  pushinpay: {
    apiKey: process.env.PUSHINPAY_API_KEY,
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-fallback-secret-key-change-in-production',
  },
  app: {
    baseUrl: process.env.APP_BASE_URL || 'http://localhost:3001',
  },
  turnstile: {
    secretKey: process.env.TURNSTILE_SECRET_KEY,
    siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
  },
});