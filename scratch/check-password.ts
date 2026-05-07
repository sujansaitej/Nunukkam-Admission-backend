import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { userId: true, name: true, email: true, password: true, role: true, isActive: true }
  });

  for (const u of users) {
    const match1 = await bcrypt.compare('admin123', u.password);
    const match2 = await bcrypt.compare('password123', u.password);
    console.log(`${u.email} | role: ${u.role} | active: ${u.isActive} | pw='admin123': ${match1} | pw='password123': ${match2} | hash_prefix: ${u.password.slice(0, 20)}...`);
  }

  await prisma.$disconnect();
}
main();
