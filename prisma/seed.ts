import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Nunukkam EIS database...');

  // Users
  const pw = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({ where: { email: 'admin@nunukkam.com' }, update: {}, create: { name: 'Admin', email: 'admin@nunukkam.com', password: pw, role: 'admin' } });
  const c1 = await prisma.user.upsert({ where: { email: 'priya@nunukkam.com' }, update: {}, create: { name: 'Priya Sharma', email: 'priya@nunukkam.com', password: pw, role: 'counselor' } });
  const c2 = await prisma.user.upsert({ where: { email: 'karthik@nunukkam.com' }, update: {}, create: { name: 'Karthik Rajan', email: 'karthik@nunukkam.com', password: pw, role: 'counselor' } });
  console.log('✅ Users seeded');

  // Partners
  const p1 = await prisma.partner.upsert({ where: { partnerId: '00000000-0000-0000-0000-000000000001' }, update: {}, create: { partnerId: '00000000-0000-0000-0000-000000000001', name: 'ABC Coaching Centre', type: 'coaching_center', contactPerson: 'Ramesh Kumar', mobile: '9876543210', email: 'ramesh@abccoaching.com', commissionRate: 12 } });
  const p2 = await prisma.partner.upsert({ where: { partnerId: '00000000-0000-0000-0000-000000000002' }, update: {}, create: { partnerId: '00000000-0000-0000-0000-000000000002', name: 'XYZ College', type: 'college', contactPerson: 'Dr. Meena', mobile: '9876543211', email: 'meena@xyzcollege.edu', commissionRate: 15 } });
  console.log('✅ Partners seeded');

  // Cohorts
  await prisma.cohort.upsert({ where: { cohortId: '00000000-0000-0000-0000-000000000010' }, update: {}, create: { cohortId: '00000000-0000-0000-0000-000000000010', name: 'BFSI Batch June 2025', startDate: new Date('2025-06-15'), endDate: new Date('2025-09-15'), capacity: 30 } });
  await prisma.cohort.upsert({ where: { cohortId: '00000000-0000-0000-0000-000000000011' }, update: {}, create: { cohortId: '00000000-0000-0000-0000-000000000011', name: 'BFSI Batch August 2025', startDate: new Date('2025-08-01'), endDate: new Date('2025-11-01'), capacity: 25 } });
  await prisma.cohort.upsert({ where: { cohortId: '00000000-0000-0000-0000-000000000012' }, update: {}, create: { cohortId: '00000000-0000-0000-0000-000000000012', name: 'Operations Batch July 2025', startDate: new Date('2025-07-01'), endDate: new Date('2025-10-01'), capacity: 20 } });
  console.log('✅ Cohorts seeded');

  console.log('🎉 Seeding complete!');
  console.log('Login: admin@nunukkam.com / admin123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
