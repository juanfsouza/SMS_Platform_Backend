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
    secret: process.env.JWT_SECRET,
  },
  app: {
    baseUrl: process.env.APP_BASE_URL || 'http://localhost:3001',
  },
});