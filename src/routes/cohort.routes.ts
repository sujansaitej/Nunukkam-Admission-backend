import { Router, Response } from 'express';
import prisma from '../utils/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/cohorts
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const active = req.query.active;
    const where: any = {};
    if (active === 'true') {
      // In a real app, maybe check if endDate > now, but for now just list all
    }
    const cohorts = await prisma.cohort.findMany({ 
      where, 
      orderBy: { startDate: 'desc' },
      include: { _count: { select: { enrollments: true } } }
    });
    res.json(cohorts);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/cohorts — Create a new batch
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, course_name, branch, timing, start_date, end_date, capacity, counselor_id } = req.body;
    if (!name || !start_date) {
      res.status(400).json({ error: 'Name and Start Date are required' });
      return;
    }
    const cohort = await prisma.cohort.create({
      data: {
        name,
        courseName: course_name || 'General',
        branch: branch || null,
        timing: timing || null,
        startDate: new Date(start_date),
        endDate: end_date ? new Date(end_date) : null,
        capacity: capacity ? parseInt(capacity) : 50,
        counselorId: counselor_id || null,
      }
    });
    res.status(201).json(cohort);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/cohorts/:id — Batch Detail
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const cohort = await prisma.cohort.findUnique({
      where: { cohortId: req.params.id as string },
      include: {
        counselor: { select: { userId: true, name: true, email: true } },
        enrollments: {
          include: {
            lead: {
              select: { leadId: true, name: true, mobile: true, status: true }
            }
          }
        },
        _count: { select: { enrollments: true } }
      }
    });
    if (!cohort) { res.status(404).json({ error: 'Batch not found' }); return; }
    res.json(cohort);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
