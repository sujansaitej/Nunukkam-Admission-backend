import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding new admin credentials...');
  
  const email = 'admin@nunukkam1.com';
  const plainPassword = 'admin12345';
  
  const pw = await bcrypt.hash(plainPassword, 10);
  
  const admin = await prisma.user.upsert({
    where: { email },
    update: { password: pw },
    create: { 
      name: 'Admin User', 
      email: email, 
      password: pw, 
      role: 'admin' 
    }
  });

  console.log('✅ Successfully seeded:');
  console.log(`Email: ${admin.email}`);
  console.log(`Password: ${plainPassword}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
