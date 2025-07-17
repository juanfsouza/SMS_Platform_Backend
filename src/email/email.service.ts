import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.configService.get('EMAIL_USER'),
        pass: this.configService.get('EMAIL_PASS'),
      },
      secure: true,
      tls: {
        rejectUnauthorized: false,
      },
      logger: true,
      debug: true,
    });
  }

  async sendConfirmationEmail(email: string, token: string) {
    const confirmationLink = `http://localhost:3001/auth/confirm-email?token=${token}`;
    const mailOptions = {
      from: this.configService.get('EMAIL_USER'),
      to: email,
      subject: 'Confirme seu E-mail - SMS Platform',
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Arial', sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 50px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
            .header { background-color: oklch(0.6171 0.1375 39.0427); color: #ffffff; text-align: center; padding: 20px; }
            .content { padding: 30px; color: #333333; }
            .button { display: inline-block; padding: 12px 25px; background-color: oklch(0.6171 0.1375 39.0427); color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px; }
            .footer { text-align: center; padding: 20px; color: #666666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Bem-vindo à SMS Platform</h1>
            </div>
            <div class="content">
              <p>Olá ${email.split('@')[0]},</p>
              <p>Obrigado por se registrar! Para ativar sua conta, clique no botão abaixo para confirmar seu e-mail:</p>
              <a href="${confirmationLink}" class="button">Confirmar E-mail</a>
              <p>Este link expirará em 24 horas. Se você não solicitou isso, ignore este e-mail.</p>
            </div>
            <div class="footer">
              <p>&copy; 2025 SMS Platform. Todos os direitos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.response);
      return info;
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }
}