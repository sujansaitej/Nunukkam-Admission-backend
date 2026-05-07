import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma.js';
import { assessmentQuestions, calculateSectionScore, getCriBand } from '../utils/assessment.js';
import { generateScorecard } from '../services/pdf.service.js';

const router = Router();

// GET /api/assess/:lead_id — Public: Get assessment questions
router.get('/:lead_id', async (req: Request, res: Response) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { leadId: req.params.lead_id },
      include: { assessment: true },
    });

    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    if (lead.assessment) {
      res.status(400).json({ error: 'Assessment already completed', band: lead.assessment.band });
      return;
    }

    // Return student first name and questions (no login required)
    const firstName = lead.name.split(' ')[0];
    res.json({
      studentName: firstName,
      fullName: lead.name,
      sections: assessmentQuestions.sections.map(s => ({
        id: s.id,
        title: s.title,
        questions: s.questions.map(q => ({
          id: q.id,
          text: q.text,
          type: q.type,
          ...(q.type === 'mcq' && { options: (q as any).options }),
        })),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/assess/:lead_id/submit — Public: Submit assessment answers
router.post('/:lead_id/submit', async (req: Request, res: Response) => {
  try {
    const lead = await prisma.lead.findUnique({
      where: { leadId: req.params.lead_id },
      include: { assessment: true, counselor: { select: { name: true } } },
    });

    if (!lead) {
      res.status(404).json({ error: 'Lead not found' });
      return;
    }

    if (lead.assessment) {
      res.status(400).json({ error: 'Assessment already completed' });
      return;
    }

    const { section1_answers, section2_answers, section3_answers, section4_answers, section5_answers, section6_answers } = req.body;

    // Calculate section scores (normalize to 0-100)
    const commScore = calculateSectionScore(section1_answers, assessmentQuestions.sections[0].questions.length);
    const bfsiScore = calculateSectionScore(section2_answers, assessmentQuestions.sections[1].questions.length);
    const disciplineScore = calculateSectionScore(section3_answers, assessmentQuestions.sections[2].questions.length);
    const agilityScore = calculateSectionScore(section4_answers, assessmentQuestions.sections[3].questions.length);
    const professionalismScore = calculateSectionScore(section5_answers, assessmentQuestions.sections[4].questions.length);
    const confidenceScore = calculateSectionScore(section6_answers, assessmentQuestions.sections[5].questions.length);

    // Apply CRI formula with weights
    const overallCri =
      (commScore * 0.20) +
      (disciplineScore * 0.20) +
      (bfsiScore * 0.20) +
      (agilityScore * 0.15) +
      (professionalismScore * 0.15) +
      (confidenceScore * 0.10);

    const band = getCriBand(overallCri);

    // Generate PDF scorecard
    const scorecardUrl = await generateScorecard({
      studentName: lead.name,
      leadId: lead.leadId,
      commScore, bfsiScore, disciplineScore, agilityScore, professionalismScore, confidenceScore,
      overallCri, band,
      date: new Date().toLocaleDateString('en-IN'),
    });

    // Save assessment
    const assessment = await prisma.assessmentScore.create({
      data: {
        leadId: lead.leadId,
        commScore, bfsiScore, disciplineScore, agilityScore,
        professionalismScore, confidenceScore,
        overallCri, band, scorecardPdfUrl: scorecardUrl,
        answers: {
          section1: section1_answers,
          section2: section2_answers,
          section3: section3_answers,
          section4: section4_answers,
          section5: section5_answers,
          section6: section6_answers,
        }
      },
    });

    // Update lead status
    await prisma.lead.update({
      where: { leadId: lead.leadId },
      data: { status: 'assessed' },
    });

    // TODO: Send WhatsApp notification to counselor

    res.json({
      message: 'Assessment completed',
      band,
      assessment_id: assessment.assessmentId,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
