## SMS Platform Backend

Backend para plataforma de ativação de SMS usando NestJS, Prisma e PostgreSQL.

## 🚀 Tecnologias

- **NestJS** - Framework Node.js
- **Prisma** - ORM para PostgreSQL
- **PostgreSQL** - Banco de dados
- **Redis** - Cache e filas (Bull)
- **JWT** - Autenticação
- **Zod** - Validação de dados

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
├── credits/        # Gestão de créditos
├── payments/       # Processamento de pagamentos
├── sms/           # Ativação de SMS
├── users/         # Gestão de usuários
├── prisma/        # Configuração do Prisma
└── common/        # Utilitários compartilhados
```

## 🔧 Principais Funcionalidades

- **Autenticação**: Registro e login de usuários com JWT
- **Gestão de Créditos**: Sistema de saldo e transações
- **Ativação de SMS**: Integração com SMS-Activate API
- **Pagamentos**: Processamento via PushinPay
- **Filas**: Processamento assíncrono com Bull/Redis
- **Afiliados**: Sistema de indicação, com geração de link, saldo de afiliado e saques via PIX

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

- `POST /auth/register` - Registro de usuário
- `POST /auth/login` - Login
- `POST /credits/buy` - Compra de créditos
- `POST /sms/buy` - Compra de ativação SMS
- `GET /sms/status/:id` - Status da ativação
- `POST /sms/webhook` - Webhook para atualizações

### Endpoints de Afiliados

- `GET /affiliate/link` - Gera ou retorna o link de afiliado do usuário autenticado
- `POST /affiliate/withdrawal` - Solicita saque do saldo de afiliado (mínimo 50 BRL, requer chave PIX)
- `POST /affiliate/commission` - (ADMIN) Define a comissão de afiliados (%)
- `GET /affiliate/commission` - (ADMIN) Consulta a comissão de afiliados (%)
- `GET /affiliate/withdrawals` - (ADMIN) Lista solicitações de saque (filtro opcional por status)
- `PATCH /affiliate/withdrawals/:id` - (ADMIN) Aprova ou cancela uma solicitação de saque
