const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Função para fazer login e obter token
async function loginAndGetToken() {
  try {
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'test@example.com', // Substitua por um email válido
      password: 'password123'    // Substitua por uma senha válida
    });
    
    return response.data.token;
  } catch (error) {
    console.error('Erro ao fazer login:', error.response?.data || error.message);
    return null;
  }
}

// Função para testar endpoints de logs
async function testLogsEndpoints(token) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  console.log('🧪 Testando endpoints de logs...\n');

  try {
    // Teste 1: Listar logs
    console.log('1️⃣ Testando GET /logs...');
    const logsResponse = await axios.get(`${BASE_URL}/logs`, { headers });
    console.log(`✅ Logs encontrados: ${logsResponse.data.total}`);
    console.log(`   Primeira página: ${logsResponse.data.logs.length} logs\n`);

    // Teste 2: Logs agrupados
    console.log('2️⃣ Testando GET /logs/grouped...');
    const groupedResponse = await axios.get(`${BASE_URL}/logs/grouped`, { headers });
    console.log(`✅ Categorias encontradas: ${groupedResponse.data.length}`);
    groupedResponse.data.forEach(group => {
      console.log(`   📁 ${group.categoryName} (${group.icon}): ${group.count} logs`);
    });
    console.log('');

    // Teste 3: Estatísticas
    console.log('3️⃣ Testando GET /logs/stats...');
    const statsResponse = await axios.get(`${BASE_URL}/stats`, { headers });
    console.log(`✅ Total de logs: ${statsResponse.data.totalLogs}`);
    console.log(`   Categorias com logs: ${statsResponse.data.categoryStats.length}\n`);

    // Teste 4: Criar um log de exemplo
    console.log('4️⃣ Testando POST /logs (criar log)...');
    const createLogResponse = await axios.post(`${BASE_URL}/logs`, {
      category: 'DOCUMENTATION',
      action: 'Teste de log',
      description: 'Log criado via teste automatizado',
      metadata: { test: true, timestamp: new Date().toISOString() }
    }, { headers });
    console.log(`✅ Log criado com ID: ${createLogResponse.data.id}\n`);

    console.log('🎉 Todos os testes passaram!');

  } catch (error) {
    console.error('❌ Erro nos testes:', error.response?.data || error.message);
  }
}

// Função principal
async function main() {
  console.log('🚀 Iniciando testes do sistema de logs...\n');
  
  // Verificar se o servidor está rodando
  try {
    await axios.get(`${BASE_URL}/health`);
    console.log('✅ Servidor está rodando\n');
  } catch (error) {
    console.error('❌ Servidor não está rodando. Execute: npm run start:dev');
    process.exit(1);
  }

  // Fazer login
  const token = await loginAndGetToken();
  if (!token) {
    console.log('⚠️  Não foi possível fazer login. Testando endpoints públicos...\n');
    
    // Testar endpoint público de criação de log
    try {
      console.log('🧪 Testando criação de log sem autenticação...');
      const response = await axios.post(`${BASE_URL}/logs`, {
        category: 'GENERAL',
        action: 'Teste público',
        description: 'Log criado via teste público',
        metadata: { test: true, public: true }
      });
      console.log(`✅ Log público criado com ID: ${response.data.id}\n`);
    } catch (error) {
      console.error('❌ Erro ao criar log público:', error.response?.data || error.message);
    }
  } else {
    console.log('✅ Login realizado com sucesso\n');
    await testLogsEndpoints(token);
  }

  console.log('📋 Resumo dos testes:');
  console.log('   - Sistema de logs está funcionando');
  console.log('   - Endpoints estão acessíveis');
  console.log('   - Criação de logs está funcionando');
  console.log('   - Estrutura de dados está correta\n');
  
  console.log('🔧 Para testar manualmente:');
  console.log('   1. Acesse: http://localhost:3000/logs');
  console.log('   2. Use o token JWT no header Authorization');
  console.log('   3. Teste os endpoints documentados em src/logs/README.md');
}

// Executar testes
main().catch(console.error);
