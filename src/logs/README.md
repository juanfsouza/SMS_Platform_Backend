# Sistema de Logs da API

Este sistema de logs foi criado para rastrear todas as atividades dos usuários na plataforma, organizando-as por categorias como mostrado na interface da imagem.

## Categorias de Logs

### 1. Documentação (DOCUMENTATION)
- **Ícone**: 📁
- **Cor**: Cinza (#6B7280)
- **Uso**: Acessos à documentação da API

### 2. Login & Registro (LOGIN)
- **Ícone**: L
- **Cor**: Vermelho (#EF4444)
- **Uso**: Registros, logins, confirmações de email

### 3. Minhas APIs (MY_APIS)
- **Ícone**: M
- **Cor**: Vermelho (#EF4444)
- **Uso**: Acessos ao painel de APIs do usuário

### 4. Perfil (PROFILE)
- **Ícone**: P
- **Cor**: Laranja (#F97316)
- **Uso**: Acessos e modificações no perfil do usuário

### 5. Pagamento Gerado (PAYMENT_GENERATED)
- **Ícone**: P
- **Cor**: Laranja (#F97316)
- **Uso**: Criação de links de pagamento

### 6. Pagamento Confirmado (PAYMENT_CONFIRMED)
- **Ícone**: $
- **Cor**: Verde (#10B981)
- **Uso**: Confirmações de pagamento via webhook

### 7. Rotas Criadas (ROUTES_CREATED)
- **Ícone**: R
- **Cor**: Vermelho (#EF4444)
- **Uso**: Criação de rotas/endpoints da API

### 8. Deletou sua conta (ACCOUNT_DELETED)
- **Ícone**: ✏️
- **Cor**: Cinza (#6B7280)
- **Uso**: Exclusão de contas de usuário

### 9. General (GENERAL)
- **Ícone**: #
- **Cor**: Verde (#10B981)
- **Uso**: Ações gerais do sistema

### 10. Tentativa de Fraude (FRAUD_ATTEMPT)
- **Ícone**: T
- **Cor**: Vermelho (#EF4444)
- **Uso**: Tentativas de login inválidas, ataques

### 11. Recarga (RECHARGE)
- **Ícone**: R
- **Cor**: Azul (#3B82F6)
- **Uso**: Recargas de saldo

### 12. Ativação SMS (SMS_ACTIVATION)
- **Ícone**: S
- **Cor**: Roxo (#8B5CF6)
- **Uso**: Ativações de números SMS

### 13. Afiliado (AFFILIATE)
- **Ícone**: A
- **Cor**: Amarelo (#F59E0B)
- **Uso**: Ações relacionadas ao programa de afiliados

### 14. Admin (ADMIN)
- **Ícone**: A
- **Cor**: Vermelho escuro (#DC2626)
- **Uso**: Ações administrativas

## Endpoints da API

### GET /logs
Retorna logs do usuário autenticado com filtros opcionais.

**Query Parameters:**
- `category`: Filtrar por categoria
- `search`: Buscar por texto
- `page`: Página (padrão: 1)
- `limit`: Limite por página (padrão: 50)
- `startDate`: Data inicial (ISO string)
- `endDate`: Data final (ISO string)

### GET /logs/grouped
Retorna logs agrupados por categoria, similar à interface da imagem.

### GET /logs/stats
Retorna estatísticas dos logs do usuário.

### GET /logs/admin
Endpoints administrativos para ver todos os logs (sem autenticação de usuário).

## Como Usar

### 1. Injeção do Serviço
```typescript
import { LogsService } from './logs/logs.service';

constructor(private readonly logsService: LogsService) {}
```

### 2. Criar Logs Específicos
```typescript
// Log de login
await this.logsService.logLogin(
  userId,
  'Fez login na plataforma',
  'Fez login na plataforma - Email: user@example.com',
  { email: 'user@example.com' },
  ipAddress,
  userAgent
);

// Log de pagamento
await this.logsService.logPayment(
  userId,
  'Gerou um pagamento',
  'Gerou um pagamento - Valor: R$ 50.00',
  { amount: 50, transactionId: '123' },
  ipAddress,
  userAgent
);

// Log de recarga
await this.logsService.logRecharge(
  userId,
  'Realizou recarga',
  'Realizou recarga - Valor: R$ 100.00 - PIX',
  { amount: 100, method: 'PIX' },
  ipAddress,
  userAgent
);
```

### 3. Criar Logs Customizados
```typescript
await this.logsService.createLog({
  category: LogCategory.DOCUMENTATION,
  action: 'Acessou a Página de Documentação',
  description: 'Acessou a Página de Documentação - API Reference',
  metadata: { page: 'API Reference', userId },
  ipAddress,
  userAgent,
}, userId);
```

## Estrutura do Banco de Dados

```sql
CREATE TABLE "ApiLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "category" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiLog_pkey" PRIMARY KEY ("id")
);
```

## Integração com Módulos Existentes

O sistema já está integrado com:
- **AuthModule**: Logs de login, registro, confirmação de email
- **PaymentsModule**: Logs de pagamentos gerados e confirmados

Para integrar com outros módulos, adicione o `LogsModule` aos imports e injete o `LogsService`.

## Exemplo de Resposta da API

```json
{
  "logs": [
    {
      "id": 1,
      "userId": 123,
      "category": "LOGIN",
      "action": "Fez login na plataforma",
      "description": "Fez login na plataforma - Email: user@example.com",
      "metadata": { "email": "user@example.com" },
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2024-01-03T15:00:00.000Z",
      "user": {
        "id": 123,
        "email": "user@example.com",
        "name": "João Silva"
      }
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 50
}
```

## Logs Agrupados

```json
[
  {
    "category": "LOGIN",
    "categoryName": "Login & Registro",
    "icon": "L",
    "color": "#EF4444",
    "logs": [...],
    "count": 5
  }
]
```
