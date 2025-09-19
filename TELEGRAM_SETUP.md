# 🤖 Configuração do Bot do Telegram para Logs

## 📋 **Passo a Passo**

### 1. Criar um Bot no Telegram

1. **Abra o Telegram** e procure por `@BotFather`
2. **Envie o comando:** `/newbot`
3. **Digite o nome do bot:** `SMS Platform Logs Bot`
4. **Digite o username:** `sms_platform_logs_bot` (deve terminar com 'bot')
5. **Copie o token** que será fornecido (ex: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Obter seu Chat ID

1. **Inicie uma conversa** com seu bot
2. **Envie qualquer mensagem** (ex: `/start`)
3. **Acesse:** `https://api.telegram.org/bot<SEU_TOKEN>/getUpdates`
4. **Procure por** `"chat":{"id":123456789}` - esse é seu Chat ID

### 3. Configurar Variáveis de Ambiente

Adicione ao seu arquivo `.env`:

```bash
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_ADMIN_CHAT_ID=123456789
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/telegram/webhook

# Opcional: Usuários autorizados (separados por vírgula)
TELEGRAM_ALLOWED_USERS=123456789,987654321
```

### 4. Instalar Dependências

```bash
npm install node-telegram-bot-api @types/node-telegram-bot-api
```

### 5. Iniciar o Servidor

```bash
npm run start:dev
```

## 🎯 **Comandos Disponíveis**

### 📋 **Comandos Principais**
- `/start` - Iniciar o bot
- `/help` - Mostrar ajuda
- `/logs [limite]` - Ver logs recentes (padrão: 10)
- `/logs_grouped` - Ver logs agrupados por categoria
- `/stats` - Ver estatísticas dos logs

### 🔍 **Comandos de Busca**
- `/logs_user <user_id> [limite]` - Logs de usuário específico
- `/logs_category <categoria> [limite]` - Logs de categoria específica

### 📁 **Categorias Disponíveis**
- `DOCUMENTATION` - Acessos à documentação
- `LOGIN` - Login, registro, confirmação
- `MY_APIS` - Painel de APIs do usuário
- `PROFILE` - Ações no perfil
- `PAYMENT_GENERATED` - Criação de pagamentos
- `PAYMENT_CONFIRMED` - Confirmação de pagamentos
- `ROUTES_CREATED` - Criação de rotas/endpoints
- `ACCOUNT_DELETED` - Exclusão de contas
- `GENERAL` - Ações gerais
- `FRAUD_ATTEMPT` - Tentativas de fraude
- `RECHARGE` - Recargas de saldo
- `SMS_ACTIVATION` - Ativações SMS
- `AFFILIATE` - Ações de afiliados
- `ADMIN` - Ações administrativas

## 💡 **Exemplos de Uso**

```
/logs 20                    # Ver 20 logs recentes
/logs_user 123              # Logs do usuário 123
/logs_category LOGIN        # Logs de login
/logs_category PAYMENT_CONFIRMED 5  # 5 logs de pagamentos confirmados
```

## 📱 **Formato das Mensagens**

### Logs Recentes
```
📋 **Logs Recentes**

🔐 **Fez login na plataforma**
   Fez login na plataforma - Email: user@example.com
   👤 João Silva • 🕒 5m atrás

💳 **Gerou um pagamento**
   Gerou um pagamento - Valor: R$ 50.00
   👤 Maria Santos • 🕒 10m atrás
```

### Logs Agrupados
```
📋 **Logs Agrupados por Categoria**

🔐 **Login & Registro** (5)
   • Fez login na plataforma - 👤 João Silva • 🕒 5m atrás
   • Criou uma conta na plataforma - 👤 Maria Santos • 🕒 1h atrás

💳 **Pagamento Confirmado** (3)
   • Pagamento Sucesso - 👤 Pedro Costa • 🕒 2h atrás
   • Pagamento Sucesso - 👤 Ana Lima • 🕒 3h atrás
```

### Estatísticas
```
📊 **Estatísticas dos Logs**

📈 **Total de Logs:** 1,234

📋 **Por Categoria:**
🔐 **Login & Registro:** 456 logs
💳 **Pagamento Confirmado:** 234 logs
📁 **Documentação:** 123 logs
```

## 🔧 **Recursos Avançados**

### Notificações Automáticas
O bot pode enviar notificações automáticas para categorias importantes:
- Tentativas de fraude
- Pagamentos confirmados
- Exclusões de conta
- Ações administrativas

### Segurança
- Controle de usuários autorizados
- Logs de comandos executados
- Proteção contra spam

### Personalização
- Emojis para cada categoria
- Formatação de tempo relativo
- Truncamento de mensagens longas
- Suporte a Markdown

## 🚨 **Solução de Problemas**

### Bot não responde
1. Verifique se o token está correto
2. Confirme se o bot está ativo
3. Verifique os logs do servidor

### Erro de permissão
1. Verifique se o Chat ID está correto
2. Confirme se você iniciou uma conversa com o bot
3. Verifique se o bot tem as permissões necessárias

### Comandos não funcionam
1. Verifique se o servidor está rodando
2. Confirme se o módulo Telegram está importado
3. Verifique os logs de erro

## 📞 **Suporte**

Se tiver problemas:
1. Verifique os logs do servidor
2. Teste os comandos manualmente
3. Confirme as configurações do .env
4. Verifique se todas as dependências estão instaladas
