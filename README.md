# SMS Platform Backend

Backend para plataforma de ativação de SMS usando NestJS, Prisma e PostgreSQL.

## 🚀 Tecnologias

- **NestJS** - Framework Node.js
- **Prisma** - ORM para PostgreSQL
- **PostgreSQL** - Banco de dados
- **Redis** - Cache e filas (Bull)
- **JWT** - Autenticação
- **Zod** - Validação de dados
- **Turnstile** - Proteção contra bots
- **Nodemailer** - Envio de emails
- **Helmet** - Segurança HTTP

## 📋 Pré-requisitos

- Node.js (versão 18+)
- PostgreSQL
- Redis

## ⚙️ Configuração

1. **Clone o repositório**
```bash
git clone <repository-url>
cd sms-platform-backend
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
Crie um arquivo `.env` na raiz do projeto:
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/sms_platform"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key

# SMS Activate API
SMS_ACTIVATE_API_KEY=your-api-key

# PushinPay API
PUSHINPAY_API_KEY=your-api-key

# Server
PORT=3000

# App Configuration
APP_BASE_URL=http://localhost:3001

# Turnstile (Cloudflare)
TURNSTILE_SECRET_KEY=your-turnstile-secret-key
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your-turnstile-site-key

# Email Configuration (para confirmação e recuperação de senha)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

4. **Configure o banco de dados**
```bash
# Execute as migrações
npx prisma migrate dev

# Popule o banco com dados iniciais
npm run seed
```

## 🏃‍♂️ Executando a aplicação

```bash
# Desenvolvimento
npm run start:dev

# Produção
npm run build
npm run start:prod
```

## 📚 Estrutura do Projeto

```
src/
├── auth/           # Autenticação e autorização
├── credits/        # Gestão de créditos e preços
├── payments/       # Processamento de pagamentos
├── sms/           # Ativação de SMS
├── users/         # Gestão de usuários
├── affiliate/     # Sistema de afiliados
├── email/         # Sistema de envio de emails
├── turnstile/     # Proteção contra bots
├── config/        # Configurações da aplicação
├── prisma/        # Configuração do Prisma
└── common/        # Utilitários compartilhados
```

## 🔧 Principais Funcionalidades

- **Autenticação**: Registro, login, confirmação de email e recuperação de senha com JWT
- **Proteção contra Bots**: Integração com Cloudflare Turnstile
- **Gestão de Créditos**: Sistema de saldo e transações
- **Ativação de SMS**: Integração com SMS-Activate API
- **Pagamentos**: Processamento via PushinPay com verificação automática
- **Filas**: Processamento assíncrono com Bull/Redis
- **Afiliados**: Sistema de indicação, com geração de link, saldo de afiliado e saques via PIX
- **Email**: Sistema de envio de emails para confirmação e recuperação de senha
- **Rate Limiting**: Proteção contra spam com throttling
- **Segurança**: Headers de segurança com Helmet

## 🧪 Testes

```bash
# Testes unitários
npm run test

# Testes e2e
npm run test:e2e

# Cobertura de testes
npm run test:cov
```

## 📝 Scripts Disponíveis

- `npm run start:dev` - Executa em modo desenvolvimento
- `npm run build` - Compila o projeto
- `npm run start:prod` - Executa em produção
- `npm run test` - Executa testes
- `npm run seed` - Popula o banco com dados iniciais
- `npm run lint` - Executa linter
- `npm run format` - Formata o código

## 🔌 APIs Principais

### Autenticação
- `POST /api/auth/register` - Registro de usuário (requer Turnstile)
- `POST /api/auth/login` - Login (requer Turnstile)
- `GET /api/auth/confirm-email` - Confirmação de email
- `POST /api/auth/forgot-password` - Solicita recuperação de senha
- `POST /api/auth/reset-password` - Redefine senha

### Usuários
- `GET /api/users/me` - Dados do usuário atual
- `GET /api/users/me/balance` - Saldo do usuário atual
- `PATCH /api/users/me` - Atualiza dados do usuário
- `GET /api/users` - (ADMIN) Lista todos os usuários
- `POST /api/users/balance` - (ADMIN) Adiciona saldo a usuário
- `POST /api/users/affiliate-balance` - (ADMIN) Adiciona saldo de afiliado
- `PATCH /api/users/balance` - (ADMIN) Atualiza saldo de usuário
- `DELETE /api/users/balance` - (ADMIN) Reseta saldo de usuário

### Pagamentos
- `POST /api/payments/create-checkout` - Cria link de pagamento
- `POST /api/payments/webhook` - Webhook para atualizações de pagamento
- `GET /api/payments/transactions/:id` - Status de transação
- `POST /api/payments/check-and-process/:id` - Verifica e processa pagamento
- `POST /api/payments/verify-and-update` - (ADMIN) Verifica e atualiza pagamento
- `GET /api/payments/transactions` - Histórico de transações do usuário

### SMS
- `GET /api/sms/numbers-status` - Status de números disponíveis
- `POST /api/sms/buy` - Compra de ativação SMS
- `GET /api/sms/status/:activationId` - Status da ativação
- `GET /api/sms/activations/recent` - Ativações recentes do usuário
- `POST /api/sms/webhook` - Webhook para atualizações de SMS

### Créditos e Preços
- `GET /api/credits/prices` - Lista todos os preços de serviços
- `GET /api/credits/prices/filter` - Filtra preços por serviço/país
- `POST /api/credits/markup` - (ADMIN) Define markup de preços
- `GET /api/credits/markup` - (ADMIN) Consulta markup atual
- `POST /api/credits/update-markup` - (ADMIN) Atualiza markup e preços
- `POST /api/credits/refresh-prices` - (ADMIN) Atualiza preços da API
- `POST /api/credits/update-single-price` - (ADMIN) Atualiza preço específico

### Afiliados
- `GET /api/affiliate/link` - Gera ou retorna o link de afiliado do usuário autenticado
- `POST /api/affiliate/withdrawal` - Solicita saque do saldo de afiliado (mínimo 50 BRL, requer chave PIX)
- `POST /api/affiliate/commission` - (ADMIN) Define a comissão de afiliados (%)
- `GET /api/affiliate/commission` - (ADMIN) Consulta a comissão de afiliados (%)
- `GET /api/affiliate/withdrawals` - (ADMIN) Lista solicitações de saque (filtro opcional por status)
- `PATCH /api/affiliate/withdrawals/:id` - (ADMIN) Aprova ou cancela uma solicitação de saque

## 🔒 Segurança

- **Rate Limiting**: Máximo 10 requisições por IP por minuto
- **Turnstile**: Proteção contra bots em registro e login
- **Helmet**: Headers de segurança HTTP
- **CORS**: Configurado para domínio específico
- **JWT**: Autenticação baseada em tokens
- **Validação**: Todos os dados validados com Zod

## 📊 Banco de Dados

### Principais Tabelas
- **User**: Usuários com saldo principal e de afiliado
- **Transaction**: Histórico de transações
- **SmsActivation**: Ativações de SMS
- **AffiliateLink**: Links de afiliados
- **WithdrawalRequest**: Solicitações de saque
- **ServicePrice**: Preços dos serviços por país
- **Markup**: Configuração de markup
- **AffiliateCommission**: Configuração de comissão

## 🚀 Deploy

1. Configure as variáveis de ambiente para produção
2. Execute `npm run build`
3. Execute `npm run start:prod`
4. Configure um proxy reverso (nginx) se necessário
5. Configure SSL/TLS para HTTPS

