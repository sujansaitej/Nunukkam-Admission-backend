import { Router, Response, Request } from 'express';
import prisma from '../utils/prisma.js';

const router = Router();

// GET /api/public/cohorts — Public list of available courses/branches/timings
router.get('/cohorts', async (_req: Request, res: Response) => {
  try {
    const cohorts = await prisma.cohort.findMany({
      orderBy: { startDate: 'desc' },
      select: {
        cohortId: true,
        name: true,
        courseName: true,
        branch: true,
        timing: true,
        startDate: true,
        capacity: true,
        _count: { select: { enrollments: true } },
      },
    });
    res.json(cohorts);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/public/partners — Public list of active partners (for source=Partner)
router.get('/partners', async (_req: Request, res: Response) => {
  try {
    const partners = await prisma.partner.findMany({
      where: { isActive: true },
      select: { partnerId: true, name: true },
      orderBy: { name: 'asc' },
    });
    res.json(partners);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/public/register — Public student self-registration
router.post('/register', async (req: Request, res: Response) => {
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
      res.status(409).json({ error: 'A registration with this mobile number already exists' });
      return;
    }

    // Auto-assign counselor (least loaded)
    const counselors = await prisma.user.findMany({
      where: { role: 'counselor', isActive: true },
      include: { assignedLeads: { where: { status: { notIn: ['enrolled', 'dropped'] } } } },
    });
    let counselorId: string | null = null;
    if (counselors.length > 0) {
      const sorted = counselors.sort((a, b) => a.assignedLeads.length - b.assignedLeads.length);
      counselorId = sorted[0].userId;
    }

    const lead = await prisma.lead.create({
      data: {
        enrolmentFormNo: b.enrolment_form_no || null,
        courseName: b.course_name || null,
        branch: b.branch || null,
        timing: b.timing || null,
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
        mobile: b.mobile,
        alternateMobile: b.alternate_mobile || null,
        email: b.email || null,
        educationDetails: b.education_details || null,
        workExperience: b.work_experience || null,
        languagesKnown: b.languages_known || null,
        referenceFriends: b.reference_friends || null,
        messageConsent: b.message_consent ?? null,
        declarationPlace: b.declaration_place || null,
        declarationDate: b.declaration_date ? new Date(b.declaration_date) : null,
        education: b.education || null,
        currentStatus: b.current_status || null,
        preferredRole: b.preferred_role || null,
        salaryExpectation: b.salary_expectation || null,
        source: b.source || 'Registration Link',
        partnerId: b.partner_id || null,
        counselorId,
        status: 'new',
      },
    });

    res.status(201).json({
      lead_id: lead.leadId,
      message: 'Registration submitted successfully! Our team will contact you shortly.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
