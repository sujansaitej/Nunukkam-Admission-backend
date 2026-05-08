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

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174,http://localhost:5175').split(',');

app.use(cors({ 
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
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

async function autoSeed() {
  try {
    const pw = await bcrypt.hash('admin123', 10);
    await prisma.user.upsert({ where: { email: 'admin@nunukkam.com' }, update: {}, create: { name: 'Admin', email: 'admin@nunukkam.com', password: pw, role: 'admin' } });
    
    const pw2 = await bcrypt.hash('admin12345', 10);
    await prisma.user.upsert({ where: { email: 'admin@nunukkam1.com' }, update: { password: pw2 }, create: { name: 'Admin 2', email: 'admin@nunukkam1.com', password: pw2, role: 'admin' } });
    
    await prisma.partner.upsert({ where: { partnerId: '00000000-0000-0000-0000-000000000001' }, update: {}, create: { partnerId: '00000000-0000-0000-0000-000000000001', name: 'ABC Coaching Centre', type: 'coaching_center', contactPerson: 'Ramesh Kumar', mobile: '9876543210', email: 'ramesh@abccoaching.com', commissionRate: 12 } });
    
    await prisma.cohort.upsert({ where: { cohortId: '00000000-0000-0000-0000-000000000010' }, update: {}, create: { cohortId: '00000000-0000-0000-0000-000000000010', name: 'BFSI Batch June 2025', startDate: new Date('2025-06-15'), endDate: new Date('2025-09-15'), capacity: 30 } });
    
    console.log('✅ Base seed data (Admin, Default Partner, Cohort) verified on startup.');
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
