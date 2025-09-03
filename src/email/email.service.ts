import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter;

  constructor(private configService: ConfigService) {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const emailUser = this.configService.get('EMAIL_USER');
    const emailPass = this.configService.get('EMAIL_PASS');

    if (!emailUser || !emailPass) {
      this.logger.error('EMAIL_USER or EMAIL_PASS not configured');
      throw new Error('Email configuration missing');
    }

    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass,
      },
      secure: true, // Use SSL
      port: 465,
      tls: {
        rejectUnauthorized: false,
      },
      // Remove debug logs in production
      logger: process.env.NODE_ENV === 'development',
      debug: process.env.NODE_ENV === 'development',
    });
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      this.logger.log('SMTP connection verified successfully');
      return true;
    } catch (error) {
      this.logger.error('SMTP connection failed:', error.message);
      return false;
    }
  }

  async sendConfirmationEmail(email: string, token: string) {
    try {
      // Verify connection before sending
      const isConnected = await this.verifyConnection();
      if (!isConnected) {
        throw new Error('SMTP connection failed');
      }

      const frontendBaseUrl = this.configService.get('app.baseUrl') || 'http://localhost:3000';
      const confirmationLink = `${frontendBaseUrl}/auth/confirm-email?token=${token}`;
      
      const mailOptions = {
        from: {
          name: 'FDX SMS Platform',
          address: this.configService.get('EMAIL_USER'),
        },
        to: email,
        subject: 'Confirme seu E-mail - FDX SMS',
        html: this.getConfirmationEmailTemplate(email, confirmationLink),
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Confirmation email sent successfully to ${email}`);
      return info;
    } catch (error) {
      this.logger.error(`Failed to send confirmation email to ${email}:`, error.message);
      
      // Provide more specific error messages
      if (error.code === 'EAUTH') {
        throw new Error('Email authentication failed. Please check your email credentials.');
      } else if (error.code === 'ECONNECTION') {
        throw new Error('Failed to connect to email server. Please try again later.');
      } else {
        throw new Error(`Email sending failed: ${error.message}`);
      }
    }
  }

  async sendResetPasswordEmail(email: string, resetLink: string) {
    try {
      // Verify connection before sending
      const isConnected = await this.verifyConnection();
      if (!isConnected) {
        throw new Error('SMTP connection failed');
      }

      const mailOptions = {
        from: {
          name: 'FDX SMS Platform',
          address: this.configService.get('EMAIL_USER'),
        },
        to: email,
        subject: 'Redefinir sua Senha - FDX SMS',
        html: this.getResetPasswordEmailTemplate(email, resetLink),
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Reset password email sent successfully to ${email}`);
      return info;
    } catch (error) {
      this.logger.error(`Failed to send reset password email to ${email}:`, error.message);
      
      if (error.code === 'EAUTH') {
        throw new Error('Email authentication failed. Please check your email credentials.');
      } else if (error.code === 'ECONNECTION') {
        throw new Error('Failed to connect to email server. Please try again later.');
      } else {
        throw new Error(`Email sending failed: ${error.message}`);
      }
    }
  }

  private getConfirmationEmailTemplate(email: string, confirmationLink: string): string {
    const userName = email.split('@')[0];
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Confirme seu E-mail</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background-color: #f8f9fa; 
            margin: 0; 
            padding: 0; 
            line-height: 1.6;
          }
          .container { 
            max-width: 600px; 
            margin: 40px auto; 
            background-color: #ffffff; 
            border-radius: 12px; 
            overflow: hidden; 
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1); 
          }
          .header { 
            background: linear-gradient(135deg, oklch(0.6171 0.1375 39.0427), oklch(0.7171 0.1375 39.0427));
            color: #ffffff; 
            text-align: center; 
            padding: 40px 20px; 
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          .content { 
            padding: 40px 30px; 
            color: #333333; 
            text-align: center;
          }
          .content p {
            margin: 0 0 20px 0;
            font-size: 16px;
          }
          .button { 
            display: inline-block; 
            padding: 16px 32px; 
            background: linear-gradient(135deg, oklch(0.6171 0.1375 39.0427), oklch(0.7171 0.1375 39.0427));
            color: #ffffff; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: 600; 
            font-size: 16px;
            margin: 20px 0;
            transition: transform 0.2s ease;
          }
          .button:hover {
            transform: translateY(-2px);
          }
          .footer { 
            text-align: center; 
            padding: 30px; 
            color: #6c757d; 
            font-size: 14px; 
            background-color: #f8f9fa;
          }
          .security-note {
            background-color: #e7f3ff;
            border-left: 4px solid oklch(0.6171 0.1375 39.0427);
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🚀 Bem-vindo à SMS Platform!</h1>
          </div>
          <div class="content">
            <p><strong>Olá, ${userName}!</strong></p>
            <p>Obrigado por se registrar na nossa plataforma! Para começar a usar todos os recursos, confirme seu e-mail clicando no botão abaixo:</p>
            
            <a href="${confirmationLink}" class="button">✉️ Confirmar E-mail</a>
            
            <div class="security-note">
              <p style="margin: 0; font-size: 14px;">
                <strong>🔒 Segurança:</strong> Este link expirará em 24 horas. Se você não se registrou, ignore este e-mail.
              </p>
            </div>
          </div>
          <div class="footer">
            <p>© 2025 FDX SMS Platform. Todos os direitos reservados.</p>
            <p>Este e-mail foi enviado para ${email}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getResetPasswordEmailTemplate(email: string, resetLink: string): string {
    const userName = email.split('@')[0];
    return `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Redefinir Senha</title>
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            background-color: #f8f9fa; 
            margin: 0; 
            padding: 0; 
            line-height: 1.6;
          }
          .container { 
            max-width: 600px; 
            margin: 40px auto; 
            background-color: #ffffff; 
            border-radius: 12px; 
            overflow: hidden; 
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1); 
          }
          .header { 
            background: linear-gradient(135deg, #dc3545, #c82333);
            color: #ffffff; 
            text-align: center; 
            padding: 40px 20px; 
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          .content { 
            padding: 40px 30px; 
            color: #333333; 
            text-align: center;
          }
          .content p {
            margin: 0 0 20px 0;
            font-size: 16px;
          }
          .button { 
            display: inline-block; 
            padding: 16px 32px; 
            background: linear-gradient(135deg, #dc3545, #c82333);
            color: #ffffff; 
            text-decoration: none; 
            border-radius: 8px; 
            font-weight: 600; 
            font-size: 16px;
            margin: 20px 0;
            transition: transform 0.2s ease;
          }
          .button:hover {
            transform: translateY(-2px);
          }
          .footer { 
            text-align: center; 
            padding: 30px; 
            color: #6c757d; 
            font-size: 14px; 
            background-color: #f8f9fa;
          }
          .warning-note {
            background-color: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 0 8px 8px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Redefinição de Senha</h1>
          </div>
          <div class="content">
            <p><strong>Olá, ${userName}!</strong></p>
            <p>Recebemos uma solicitação para redefinir sua senha. Clique no botão abaixo para criar uma nova senha:</p>
            
            <a href="${resetLink}" class="button">🔑 Redefinir Senha</a>
            
            <div class="warning-note">
              <p style="margin: 0; font-size: 14px;">
                <strong>⚠️ Importante:</strong> Este link expirará em 1 hora. Se você não solicitou esta redefinição, ignore este e-mail.
              </p>
            </div>
          </div>
          <div class="footer">
            <p>© 2025 FDX SMS Platform. Todos os direitos reservados.</p>
            <p>Este e-mail foi enviado para ${email}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}