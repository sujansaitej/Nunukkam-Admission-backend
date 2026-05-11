import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fetching all users from database...');
  const users = await prisma.user.findMany({
    select: {
      userId: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true
    }
  });
  
  if (users.length === 0) {
    console.log('No users found in the database.');
  } else {
    console.table(users);
  }
}

main()
  .catch((e) => {
    console.error('Error fetching users:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
