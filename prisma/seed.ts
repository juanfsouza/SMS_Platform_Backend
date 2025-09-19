import * as dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  const adminEmail = 'geyoya3956@mirarmax.com';
  const rawPassword = 'Qwaszxc123@';
  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      role: 'admin',
      name: 'FindexSMS Admin',
      password: hashedPassword, // atenção: irá sobrescrever a senha existente
      updatedAt: new Date(),
    },
    create: {
      email: adminEmail,
      name: 'FindexSMS Admin',
      password: hashedPassword,
      balance: 1000.0,
      affiliateBalance: 0.0,
      role: 'admin',
      emailVerified: true,
      pixKey: null,
    },
  });

  console.log('✅ Admin upserted:', adminUser.email);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
