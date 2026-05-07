import { Router, Response } from 'express';
import prisma from '../utils/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// POST /api/partners
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, contact_person, mobile, email, commission_rate, is_active } = req.body;
    if (!name) { res.status(400).json({ error: 'Name is required' }); return; }
    if (commission_rate < 0 || commission_rate > 100) { res.status(400).json({ error: 'Commission rate must be 0-100' }); return; }
    const partner = await prisma.partner.create({ data: { name, type: type || null, contactPerson: contact_person || null, mobile: mobile || null, email: email || null, commissionRate: commission_rate || 0, isActive: is_active !== false } });
    res.status(201).json(partner);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/partners
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const active = req.query.active;
    const where: any = {};
    if (active === 'true') where.isActive = true;
    const partners = await prisma.partner.findMany({ 
      where, 
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { leads: true } } }
    });
    res.json(partners);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/partners/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const partner = await prisma.partner.findUnique({
      where: { partnerId: req.params.id as string },
      include: {
        leads: { include: { enrollment: { include: { payments: true } } } },
        payouts: { orderBy: { createdAt: 'desc' } },
      },
    }) as any);
    if (!partner) { res.status(404).json({ error: 'Partner not found' }); return; }
    const totalCommission = partner.payouts.reduce((s, p) => s + Number(p.commissionAmount), 0);
    const totalPaid = partner.payouts.filter(p => p.payoutStatus === 'paid').reduce((s, p) => s + Number(p.commissionAmount), 0);
    res.json({ ...partner, totalCommission, totalPaid });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PUT /api/partners/:id
const updatePartner = async (req: AuthRequest, res: Response) => {
  try {
    const { name, type, contact_person, mobile, email, commission_rate, is_active } = req.body;
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (type !== undefined) data.type = type;
    if (contact_person !== undefined) data.contactPerson = contact_person;
    if (mobile !== undefined) data.mobile = mobile;
    if (email !== undefined) data.email = email;
    if (commission_rate !== undefined) data.commissionRate = commission_rate;
    if (is_active !== undefined) data.isActive = is_active;
    const partner = await prisma.partner.update({
      where: { partnerId: req.params.id },
      data,
    });
    res.json(partner);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
};

router.put('/:id', authenticate, updatePartner);
router.patch('/:id', authenticate, updatePartner);

export default router;
