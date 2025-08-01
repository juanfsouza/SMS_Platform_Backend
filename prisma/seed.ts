import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Hash da senha admin
  const hashedPassword = await bcrypt.hash('@Recurso1', 10);

  try {
    // Verificar se já existe um admin
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@findexsms.com' }
    });

    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!');
      console.log(`📧 Email: admin@findexsms.com`);
      return;
    }

    // Criar usuário admin
    const adminUser = await prisma.user.create({
      data: {
        email: 'turk0101@gmail.com',
        name: 'FindexSMS Admin',
        password: hashedPassword,
        balance: 1000.0, // Saldo inicial generoso para admin
        affiliateBalance: 0.0,
        role: 'ADMIN', // Definir como admin
        emailVerified: true, // Admin já verificado
        pixKey: null,
      },
    });

    console.log('✅ Admin user created successfully!');
    console.log('📋 Admin Details:');
    console.log(`   ID: ${adminUser.id}`);
    console.log(`   📧 Email: ${adminUser.email}`);
    console.log(`   👤 Name: ${adminUser.name}`);
    console.log(`   🔐 Password: AdminPass123!`);
    console.log(`   💰 Balance: ${adminUser.balance}`);
    console.log(`   👑 Role: ${adminUser.role}`);
    console.log(`   ✅ Email Verified: ${adminUser.emailVerified}`);
    console.log('');
    console.log('🚀 You can now login with these credentials!');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('💥 Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    console.log('🔌 Disconnecting from database...');
    await prisma.$disconnect();
    console.log('✨ Seed completed!');
  });