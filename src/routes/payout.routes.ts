import { Router, Response } from 'express';
import prisma from '../utils/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/payouts
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { partner_id, status, from_date, to_date, page: p, limit: l } = req.query;
    const page = parseInt(p as string) || 1;
    const limit = parseInt(l as string) || 20;
    const where: any = {};
    if (partner_id) where.partnerId = partner_id;
    if (status && status !== 'all') where.payoutStatus = status;
    if (from_date || to_date) { where.createdAt = {}; if (from_date) where.createdAt.gte = new Date(from_date as string); if (to_date) where.createdAt.lte = new Date(to_date as string); }

    const [payouts, total] = await Promise.all([
      prisma.partnerPayout.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' }, include: { partner: { select: { name: true } }, enrollment: { include: { lead: { select: { name: true } } } } } }),
      prisma.partnerPayout.count({ where }),
    ]);

    // Summary counts
    const allPayouts = await prisma.partnerPayout.findMany({ where: {}, select: { payoutStatus: true, commissionAmount: true } });
    const summary = {
      pendingCount: allPayouts.filter(p => p.payoutStatus === 'pending').length,
      pendingAmount: allPayouts.filter(p => p.payoutStatus === 'pending').reduce((s, p) => s + Number(p.commissionAmount), 0),
      processedCount: allPayouts.filter(p => p.payoutStatus === 'processed').length,
      processedAmount: allPayouts.filter(p => p.payoutStatus === 'processed').reduce((s, p) => s + Number(p.commissionAmount), 0),
      paidCount: allPayouts.filter(p => p.payoutStatus === 'paid').length,
      paidAmount: allPayouts.filter(p => p.payoutStatus === 'paid').reduce((s, p) => s + Number(p.commissionAmount), 0),
    };

    res.json({ payouts: payouts.map(po => ({ ...po, student_name: po.enrollment.lead.name, partner_name: po.partner.name })), summary, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// PATCH /api/payouts/:id/status
router.patch('/:id/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { payout_status, payment_reference } = req.body;
    const payout = await prisma.partnerPayout.findUnique({ where: { payoutId: req.params.id as string } });
    if (!payout) { res.status(404).json({ error: 'Payout not found' }); return; }

    // Validate transition
    const valid: Record<string, string[]> = { pending: ['processed'], processed: ['paid'] };
    if (!valid[payout.payoutStatus]?.includes(payout_status)) {
      res.status(400).json({ error: `Cannot transition from ${payout.payoutStatus} to ${payout_status}` }); return;
    }

    const data: any = { payoutStatus: payout_status };
    if (payout_status === 'processed') data.processedAt = new Date();
    if (payout_status === 'paid') { data.paidAt = new Date(); data.paymentReference = payment_reference || null; }

    const updated = await prisma.partnerPayout.update({ where: { payoutId: req.params.id as string }, data });
    res.json(updated);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
