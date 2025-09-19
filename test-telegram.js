const axios = require('axios');

// Configurações do bot
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'SEU_TOKEN_AQUI';
const CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID || 'SEU_CHAT_ID_AQUI';

const TELEGRAM_API_URL = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendTestMessage() {
  try {
    console.log('🤖 Testando bot do Telegram...\n');
    
    // Verificar se o bot está funcionando
    console.log('1️⃣ Verificando informações do bot...');
    const botInfo = await axios.get(`${TELEGRAM_API_URL}/getMe`);
    console.log(`✅ Bot: ${botInfo.data.result.first_name} (@${botInfo.data.result.username})\n`);
    
    // Enviar mensagem de teste
    console.log('2️⃣ Enviando mensagem de teste...');
    const message = `
🤖 **Bot de Logs da API - Teste**

✅ Bot configurado com sucesso!
🔧 Sistema de logs integrado
📱 Pronto para receber comandos

📋 **Comandos disponíveis:**
• /start - Iniciar o bot
• /help - Mostrar ajuda
• /logs - Ver logs recentes
• /logs_grouped - Ver logs agrupados
• /stats - Ver estatísticas

🚀 **Status:** Online e funcionando!
    `;
    
    const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
      chat_id: CHAT_ID,
      text: message,
      parse_mode: 'Markdown'
    });
    
    console.log(`✅ Mensagem enviada com sucesso! (Message ID: ${response.data.result.message_id})\n`);
    
    // Enviar comandos de exemplo
    console.log('3️⃣ Enviando comandos de exemplo...');
    
    const commands = [
      { command: '/start', description: 'Iniciar bot' },
      { command: '/help', description: 'Mostrar ajuda' },
      { command: '/logs 5', description: 'Ver 5 logs recentes' },
      { command: '/logs_grouped', description: 'Ver logs agrupados' },
      { command: '/stats', description: 'Ver estatísticas' }
    ];
    
    for (const cmd of commands) {
      console.log(`   📤 Enviando: ${cmd.command} - ${cmd.description}`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Delay entre comandos
    }
    
    console.log('\n✅ Todos os comandos enviados!\n');
    
    console.log('🎉 **Teste concluído com sucesso!**\n');
    console.log('📋 **Próximos passos:**');
    console.log('   1. Verifique se recebeu as mensagens no Telegram');
    console.log('   2. Teste os comandos manualmente');
    console.log('   3. Confirme se os logs estão sendo exibidos corretamente');
    console.log('\n🔧 **Para usar em produção:**');
    console.log('   1. Configure as variáveis de ambiente');
    console.log('   2. Inicie o servidor: npm run start:dev');
    console.log('   3. O bot estará disponível automaticamente');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('\n🔧 **Solução:** Verifique se o BOT_TOKEN está correto');
    } else if (error.response?.status === 400) {
      console.log('\n🔧 **Solução:** Verifique se o CHAT_ID está correto');
    } else {
      console.log('\n🔧 **Solução:** Verifique sua conexão com a internet');
    }
    
    console.log('\n📚 **Documentação completa:** TELEGRAM_SETUP.md');
  }
}

// Verificar se as variáveis estão configuradas
if (BOT_TOKEN === 'SEU_TOKEN_AQUI' || CHAT_ID === 'SEU_CHAT_ID_AQUI') {
  console.log('⚠️  **Configuração necessária:**\n');
  console.log('1. Configure as variáveis de ambiente:');
  console.log('   export TELEGRAM_BOT_TOKEN="seu_token_aqui"');
  console.log('   export TELEGRAM_ADMIN_CHAT_ID="seu_chat_id_aqui"');
  console.log('\n2. Ou adicione ao arquivo .env:');
  console.log('   TELEGRAM_BOT_TOKEN=seu_token_aqui');
  console.log('   TELEGRAM_ADMIN_CHAT_ID=seu_chat_id_aqui');
  console.log('\n📚 **Instruções completas:** TELEGRAM_SETUP.md');
  process.exit(1);
}

// Executar teste
sendTestMessage();
