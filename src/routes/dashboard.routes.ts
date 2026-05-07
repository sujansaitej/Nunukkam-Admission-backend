import { Router, Response } from 'express';
import prisma from '../utils/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [totalLeads, newLeads, assessedLeads, enrolledLeads, totalPartners, totalRevenue, pendingPayouts] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { status: 'new' } }),
      prisma.lead.count({ where: { status: 'assessed' } }),
      prisma.lead.count({ where: { status: 'enrolled' } }),
      prisma.partner.count({ where: { isActive: true } }),
      prisma.payment.aggregate({ _sum: { amountPaid: true } }),
      prisma.partnerPayout.aggregate({ where: { payoutStatus: 'pending' }, _sum: { commissionAmount: true }, _count: true }),
    ]);

    // Status distribution for chart
    const statusDist = await prisma.lead.groupBy({ by: ['status'], _count: true });

    // Source distribution
    const sourceDist = await prisma.lead.groupBy({ by: ['source'], _count: true });

    // Recent leads
    const recentLeads = await prisma.lead.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { counselor: { select: { name: true } } } });

    res.json({
      totalLeads, newLeads, assessedLeads, enrolledLeads, totalPartners,
      totalRevenue: Number(totalRevenue._sum.amountPaid || 0),
      pendingPayoutsCount: pendingPayouts._count,
      pendingPayoutsAmount: Number(pendingPayouts._sum.commissionAmount || 0),
      statusDistribution: statusDist.map(s => ({ status: s.status, count: s._count })),
      sourceDistribution: sourceDist.map(s => ({ source: s.source || 'Direct/Other', count: s._count })),
      recentLeads,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
