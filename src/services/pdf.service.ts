import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');

interface ScorecardData {
  studentName: string;
  leadId: string;
  commScore: number;
  bfsiScore: number;
  disciplineScore: number;
  agilityScore: number;
  professionalismScore: number;
  confidenceScore: number;
  overallCri: number;
  band: string;
  date: string;
}

interface ReceiptData {
  receiptNumber: string;
  studentName: string;
  mobile: string;
  cohortName: string;
  totalFee: number;
  amountPaid: number;
  balanceDue: number;
  paymentMode: string;
  payerName: string;
  date: string;
}

interface ApplicationData {
  name: string;
  mobile: string;
  email?: string;
  gender?: string;
  dateOfBirth?: string;
  fatherName?: string;
  address?: string;
  courseName?: string;
  educationDetails?: any[];
  workExperience?: any[];
  languagesKnown?: any[];
  referenceFriends?: any[];
}

function getBandColor(band: string): string {
  switch (band) {
    case 'High': return '#16a34a';
    case 'Trainable': return '#eab308';
    case 'Needs Intervention': return '#f97316';
    case 'High Risk': return '#dc2626';
    default: return '#6b7280';
  }
}

export async function generateScorecard(data: ScorecardData): Promise<string> {
  const dir = path.join(uploadsDir, 'scorecards');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${data.leadId}.pdf`);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc.fontSize(22).fillColor('#6A1C9A').text('NUNUKKAM', { align: 'center' });
    doc.fontSize(12).fillColor('#6b7280').text('Career Readiness Intelligence Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Student Info
    doc.fontSize(14).fillColor('#1f2937').text(`Student: ${data.studentName}`);
    doc.fontSize(10).fillColor('#6b7280').text(`Date: ${data.date}`);
    doc.moveDown();

    // CRI Score
    doc.fontSize(36).fillColor('#6A1C9A').text(data.overallCri.toFixed(1), { align: 'center' });
    doc.fontSize(12).fillColor('#6b7280').text('Overall CRI Score', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(16).fillColor(getBandColor(data.band)).text(`Band: ${data.band}`, { align: 'center' });
    doc.moveDown(1.5);

    // Section Breakdown Table
    doc.fontSize(14).fillColor('#1f2937').text('Section Breakdown');
    doc.moveDown(0.5);

    const sections = [
      { name: 'Communication', score: data.commScore, weight: '20%', weighted: data.commScore * 0.20 },
      { name: 'BFSI Aptitude', score: data.bfsiScore, weight: '20%', weighted: data.bfsiScore * 0.20 },
      { name: 'Professional Discipline', score: data.disciplineScore, weight: '20%', weighted: data.disciplineScore * 0.20 },
      { name: 'Learning Agility', score: data.agilityScore, weight: '15%', weighted: data.agilityScore * 0.15 },
      { name: 'Career Clarity', score: data.professionalismScore, weight: '15%', weighted: data.professionalismScore * 0.15 },
      { name: 'Interview Confidence', score: data.confidenceScore, weight: '10%', weighted: data.confidenceScore * 0.10 },
    ];

    // Table header
    const startX = 50;
    let y = doc.y;
    doc.fontSize(10).fillColor('#6b7280');
    doc.text('Section', startX, y, { width: 180 });
    doc.text('Score', startX + 180, y, { width: 80, align: 'center' });
    doc.text('Weight', startX + 260, y, { width: 80, align: 'center' });
    doc.text('Weighted', startX + 340, y, { width: 80, align: 'center' });
    doc.moveDown(0.5);
    doc.strokeColor('#e5e7eb').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    // Table rows
    doc.fontSize(11).fillColor('#1f2937');
    for (const s of sections) {
      y = doc.y;
      doc.text(s.name, startX, y, { width: 180 });
      doc.text(s.score.toFixed(1), startX + 180, y, { width: 80, align: 'center' });
      doc.text(s.weight, startX + 260, y, { width: 80, align: 'center' });
      doc.text(s.weighted.toFixed(1), startX + 340, y, { width: 80, align: 'center' });
      doc.moveDown(0.5);
    }

    // Total row
    doc.strokeColor('#6A1C9A').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);
    y = doc.y;
    doc.fontSize(12).fillColor('#6A1C9A').text('TOTAL CRI', startX, y, { width: 180 });
    doc.text('—', startX + 180, y, { width: 80, align: 'center' });
    doc.text('100%', startX + 260, y, { width: 80, align: 'center' });
    doc.text(data.overallCri.toFixed(1), startX + 340, y, { width: 80, align: 'center' });

    doc.moveDown(3);

    // Counselor Notes Section
    doc.fontSize(12).fillColor('#1f2937').text('Counselor Notes:');
    doc.moveDown(0.5);
    doc.strokeColor('#e5e7eb').lineWidth(0.5);
    for (let i = 0; i < 5; i++) {
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#9ca3af').text('Confidential — Nunukkam Employability Intelligence', { align: 'center' });

    doc.end();
    stream.on('finish', () => resolve(`/uploads/scorecards/${data.leadId}.pdf`));
    stream.on('error', reject);
  });
}

export async function generateReceipt(data: ReceiptData): Promise<string> {
  const dir = path.join(uploadsDir, 'receipts');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filePath = path.join(dir, `${data.receiptNumber}.pdf`);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc.fontSize(22).fillColor('#6A1C9A').text('NUNUKKAM', { align: 'center' });
    doc.fontSize(12).fillColor('#6b7280').text('Official Fee Receipt', { align: 'center' });
    doc.moveDown(0.5);
    doc.strokeColor('#6A1C9A').lineWidth(2).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // Receipt Number
    doc.fontSize(18).fillColor('#1f2937').text(`Receipt #: ${data.receiptNumber}`, { align: 'right' });
    doc.fontSize(10).fillColor('#6b7280').text(`Date: ${data.date}`, { align: 'right' });
    doc.moveDown(1.5);

    // Student Info
    doc.fontSize(12).fillColor('#1f2937');
    doc.text(`Student Name: ${data.studentName}`);
    doc.text(`Mobile: ${data.mobile}`);
    doc.text(`Program / Cohort: ${data.cohortName}`);
    doc.moveDown(1.5);

    // Fee Breakdown
    doc.strokeColor('#e5e7eb').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.5);

    const labelX = 50;
    const valueX = 350;

    doc.fontSize(13).fillColor('#1f2937');
    doc.text('Total Fee:', labelX, doc.y).text(`₹${data.totalFee.toLocaleString('en-IN')}`, valueX, doc.y - 15, { align: 'right', width: 195 });
    doc.moveDown(0.3);
    doc.text('Amount Paid:', labelX, doc.y).text(`₹${data.amountPaid.toLocaleString('en-IN')}`, valueX, doc.y - 15, { align: 'right', width: 195 });
    doc.moveDown(0.3);
    doc.fillColor(data.balanceDue > 0 ? '#dc2626' : '#16a34a');
    doc.text('Balance Due:', labelX, doc.y).text(`₹${data.balanceDue.toLocaleString('en-IN')}`, valueX, doc.y - 15, { align: 'right', width: 195 });
    doc.moveDown(0.5);
    doc.fillColor('#1f2937');
    doc.text('Payment Mode:', labelX, doc.y).text(data.paymentMode, valueX, doc.y - 15, { align: 'right', width: 195 });
    doc.moveDown(0.3);
    doc.text('Payer Name:', labelX, doc.y).text(data.payerName, valueX, doc.y - 15, { align: 'right', width: 195 });

    doc.moveDown(2);
    doc.strokeColor('#e5e7eb').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1.5);

    // Thank you
    doc.fontSize(14).fillColor('#6A1C9A').text('Thank you for enrolling with Nunukkam!', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#6b7280').text('Your journey to career excellence starts here.', { align: 'center' });

    // Footer
    doc.moveDown(4);
    doc.fontSize(8).fillColor('#9ca3af').text('Nunukkam Employability Intelligence Stack', { align: 'center' });

    doc.end();
    stream.on('finish', () => resolve(`/uploads/receipts/${data.receiptNumber}.pdf`));
    stream.on('error', reject);
  });
}

export async function generateApplicationForm(data: ApplicationData): Promise<string> {
  const dir = path.join(uploadsDir, 'applications');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const fileName = `${data.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
  const filePath = path.join(dir, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header
    doc.fontSize(22).fillColor('#6A1C9A').text('NUNUKKAM', { align: 'center' });
    doc.fontSize(12).fillColor('#6b7280').text('Student Enrollment Application', { align: 'center' });
    doc.moveDown(0.5);
    doc.strokeColor('#6A1C9A').lineWidth(1.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown();

    // 1. Personal Information
    doc.fontSize(14).fillColor('#6A1C9A').text('1. PERSONAL INFORMATION', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#1f2937');
    
    const rowY = doc.y;
    doc.text(`Name: ${data.name}`, 50, rowY);
    doc.text(`Gender: ${data.gender || '—'}`, 300, rowY);
    doc.moveDown(0.5);
    
    const rowY2 = doc.y;
    doc.text(`Mobile: ${data.mobile}`, 50, rowY2);
    doc.text(`Email: ${data.email || '—'}`, 300, rowY2);
    doc.moveDown(0.5);

    const rowY3 = doc.y;
    doc.text(`DOB: ${data.dateOfBirth || '—'}`, 50, rowY3);
    doc.text(`Father: ${data.fatherName || '—'}`, 300, rowY3);
    doc.moveDown(0.5);

    doc.text(`Address: ${data.address || '—'}`);
    doc.moveDown();

    // 2. Education
    doc.fontSize(14).fillColor('#6A1C9A').text('2. EDUCATIONAL QUALIFICATIONS', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor('#6b7280');
    doc.text('Exam', 50, doc.y, { width: 120 });
    doc.text('Subject/Degree', 170, doc.y - 12, { width: 180 });
    doc.text('Year', 350, doc.y - 12, { width: 80 });
    doc.text('%', 430, doc.y - 12, { width: 50 });
    doc.moveDown(0.3);
    doc.strokeColor('#e5e7eb').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(0.3);
    
    doc.fillColor('#1f2937');
    if (data.educationDetails && data.educationDetails.length > 0) {
      data.educationDetails.forEach(e => {
        const y = doc.y;
        doc.text(e.exam, 50, y, { width: 120 });
        doc.text(e.degree, 170, y, { width: 180 });
        doc.text(e.dateOfPassing, 350, y, { width: 80 });
        doc.text(e.percentage, 430, y, { width: 50 });
        doc.moveDown(0.5);
      });
    } else {
      doc.text('No education details provided', { italic: true });
    }
    doc.moveDown();

    // 3. Experience
    doc.fontSize(14).fillColor('#6A1C9A').text('3. WORK EXPERIENCE', { underline: true });
    doc.moveDown(0.5);
    if (data.workExperience && data.workExperience.length > 0) {
      data.workExperience.forEach(w => {
        doc.fontSize(10).fillColor('#1f2937').text(`${w.designation} at ${w.employer}`, { fontWeight: 'bold' });
        doc.fontSize(9).fillColor('#6b7280').text(`Period: ${w.period} | Duties: ${w.duties}`);
        doc.moveDown(0.5);
      });
    } else {
      doc.fontSize(10).fillColor('#1f2937').text('No work experience provided', { italic: true });
    }
    doc.moveDown();

    // 4. Languages
    doc.fontSize(14).fillColor('#6A1C9A').text('4. LANGUAGES KNOWN', { underline: true });
    doc.moveDown(0.5);
    if (data.languagesKnown && data.languagesKnown.length > 0) {
      doc.fontSize(10).fillColor('#1f2937').text(data.languagesKnown.map(l => l.language).join(', '));
    } else {
      doc.text('—');
    }
    doc.moveDown();

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#9ca3af').text(`Generated on ${new Date().toLocaleString()} | Nunukkam EIS`, { align: 'center' });

    doc.end();
    stream.on('finish', () => resolve(`/uploads/applications/${fileName}`));
    stream.on('error', reject);
  });
}

