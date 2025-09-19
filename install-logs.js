const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Instalando Sistema de Logs...\n');

try {
  // 1. Instalar dependências
  console.log('📦 Instalando dependências...');
  execSync('npm install class-validator class-transformer', { stdio: 'inherit' });
  console.log('✅ Dependências instaladas\n');

  // 2. Verificar se a migração existe
  const migrationPath = path.join(__dirname, 'prisma', 'migrations', '20250103150000_add_api_logs_table', 'migration.sql');
  if (!fs.existsSync(migrationPath)) {
    console.log('❌ Migração não encontrada. Execute primeiro: npx prisma migrate dev --name add_api_logs_table');
    process.exit(1);
  }

  // 3. Gerar cliente Prisma
  console.log('🔧 Gerando cliente Prisma...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Cliente Prisma gerado\n');

  // 4. Verificar se o schema está correto
  const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  
  if (!schemaContent.includes('model ApiLog')) {
    console.log('❌ Modelo ApiLog não encontrado no schema.prisma');
    process.exit(1);
  }

  console.log('✅ Schema verificado\n');

  // 5. Verificar arquivos do sistema de logs
  const logsDir = path.join(__dirname, 'src', 'logs');
  const requiredFiles = [
    'logs.service.ts',
    'logs.controller.ts',
    'logs.module.ts',
    'dtos/create-log.dto.ts',
    'dtos/log-response.dto.ts',
    'dtos/get-logs.dto.ts'
  ];

  let allFilesExist = true;
  for (const file of requiredFiles) {
    const filePath = path.join(logsDir, file);
    if (!fs.existsSync(filePath)) {
      console.log(`❌ Arquivo não encontrado: ${file}`);
      allFilesExist = false;
    }
  }

  if (!allFilesExist) {
    console.log('❌ Alguns arquivos do sistema de logs estão faltando');
    process.exit(1);
  }

  console.log('✅ Todos os arquivos do sistema de logs estão presentes\n');

  // 6. Verificar se o LogsModule está importado no app.module.ts
  const appModulePath = path.join(__dirname, 'src', 'app.module.ts');
  const appModuleContent = fs.readFileSync(appModulePath, 'utf8');
  
  if (!appModuleContent.includes('LogsModule')) {
    console.log('⚠️  LogsModule não encontrado no app.module.ts');
    console.log('   Adicione manualmente: import { LogsModule } from "./logs/logs.module";');
    console.log('   E inclua LogsModule nos imports do @Module\n');
  } else {
    console.log('✅ LogsModule já está importado no app.module.ts\n');
  }

  console.log('🎉 Sistema de Logs instalado com sucesso!\n');
  console.log('📋 Próximos passos:');
  console.log('   1. Execute: npx prisma migrate dev --name add_api_logs_table');
  console.log('   2. Execute: npm run start:dev');
  console.log('   3. Teste os endpoints:');
  console.log('      - GET /logs');
  console.log('      - GET /logs/grouped');
  console.log('      - GET /logs/stats');
  console.log('\n📚 Documentação completa em: src/logs/README.md');
  console.log('🔧 Instruções de instalação em: LOGS_INSTALLATION.md\n');

} catch (error) {
  console.error('❌ Erro durante a instalação:', error.message);
  console.log('\n🔧 Instruções manuais:');
  console.log('   1. npm install class-validator class-transformer');
  console.log('   2. npx prisma migrate dev --name add_api_logs_table');
  console.log('   3. npx prisma generate');
  console.log('   4. npm run start:dev');
  process.exit(1);
}
