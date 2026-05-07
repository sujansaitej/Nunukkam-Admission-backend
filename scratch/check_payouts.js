import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const leads = await prisma.lead.findMany({
    where: { status: 'enrolled' },
    include: { partner: true, enrollment: { include: { payouts: true, payments: true } } }
  });

  console.log(`Found ${leads.length} enrolled leads.`);
  leads.forEach(l => {
    console.log(`Student: ${l.name} | Partner: ${l.partner?.name || 'NONE'}`);
    console.log(`- Enrollment: ${l.enrollment ? 'YES' : 'NO'}`);
    console.log(`- Payments: ${l.enrollment?.payments.length || 0}`);
    console.log(`- Payouts: ${l.enrollment?.payouts.length || 0}`);
    if (l.partner && (!l.enrollment || l.enrollment.payouts.length === 0)) {
      console.log(`  !! MISSING PAYOUT for ${l.name}`);
    }
  });
  await prisma.$disconnect();
}
check();
