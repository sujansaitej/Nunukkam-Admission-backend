import { Router, Response } from 'express';
import prisma from '../utils/prisma.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { generateReceipt } from '../services/pdf.service.js';

const router = Router();

// POST /api/enrollments — Create enrollment
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { lead_id, cohort_id, commitment_accepted } = req.body;
    const lead = await prisma.lead.findUnique({ where: { leadId: lead_id } });
    if (!lead) { res.status(404).json({ error: 'Lead not found' }); return; }
    const allowedStatuses = ['assessed', 'counseled', 'parent_aligned', 'commitment_accepted'];
    if (!allowedStatuses.includes(lead.status)) { res.status(400).json({ error: `Lead must be at least assessed. Current: ${lead.status}` }); return; }
    const existing = await prisma.enrollment.findUnique({ where: { leadId: lead_id } });
    if (existing) { res.status(409).json({ error: 'Enrollment exists', enrollment_id: existing.enrollmentId }); return; }
    const enrollment = await prisma.enrollment.create({
      data: { leadId: lead_id, cohortId: cohort_id || null, commitmentAccepted: commitment_accepted || false, commitmentAcceptedAt: commitment_accepted ? new Date() : null },
    });
    res.status(201).json({ enrollment_id: enrollment.enrollmentId, enrollment });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// POST /api/enrollments/:id/payments — Record payment
router.post('/:enrollment_id/payments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const enrollment_id = req.params.enrollment_id as string;
    const { fee_plan, total_fee, amount_paid, due_date, payment_mode, receipt_number, payer_name } = req.body;
    const enrollment: any = await prisma.enrollment.findUnique({ where: { enrollmentId: enrollment_id as string }, include: { lead: { include: { partner: true } }, cohort: true } });
    if (!enrollment) { res.status(404).json({ error: 'Enrollment not found' }); return; }
    const status = Number(amount_paid) >= Number(total_fee) ? 'paid' : 'partial';
    const payment = await prisma.payment.create({ data: { enrollmentId: enrollment_id, feePlan: fee_plan, totalFee: total_fee, amountPaid: amount_paid, dueDate: due_date ? new Date(due_date) : null, paymentMode: payment_mode, receiptNumber: receipt_number, payerName: payer_name, status, paidAt: new Date() } });
    const receiptUrl = await generateReceipt({ receiptNumber: receipt_number, studentName: enrollment.lead.name, mobile: enrollment.lead.mobile, cohortName: enrollment.cohort?.name || 'N/A', totalFee: Number(total_fee), amountPaid: Number(amount_paid), balanceDue: Number(total_fee) - Number(amount_paid), paymentMode: payment_mode, payerName: payer_name, date: new Date().toLocaleDateString('en-IN') });
    await prisma.payment.update({ where: { paymentId: payment.paymentId }, data: { receiptPdfUrl: receiptUrl } });
    await prisma.lead.update({ where: { leadId: enrollment.leadId }, data: { status: 'enrolled' } });
    await prisma.enrollment.update({ where: { enrollmentId: enrollment_id }, data: { lmsAccessCreated: true, lmsAccessCreatedAt: new Date() } });
    if (enrollment.lead.partnerId && enrollment.lead.partner) {
      const rate = Number(enrollment.lead.partner.commissionRate);
      // IMPORTANT: Partner share calculated from ACTUAL AMOUNT PAID, not total course fee
      const partnerAmount = (Number(amount_paid) * rate) / 100;
      const companyAmount = Number(amount_paid) - partnerAmount;
      await prisma.partnerPayout.create({ data: { enrollmentId: enrollment_id, partnerId: enrollment.lead.partnerId, feeCollected: amount_paid, commissionRate: rate, commissionAmount: partnerAmount, payoutStatus: 'pending' } });
    }
    res.status(201).json({ payment_id: payment.paymentId, receipt_url: receiptUrl, message: 'Payment recorded' });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// GET /api/enrollments/:id/payments
router.get('/:enrollment_id/payments', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const payments = await prisma.payment.findMany({ where: { enrollmentId: req.params.enrollment_id as string }, orderBy: { createdAt: 'desc' } });
    res.json(payments);
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

export default router;
