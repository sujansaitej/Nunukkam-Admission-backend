import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:fmtglvzothwnqx0g@178.16.137.247:5432/postgres'
    }
  }
});

async function main() {
  console.log('Connecting to new DB to clear students...');
  try {
    // Delete all records in dependent tables first to avoid foreign key constraints
    await prisma.payment.deleteMany();
    await prisma.partnerPayout.deleteMany();
    await prisma.enrollment.deleteMany();
    await prisma.assessmentScore.deleteMany();
    
    // Now delete all leads
    const deletedLeads = await prisma.lead.deleteMany();
    console.log(`Deleted ${deletedLeads.count} leads.`);
    
    console.log('Successfully cleared all student data from the new DB.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
