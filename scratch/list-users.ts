import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  try {
    const users = await prisma.user.findMany({ select: { email: true, name: true, role: true } });
    console.log('Users in DB:', JSON.stringify(users, null, 2));
  } catch (err) {
    console.error('Failed to list users:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
