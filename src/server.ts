import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.routes.js';
import leadRoutes from './routes/lead.routes.js';
import assessRoutes from './routes/assess.routes.js';
import enrollmentRoutes from './routes/enrollment.routes.js';
import partnerRoutes from './routes/partner.routes.js';
import payoutRoutes from './routes/payout.routes.js';
import cohortRoutes from './routes/cohort.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import publicRoutes from './routes/public.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// ── Middleware ────────────────────────────────────────────────────
app.use(helmet({ 
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' } 
}));

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174,http://localhost:5175')
  .split(',')
  .map((origin) => origin.trim().replace(/^["']|["']$/g, ''))
  .filter(Boolean);

app.use(cors({ 
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true 
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger with status code and timing
app.use((req, res, next) => {
  const start = Date.now();
  const originalSend = res.json.bind(res);
  res.json = (body: any) => {
    const duration = Date.now() - start;
    const statusIcon = res.statusCode >= 400 ? '❌' : '✅';
    console.log(`${statusIcon} [${new Date().toISOString()}] ${req.method} ${req.url} → ${res.statusCode} (${duration}ms)`);
    return originalSend(body);
  };
  next();
});

// Serve uploaded files (scorecards, receipts)
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ── Routes ───────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ message: 'Nunukkam EIS API — Operational', docs: '/api/health' });
});

app.use('/api/auth', authRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/assess', assessRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/payouts', payoutRoutes);
app.use('/api/cohorts', cohortRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/public', publicRoutes);

// ── Health Check ─────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── 404 Handler ──────────────────────────────────────────────────
app.use((req, res) => {
  console.log(`🔍 404 Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ error: `Route ${req.method} ${req.url} not found` });
});

// ── Global Error Handler ─────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ── Auto-Seed Base Data on Startup ─────────────────────────────────
import prisma from './utils/prisma.js';
import bcrypt from 'bcryptjs';
import { execSync } from 'child_process';

async function autoSeed() {
  try {
    console.log('🔄 Running Prisma DB Push to ensure tables exist...');
    execSync('npx --yes prisma db push --accept-data-loss', { stdio: 'inherit' });
    console.log('✅ DB Push complete.');
  } catch (err: any) {
    console.error('⚠️ DB Push failed (might be expected if no internet or CLI issues):', err.message);
  }

  try {
    const pw = await bcrypt.hash('admin123', 10);
    await prisma.user.upsert({ where: { email: 'admin@nunukkam.com' }, update: {}, create: { name: 'Admin', email: 'admin@nunukkam.com', password: pw, role: 'admin' } });
    
    const pw2 = await bcrypt.hash('admin12345', 10);
    await prisma.user.upsert({ where: { email: 'admin@nunukkam1.com' }, update: { password: pw2 }, create: { name: 'Admin 2', email: 'admin@nunukkam1.com', password: pw2, role: 'admin' } });
    
    await prisma.user.upsert({ where: { email: 'admin@nunukam1.com' }, update: { password: pw2 }, create: { name: 'Admin Typo', email: 'admin@nunukam1.com', password: pw2, role: 'admin' } });

    // Seed 3 Partners
    await prisma.partner.upsert({ where: { partnerId: '00000000-0000-0000-0000-000000000001' }, update: {}, create: { partnerId: '00000000-0000-0000-0000-000000000001', name: 'ABC Coaching Centre', type: 'coaching_center', contactPerson: 'Ramesh Kumar', mobile: '9876543210', email: 'ramesh@abccoaching.com', commissionRate: 12 } });
    await prisma.partner.upsert({ where: { partnerId: '00000000-0000-0000-0000-000000000002' }, update: {}, create: { partnerId: '00000000-0000-0000-0000-000000000002', name: 'Bright Future Academy', type: 'college', contactPerson: 'Sarah Johnson', mobile: '9123456789', email: 'sarah@brightfuture.com', commissionRate: 15 } });
    await prisma.partner.upsert({ where: { partnerId: '00000000-0000-0000-0000-000000000003' }, update: {}, create: { partnerId: '00000000-0000-0000-0000-000000000003', name: 'Skill Development Institute', type: 'training_center', contactPerson: 'Anil Gupta', mobile: '9988776655', email: 'anil@sdinst.org', commissionRate: 10 } });

    // Seed 3 Batches/Cohorts with Course, Branch, Timing
    const cohort1 = await prisma.cohort.upsert({ where: { cohortId: '00000000-0000-0000-0000-000000000010' }, update: {}, create: { cohortId: '00000000-0000-0000-0000-000000000010', name: 'BFSI Batch June 2025', courseName: 'BFSI', branch: 'Banking & Finance', timing: 'Morning (9AM - 12PM)', startDate: new Date('2025-06-15'), endDate: new Date('2025-09-15'), capacity: 30 } });
    const cohort2 = await prisma.cohort.upsert({ where: { cohortId: '00000000-0000-0000-0000-000000000011' }, update: {}, create: { cohortId: '00000000-0000-0000-0000-000000000011', name: 'BFSI Batch August 2025', courseName: 'BFSI', branch: 'Insurance & Finance', timing: 'Evening (2PM - 5PM)', startDate: new Date('2025-08-01'), endDate: new Date('2025-11-01'), capacity: 25 } });
    const cohort3 = await prisma.cohort.upsert({ where: { cohortId: '00000000-0000-0000-0000-000000000012' }, update: {}, create: { cohortId: '00000000-0000-0000-0000-000000000012', name: 'BFSI Batch October 2025', courseName: 'BFSI', branch: 'Banking & Finance', timing: 'Weekend (10AM - 2PM)', startDate: new Date('2025-10-15'), endDate: new Date('2026-01-15'), capacity: 30 } });

    // Seed 10 Leads with full details (course, branch, timing, education, work, languages, references)
    const leadsData = [
      {
        name: 'Arun Kumar', email: 'arun.kumar@email.com', mobile: '9876543210', source: 'Website', status: 'new', stage: 'lead',
        courseName: 'BFSI', branch: 'Banking & Finance', timing: 'Morning (9AM - 12PM)',
        fatherName: 'Ramesh Kumar', fatherOccupation: 'Business', address: '12, MG Road, Chennai', city: 'Chennai', state: 'Tamil Nadu', pinCode: '600001',
        dateOfBirth: new Date('2002-05-15'), gender: 'Male', category: 'GEN', education: 'B.Com',
        educationDetails: [{ exam: '10th', degree: 'SSLC', dateOfPassing: '2018', percentage: '85', grade: 'First Class' }, { exam: '12th', degree: 'Commerce', dateOfPassing: '2020', percentage: '78', grade: 'First Class' }, { exam: 'Graduation', degree: 'B.Com', dateOfPassing: '2023', percentage: '72', grade: 'First Class' }],
        workExperience: [],
        languagesKnown: [{ language: 'Tamil', read: true, write: true, speak: true }, { language: 'English', read: true, write: true, speak: true }],
        referenceFriends: [{ name: 'Kavin', mobile: '9876543210', qualification: 'B.Sc', location: 'Chennai' }],
        messageConsent: true, declarationPlace: 'Chennai', declarationDate: new Date(),
      },
      {
        name: 'Priya Sharma', email: 'priya.sharma@email.com', mobile: '9876543211', source: 'Facebook', status: 'new', stage: 'lead',
        courseName: 'BFSI', branch: 'Insurance & Finance', timing: 'Evening (2PM - 5PM)',
        fatherName: 'Suresh Sharma', fatherOccupation: 'Engineer', address: '45, Anna Nagar, Coimbatore', city: 'Coimbatore', state: 'Tamil Nadu', pinCode: '641002',
        dateOfBirth: new Date('2001-08-22'), gender: 'Female', category: 'OBC', education: 'BBA',
        educationDetails: [{ exam: '10th', degree: 'SSLC', dateOfPassing: '2017', percentage: '88', grade: 'Distinction' }, { exam: '12th', degree: 'Commerce', dateOfPassing: '2019', percentage: '82', grade: 'First Class' }, { exam: 'Graduation', degree: 'BBA', dateOfPassing: '2022', percentage: '75', grade: 'First Class' }],
        workExperience: [{ employer: 'TCS', designation: 'Trainee', period: '6 months', duties: 'Data Entry', reasonLeaving: 'Higher Studies', yearOfService: '2022' }],
        languagesKnown: [{ language: 'Tamil', read: true, write: true, speak: true }, { language: 'English', read: true, write: true, speak: true }, { language: 'Hindi', read: true, write: false, speak: false }],
        referenceFriends: [{ name: 'Anu', mobile: '9876543211', qualification: 'BBA', location: 'Coimbatore' }],
        messageConsent: true, declarationPlace: 'Coimbatore', declarationDate: new Date(),
      },
      {
        name: 'Rahul Verma', email: 'rahul.verma@email.com', mobile: '9876543212', source: 'Referral', status: 'assessment_sent', stage: 'lead',
        courseName: 'BFSI', branch: 'Banking & Finance', timing: 'Weekend (10AM - 2PM)',
        fatherName: 'Raj Kumar Verma', fatherOccupation: 'Government Employee', address: '78, West Street, Madurai', city: 'Madurai', state: 'Tamil Nadu', pinCode: '625001',
        dateOfBirth: new Date('2000-03-10'), gender: 'Male', category: 'OBC', education: 'B.Sc',
        educationDetails: [{ exam: '10th', degree: 'SSLC', dateOfPassing: '2016', percentage: '72', grade: 'Second Class' }, { exam: '12th', degree: 'Science', dateOfPassing: '2018', percentage: '68', grade: 'Second Class' }, { exam: 'Graduation', degree: 'B.Sc Physics', dateOfPassing: '2021', percentage: '65', grade: 'Second Class' }],
        workExperience: [],
        languagesKnown: [{ language: 'Tamil', read: true, write: true, speak: true }, { language: 'English', read: true, write: true, speak: false }],
        referenceFriends: [{ name: 'Mohan', mobile: '9876543212', qualification: 'B.Sc', location: 'Madurai' }],
        messageConsent: false, declarationPlace: 'Madurai', declarationDate: new Date(),
      },
      {
        name: 'Sneha Iyer', email: 'sneha.iyer@email.com', mobile: '9876543213', source: 'Google', status: 'assessment_sent', stage: 'assessment',
        courseName: 'BFSI', branch: 'Banking & Finance', timing: 'Morning (9AM - 12PM)',
        fatherName: 'Krishnan Iyer', fatherOccupation: 'Teacher', address: '23, Mylapore, Chennai', city: 'Chennai', state: 'Tamil Nadu', pinCode: '600004',
        dateOfBirth: new Date('2002-11-08'), gender: 'Female', category: 'GEN', education: 'B.A',
        educationDetails: [{ exam: '10th', degree: 'SSLC', dateOfPassing: '2018', percentage: '92', grade: 'Distinction' }, { exam: '12th', degree: 'Arts', dateOfPassing: '2020', percentage: '88', grade: 'First Class' }, { exam: 'Graduation', degree: 'B.A English', dateOfPassing: '2023', percentage: '80', grade: 'First Class' }],
        workExperience: [],
        languagesKnown: [{ language: 'Tamil', read: true, write: true, speak: true }, { language: 'English', read: true, write: true, speak: true }],
        referenceFriends: [{ name: 'Lakshmi', mobile: '9876543213', qualification: 'B.A', location: 'Chennai' }],
        messageConsent: true, declarationPlace: 'Chennai', declarationDate: new Date(),
      },
      {
        name: 'Karthik Raj', email: 'karthik.raj@email.com', mobile: '9876543214', source: 'Website', status: 'assessed', stage: 'assessment',
        courseName: 'BFSI', branch: 'Insurance & Finance', timing: 'Evening (2PM - 5PM)',
        fatherName: 'Rajendran', fatherOccupation: 'Business', address: '56, TP Chatiram, Salem', city: 'Salem', state: 'Tamil Nadu', pinCode: '636001',
        dateOfBirth: new Date('2001-07-25'), gender: 'Male', category: 'MBC', education: 'B.E',
        educationDetails: [{ exam: '10th', degree: 'SSLC', dateOfPassing: '2017', percentage: '80', grade: 'First Class' }, { exam: '12th', degree: 'Computer Science', dateOfPassing: '2019', percentage: '75', grade: 'First Class' }, { exam: 'Graduation', degree: 'B.E Computer Science', dateOfPassing: '2023', percentage: '70', grade: 'First Class' }],
        workExperience: [{ employer: 'Tech Solutions', designation: 'Trainee', period: '6 months', duties: 'Coding', reasonLeaving: 'Higher Studies', yearOfService: '2023' }],
        languagesKnown: [{ language: 'Tamil', read: true, write: true, speak: true }, { language: 'English', read: true, write: true, speak: true }],
        referenceFriends: [{ name: 'Prakash', mobile: '9876543214', qualification: 'B.E', location: 'Salem' }],
        messageConsent: true, declarationPlace: 'Salem', declarationDate: new Date(),
        assessment: { commScore: 78, bfsiScore: 72, disciplineScore: 80, agilityScore: 75, professionalismScore: 82, confidenceScore: 70, overallCri: 76, band: 'Trainable' },
      },
      {
        name: 'Lakshmi Devi', email: 'lakshmi.devi@email.com', mobile: '9876543215', source: 'College', status: 'counseled', stage: 'enrollment',
        courseName: 'BFSI', branch: 'Banking & Finance', timing: 'Weekend (10AM - 2PM)',
        fatherName: 'Muthusamy', fatherOccupation: 'Farmer', address: '89, Koundampalayam, Coimbatore', city: 'Coimbatore', state: 'Tamil Nadu', pinCode: '641042',
        dateOfBirth: new Date('2002-02-14'), gender: 'Female', category: 'SC', education: 'B.Sc',
        educationDetails: [{ exam: '10th', degree: 'SSLC', dateOfPassing: '2018', percentage: '85', grade: 'First Class' }, { exam: '12th', degree: 'Science', dateOfPassing: '2020', percentage: '78', grade: 'First Class' }, { exam: 'Graduation', degree: 'B.Sc Chemistry', dateOfPassing: '2023', percentage: '72', grade: 'First Class' }],
        workExperience: [],
        languagesKnown: [{ language: 'Tamil', read: true, write: true, speak: true }, { language: 'English', read: true, write: false, speak: false }],
        referenceFriends: [{ name: 'Divya', mobile: '9876543215', qualification: 'B.Sc', location: 'Coimbatore' }],
        messageConsent: true, declarationPlace: 'Coimbatore', declarationDate: new Date(),
        assessment: { commScore: 65, bfsiScore: 58, disciplineScore: 70, agilityScore: 62, professionalismScore: 68, confidenceScore: 55, overallCri: 63, band: 'Needs Intervention' },
      },
      {
        name: 'Manoj Patel', email: 'manoj.patel@email.com', mobile: '9876543216', source: 'Coaching Center', status: 'enrolled', stage: 'enrollment', cohortId: cohort1.cohortId,
        courseName: 'BFSI', branch: 'Banking & Finance', timing: 'Morning (9AM - 12PM)',
        fatherName: 'Rajesh Patel', fatherOccupation: 'Business', address: '34, Race Course, Trichy', city: 'Tiruchirappalli', state: 'Tamil Nadu', pinCode: '620001',
        dateOfBirth: new Date('2001-09-30'), gender: 'Male', category: 'GEN', education: 'B.Com',
        educationDetails: [{ exam: '10th', degree: 'SSLC', dateOfPassing: '2017', percentage: '88', grade: 'First Class' }, { exam: '12th', degree: 'Commerce', dateOfPassing: '2019', percentage: '82', grade: 'First Class' }, { exam: 'Graduation', degree: 'B.Com', dateOfPassing: '2022', percentage: '76', grade: 'First Class' }],
        workExperience: [],
        languagesKnown: [{ language: 'Tamil', read: true, write: true, speak: true }, { language: 'English', read: true, write: true, speak: true }],
        referenceFriends: [{ name: 'Ravi', mobile: '9876543216', qualification: 'B.Com', location: 'Trichy' }],
        messageConsent: true, declarationPlace: 'Trichy', declarationDate: new Date(),
        assessment: { commScore: 82, bfsiScore: 78, disciplineScore: 85, agilityScore: 80, professionalismScore: 84, confidenceScore: 76, overallCri: 81, band: 'High' },
        paymentStatus: 'partial',
      },
      {
        name: 'Divya Nair', email: 'divya.nair@email.com', mobile: '9876543217', source: 'Website', status: 'enrolled', stage: 'enrollment', cohortId: cohort1.cohortId,
        courseName: 'BFSI', branch: 'Banking & Finance', timing: 'Morning (9AM - 12PM)',
        fatherName: 'Gopalakrishnan Nair', fatherOccupation: 'Retired Banker', address: '67, Kalavasal, Madurai', city: 'Madurai', state: 'Tamil Nadu', pinCode: '625016',
        dateOfBirth: new Date('2002-04-18'), gender: 'Female', category: 'GEN', education: 'BBA',
        educationDetails: [{ exam: '10th', degree: 'SSLC', dateOfPassing: '2018', percentage: '90', grade: 'Distinction' }, { exam: '12th', degree: 'Commerce', dateOfPassing: '2020', percentage: '86', grade: 'First Class' }, { exam: 'Graduation', degree: 'BBA', dateOfPassing: '2023', percentage: '82', grade: 'First Class' }],
        workExperience: [],
        languagesKnown: [{ language: 'Tamil', read: true, write: true, speak: false }, { language: 'English', read: true, write: true, speak: true }, { language: 'Malayalam', read: true, write: true, speak: true }],
        referenceFriends: [{ name: 'Sree', mobile: '9876543217', qualification: 'BBA', location: 'Madurai' }],
        messageConsent: true, declarationPlace: 'Madurai', declarationDate: new Date(),
        assessment: { commScore: 88, bfsiScore: 82, disciplineScore: 90, agilityScore: 85, professionalismScore: 88, confidenceScore: 80, overallCri: 86, band: 'High' },
        paymentStatus: 'paid',
      },
      {
        name: 'Vijay Singh', email: 'vijay.singh@email.com', mobile: '9876543218', source: 'Referral', status: 'enrolled', stage: 'enrollment', cohortId: cohort2.cohortId,
        courseName: 'BFSI', branch: 'Insurance & Finance', timing: 'Evening (2PM - 5PM)',
        fatherName: 'Surendra Singh', fatherOccupation: 'Farmer', address: '12, Thennur, Trichy', city: 'Tiruchirappalli', state: 'Tamil Nadu', pinCode: '620017',
        dateOfBirth: new Date('2000-12-05'), gender: 'Male', category: 'OBC', education: 'B.Sc',
        educationDetails: [{ exam: '10th', degree: 'SSLC', dateOfPassing: '2016', percentage: '75', grade: 'Second Class' }, { exam: '12th', degree: 'Science', dateOfPassing: '2018', percentage: '68', grade: 'Second Class' }, { exam: 'Graduation', degree: 'B.Sc Math', dateOfPassing: '2021', percentage: '62', grade: 'Second Class' }],
        workExperience: [{ employer: 'Local Tuition', designation: 'Tutor', period: '1 year', duties: 'Teaching', reasonLeaving: 'Full Time Course', yearOfService: '2022' }],
        languagesKnown: [{ language: 'Tamil', read: true, write: true, speak: true }, { language: 'English', read: true, write: true, speak: false }],
        referenceFriends: [{ name: 'Arun', mobile: '9876543218', qualification: 'B.Sc', location: 'Trichy' }],
        messageConsent: true, declarationPlace: 'Trichy', declarationDate: new Date(),
        assessment: { commScore: 60, bfsiScore: 55, disciplineScore: 65, agilityScore: 58, professionalismScore: 62, confidenceScore: 50, overallCri: 58, band: 'Needs Intervention' },
        paymentStatus: 'pending',
      },
      {
        name: 'Meena Kumari', email: 'meena.kumari@email.com', mobile: '9876543219', source: 'Facebook', status: 'enrolled', stage: 'enrollment', cohortId: cohort3.cohortId,
        courseName: 'BFSI', branch: 'Banking & Finance', timing: 'Weekend (10AM - 2PM)',
        fatherName: 'Kumarasamy', fatherOccupation: 'Auto Driver', address: '45, Ellis Nagar, Salem', city: 'Salem', state: 'Tamil Nadu', pinCode: '636005',
        dateOfBirth: new Date('2001-06-20'), gender: 'Female', category: 'SC', education: 'B.Com',
        educationDetails: [{ exam: '10th', degree: 'SSLC', dateOfPassing: '2017', percentage: '82', grade: 'First Class' }, { exam: '12th', degree: 'Commerce', dateOfPassing: '2019', percentage: '75', grade: 'First Class' }, { exam: 'Graduation', degree: 'B.Com', dateOfPassing: '2022', percentage: '70', grade: 'First Class' }],
        workExperience: [],
        languagesKnown: [{ language: 'Tamil', read: true, write: true, speak: true }, { language: 'English', read: true, write: false, speak: false }],
        referenceFriends: [{ name: 'Karthi', mobile: '9876543219', qualification: 'B.Com', location: 'Salem' }],
        messageConsent: true, declarationPlace: 'Salem', declarationDate: new Date(),
        assessment: { commScore: 72, bfsiScore: 68, disciplineScore: 78, agilityScore: 70, professionalismScore: 74, confidenceScore: 65, overallCri: 71, band: 'Trainable' },
        paymentStatus: 'failed',
      },
    ];

    for (let i = 0; i < leadsData.length; i++) {
      const l = leadsData[i];
      const leadId = `00000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`;
      const createdDate = new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000);

      // Create/Update Lead with full details
      await prisma.lead.upsert({
        where: { leadId },
        update: {},
        create: {
          leadId,
          name: l.name,
          email: l.email,
          mobile: l.mobile,
          source: l.source,
          status: l.status,
          fatherName: l.fatherName,
          fatherOccupation: l.fatherOccupation,
          address: l.address,
          city: l.city,
          state: l.state,
          pinCode: l.pinCode,
          dateOfBirth: l.dateOfBirth,
          gender: l.gender,
          category: l.category,
          education: l.education,
          courseName: l.courseName,
          branch: l.branch,
          timing: l.timing,
          educationDetails: l.educationDetails,
          workExperience: l.workExperience,
          languagesKnown: l.languagesKnown,
          referenceFriends: l.referenceFriends || [],
          messageConsent: l.messageConsent ?? true,
          declarationPlace: l.declarationPlace,
          declarationDate: l.declarationDate,
          createdAt: createdDate,
          updatedAt: createdDate,
        }
      });

      // Add Assessment if exists
      if (l.assessment) {
        await prisma.assessmentScore.upsert({
          where: { leadId },
          update: {},
          create: {
            leadId,
            commScore: l.assessment.commScore,
            bfsiScore: l.assessment.bfsiScore,
            disciplineScore: l.assessment.disciplineScore,
            agilityScore: l.assessment.agilityScore,
            professionalismScore: l.assessment.professionalismScore,
            confidenceScore: l.assessment.confidenceScore,
            overallCri: l.assessment.overallCri,
            band: l.assessment.band,
            completedAt: new Date(createdDate.getTime() + 2 * 24 * 60 * 60 * 1000),
          }
        });
      }

      // Add Enrollment and Payment for enrolled students
      if (l.status === 'ENROLLED' && l.cohortId) {
        const enrollmentId = `00000000-0000-0000-0000-${String(i + 100).padStart(12, '0')}`;
        await prisma.enrollment.upsert({
          where: { enrollmentId },
          update: {},
          create: {
            enrollmentId,
            leadId,
            cohortId: l.cohortId,
            commitmentAccepted: true,
            enrolledAt: new Date(createdDate.getTime() + 5 * 24 * 60 * 60 * 1000),
          }
        });

        // Add Payment based on payment status
        const totalFee = 45000;
        const amounts: Record<string, number> = { paid: 22500, partial: 10000, pending: 0, failed: 0 };
        const paymentStatuses: Record<string, string> = { paid: 'paid', partial: 'partial', pending: 'pending', failed: 'failed' };
        const paymentStatus = (l.paymentStatus || 'pending') as string;
        const amountPaid = amounts[paymentStatus] || 0;

        const paymentId = `00000000-0000-0000-0000-${String(i + 200).padStart(12, '0')}`;
        await prisma.payment.upsert({
          where: { paymentId },
          update: {},
          create: {
            paymentId,
            enrollmentId,
            feePlan: 'installment',
            totalFee,
            amountPaid,
            dueDate: new Date(createdDate.getTime() + 7 * 24 * 60 * 60 * 1000),
            paymentMode: (paymentStatus === 'paid' || paymentStatus === 'partial') ? 'UPI' : 'pending',
            receiptNumber: `RCP-${Date.now()}-${i}`,
            payerName: l.name,
            status: paymentStatuses[paymentStatus] || 'pending',
            paidAt: amountPaid > 0 ? new Date(createdDate.getTime() + 6 * 24 * 60 * 60 * 1000) : null,
            createdAt: createdDate,
          }
        });
      }
    }

    console.log('✅ Base seed data (Admin, Partners, Cohorts, Leads, Assessments, Payments) verified on startup.');
  } catch (err: any) {
    console.error('⚠️ Could not auto-seed data (Database tables might not exist yet):', err.message);
  }
}

// ── Start ────────────────────────────────────────────────────────
const HOST = '0.0.0.0';
app.listen(PORT, HOST, async () => {
  await autoSeed();
  console.log(`🚀 Nunukkam EIS Backend running on http://${HOST}:${PORT}`);
});

export default app;
