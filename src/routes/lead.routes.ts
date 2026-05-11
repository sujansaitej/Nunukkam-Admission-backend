import { Router, Response } from 'express';
import prisma from '../utils/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { generateApplicationForm } from '../services/pdf.service.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// POST /api/leads — Create new lead
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const b = req.body;

    // Validation
    if (!b.name || b.name.length < 3) {
      res.status(400).json({ error: 'Name must be at least 3 characters' });
      return;
    }
    if (!b.mobile || !/^\d{10}$/.test(b.mobile)) {
      res.status(400).json({ error: 'Mobile must be exactly 10 digits' });
      return;
    }

    // Check duplicate mobile
    const existing = await prisma.lead.findUnique({ where: { mobile: b.mobile } });
    if (existing) {
      res.status(409).json({ error: 'A lead with this mobile number already exists', lead_id: existing.leadId });
      return;
    }

    // Respect explicitly selected counselor, or auto-assign (least loaded)
    let counselorId: string | null = b.counselor_id || null;
    try {
      if (!counselorId) {
        const counselors = await prisma.user.findMany({
          where: { role: 'counselor', isActive: true },
          include: { assignedLeads: { where: { status: { notIn: ['enrolled', 'dropped'] } } } },
        });
        if (counselors.length > 0) {
          const sorted = counselors.sort((a, b) => a.assignedLeads.length - b.assignedLeads.length);
          counselorId = sorted[0].userId;
        }
      }
    } catch (err) {
      console.warn('Auto-counselor assignment failed:', err);
      // Continue without counselor - don't fail the lead creation
    }

    const lead = await prisma.lead.create({
      data: {
        // Course Info
        enrolmentFormNo: b.enrolment_form_no || null,
        courseName: b.course_name || null,
        branch: b.branch || null,
        timing: b.timing || null,
        // Personal Details
        name: b.name,
        fatherName: b.father_name || null,
        fatherOccupation: b.father_occupation || null,
        address: b.address || null,
        state: b.state || null,
        pinCode: b.pin_code || null,
        city: b.city || null,
        dateOfBirth: b.date_of_birth ? new Date(b.date_of_birth) : null,
        age: b.age ? parseInt(b.age) : null,
        gender: b.gender || null,
        category: b.category || null,
        // Contact
        mobile: b.mobile,
        alternateMobile: b.alternate_mobile || null,
        email: b.email || null,
        // Structured Data (JSON)
        educationDetails: b.education_details || null,
        workExperience: b.work_experience || null,
        languagesKnown: b.languages_known || null,
        referenceFriends: b.reference_friends || null,
        // Message & Declaration
        messageConsent: b.message_consent ?? null,
        declarationPlace: b.declaration_place || null,
        declarationDate: b.declaration_date ? new Date(b.declaration_date) : null,
        // Legacy
        education: b.education || null,
        currentStatus: b.current_status || null,
        preferredRole: b.preferred_role || null,
        salaryExpectation: b.salary_expectation || null,
        source: b.source || null,
        partnerId: b.partner_id || null,
        counselorId,
        cohortId: b.cohort_id || null, // Save batch assignment from registration
        status: 'assessment_sent', // Auto-advance to screening step
      },
      include: { counselor: { select: { name: true, email: true } }, partner: { select: { name: true } } },
    });

    // TODO: Send WhatsApp/SMS with assessment link
    // const assessmentLink = `${process.env.FRONTEND_URL}/assess/${lead.leadId}`;

    const assessmentLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/assess/${lead.leadId}`;

    res.status(201).json({
      lead_id: lead.leadId,
      message: 'Lead created successfully. Assessment link ready.',
      assessment_link: assessmentLink,
      lead,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads — List leads (paginated)
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const search = req.query.search as string;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status && status !== 'all') where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { mobile: { contains: search } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          counselor: { select: { name: true } },
          partner: { select: { name: true } },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({
      leads,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/leads/wipe-all-students-danger — Wipes all student records (Admin only)
router.delete('/wipe-all-students-danger', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Only admins can wipe student data' });
      return;
    }
    
    // Delete in order to satisfy foreign key constraints
    await prisma.payment.deleteMany();
    await prisma.partnerPayout.deleteMany();
    await prisma.enrollment.deleteMany();
    await prisma.assessmentScore.deleteMany();
    const result = await prisma.lead.deleteMany();
    
    res.json({ message: `Successfully removed ${result.count} student records and all related data from the new DB.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/:id — Lead detail
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const leadId = req.params.id as string;

    // First get the lead to check if it exists
    const leadExists = await prisma.lead.findUnique({
      where: { leadId },
      select: { leadId: true, cohortId: true }
    });

    if (!leadExists) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    // Build include conditionally - only include cohort if lead has valid cohortId
    const include: any = {
      counselor: { select: { userId: true, name: true, email: true } },
      partner: { select: { partnerId: true, name: true, commissionRate: true } },
      assessment: true,
      enrollment: {
        include: {
          cohort: true,
          payments: { orderBy: { createdAt: 'desc' } },
          payouts: true,
        },
      },
    };

    // Only include cohort relation if cohortId exists
    if (leadExists.cohortId) {
      include.cohort = { select: { cohortId: true, name: true, courseName: true, branch: true, timing: true, startDate: true } };
    }

    const lead = await prisma.lead.findUnique({
      where: { leadId },
      include,
    });

    res.json(lead);
  } catch (err: any) {
    console.error('Error fetching lead:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/leads/:id — Update lead
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { status, counselor_id, partner_id, notes } = req.body;
    const data: any = {};
    if (status) data.status = status;
    if (counselor_id) data.counselorId = counselor_id;
    if (partner_id !== undefined) data.partnerId = partner_id;

    const lead = await prisma.lead.update({
      where: { leadId: req.params.id as string },
      data,
    });

    res.json(lead);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads/:id/send-assessment — Resend assessment link
router.post('/:id/send-assessment', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const lead = await prisma.lead.update({
      where: { leadId: req.params.id as string },
      data: { status: 'assessment_sent' },
    });

    // TODO: Actually send WhatsApp/SMS
    res.json({ message: 'Assessment link sent', lead_id: lead.leadId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/:id/pdf — Generate application PDF
router.get('/:id/pdf', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { leadId: req.params.id as string },
      include: { partner: true },
    });

    if (!lead) { res.status(404).json({ error: 'Lead not found' }); return; }

    const pdfPath = await generateApplicationForm({
      name: lead.name,
      mobile: lead.mobile,
      email: lead.email || undefined,
      gender: lead.gender || undefined,
      dateOfBirth: lead.dateOfBirth ? lead.dateOfBirth.toLocaleDateString() : undefined,
      fatherName: lead.fatherName || undefined,
      address: lead.address || undefined,
      courseName: lead.courseName || undefined,
      educationDetails: (lead.educationDetails as any[]) || [],
      workExperience: (lead.workExperience as any[]) || [],
      languagesKnown: (lead.languagesKnown as any[]) || [],
      referenceFriends: (lead.referenceFriends as any[]) || [],
    });

    const absolutePath = path.join(__dirname, '..', '..', pdfPath);
    res.download(absolutePath);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
