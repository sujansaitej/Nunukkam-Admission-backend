import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- RESETTING DATABASE ---');
  
  await prisma.partnerPayout.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.enrollment.deleteMany({});
  await prisma.assessmentScore.deleteMany({});
  await prisma.lead.deleteMany({});
  await prisma.cohort.deleteMany({});
  await prisma.partner.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('--- SEEDING ENHANCED DATA ---');

  const hashedDefault = await bcrypt.hash('password123', 10);

  // 1. Staff
  const c1 = await prisma.user.create({ data: { name: 'Anitha', email: 'anitha@weshine.com', password: hashedDefault, role: 'counselor' } });
  const c2 = await prisma.user.create({ data: { name: 'Babu', email: 'babu@weshine.com', password: hashedDefault, role: 'counselor' } });
  await prisma.user.create({ data: { name: 'Admin', email: 'admin@weshine.com', password: hashedDefault, role: 'admin' } });

  // 2. Partners
  const p1 = await prisma.partner.create({ data: { name: 'Sarathy Referrals', type: 'individual', contactPerson: 'Sarathy', mobile: '9988776655', commissionRate: 10 } });
  const p2 = await prisma.partner.create({ data: { name: 'Logic Academy', type: 'educational_institution', contactPerson: 'Mr. Rajesh', mobile: '8877665544', commissionRate: 15 } });

  // 3. Batches
  const b1 = await prisma.cohort.create({ data: { name: 'Banking Prime - June', courseName: 'BFSI Excellence', startDate: new Date('2025-06-01'), capacity: 30 } });

  // 4. Detailed Leads
  
  // Lead 1: Fresh Registration
  await prisma.lead.create({
    data: {
      name: 'Karthik Raja', mobile: '9001100110', courseName: 'Banking', counselorId: c1.userId, source: 'Partner', partnerId: p1.partnerId, status: 'new',
      educationDetails: [{ exam: 'SSLC', degree: 'State Board', dateOfPassing: '2018', percentage: '85%' }, { exam: 'HSC', degree: 'Computer Science', dateOfPassing: '2020', percentage: '82%' }],
      languagesKnown: [{ language: 'Tamil', read: true, write: true, speak: true }, { language: 'English', read: true, write: true, speak: false }],
      referenceFriends: [{ name: 'Suresh', mobile: '9111222333', location: 'Chennai' }]
    }
  });

  // Lead 2: Assessment Sent
  await prisma.lead.create({
    data: {
      name: 'Priya Dharshini', mobile: '9002200220', courseName: 'Finance', counselorId: c2.userId, status: 'assessment_sent',
      workExperience: [{ designation: 'Junior Accountant', employer: 'V-Tech Solutions', period: '1 Year', duties: 'Ledger Maintenance', reasonLeaving: 'Higher Studies' }]
    }
  });

  // Lead 3: Assessed (CRI Ready)
  const l3 = await prisma.lead.create({
    data: {
      name: 'Mohamed Asif', mobile: '9003300330', courseName: 'Banking', counselorId: c1.userId, status: 'assessed',
      educationDetails: [{ exam: 'B.Com', degree: 'Madras University', dateOfPassing: '2023', percentage: '78%' }]
    }
  });
  await prisma.assessmentScore.create({
    data: {
      leadId: l3.leadId, commScore: 75, bfsiScore: 80, disciplineScore: 90, agilityScore: 70, professionalismScore: 85, confidenceScore: 80,
      overallCri: 80.5, band: 'Trainable', answers: { section1_answers: [3,4,3,4], section2_answers: [4,3,4,4] }
    }
  });

  // Lead 4: Counseled & Parent Aligned
  await prisma.lead.create({
    data: { name: 'Janani S', mobile: '9004400440', courseName: 'Banking', counselorId: c2.userId, status: 'parent_aligned', fatherName: 'Sivakumar', fatherOccupation: 'Business' }
  });

  // Lead 5: FULLY ENROLLED (The Complete Flow)
  const l5 = await prisma.lead.create({
    data: {
      name: 'Vikram Singh', mobile: '9005500550', courseName: 'Banking', counselorId: c1.userId, status: 'enrolled', partnerId: p2.partnerId,
      educationDetails: [{ exam: 'MBA', degree: 'Finance', dateOfPassing: '2024', percentage: '88%' }]
    }
  });
  
  const enrollment = await prisma.enrollment.create({
    data: { 
      leadId: l5.leadId, 
      cohortId: b1.cohortId, 
      commitmentAccepted: true, 
      commitmentAcceptedAt: new Date()
    }
  });

  await prisma.payment.create({
    data: { 
      enrollmentId: enrollment.enrollmentId, 
      feePlan: 'full',
      totalFee: 40000,
      amountPaid: 40000, 
      paymentMode: 'UPI', 
      receiptNumber: 'REC-1001', 
      payerName: 'Vikram Singh',
      status: 'paid',
      paidAt: new Date()
    }
  });

  // Create Payout for Partner
  await prisma.partnerPayout.create({
    data: { 
      enrollmentId: enrollment.enrollmentId, 
      partnerId: p2.partnerId, 
      feeCollected: 40000, 
      commissionRate: 15,
      commissionAmount: 6000, 
      payoutStatus: 'pending' 
    }
  });

  console.log('--- SEEDING COMPLETE ---');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
