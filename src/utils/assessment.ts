// CRI Assessment Questions — hardcoded for MVP
export const assessmentQuestions = {
  sections: [
    {
      id: 'communication',
      title: 'Communication Skills',
      weight: 0.20,
      questions: [
        { id: 'c1', text: 'How comfortable are you speaking in English?', type: 'likert' },
        { id: 'c2', text: 'How often do you speak with strangers in professional settings?', type: 'likert' },
        { id: 'c3', text: 'Have you done any public speaking or group discussions?', type: 'likert' },
        { id: 'c4', text: 'Rate your ability to explain things clearly to others.', type: 'likert' },
      ],
    },
    {
      id: 'bfsi',
      title: 'BFSI Aptitude',
      weight: 0.20,
      questions: [
        { id: 'b1', text: 'Do you know the difference between a savings account and a current account?', type: 'mcq', options: ['Yes, I can explain it', 'I have a rough idea', 'I\'ve heard of them', 'No idea'], correct: 0 },
        { id: 'b2', text: 'Have you ever worked in banking, insurance, or finance?', type: 'likert' },
        { id: 'b3', text: 'Can you calculate simple interest mentally?', type: 'likert' },
        { id: 'b4', text: 'What is KYC?', type: 'mcq', options: ['Know Your Customer', 'Keep Your Card', 'Key Yearly Compliance', 'None of the above'], correct: 0 },
      ],
    },
    {
      id: 'discipline',
      title: 'Professional Discipline',
      weight: 0.20,
      questions: [
        { id: 'd1', text: 'How punctual are you on average?', type: 'likert' },
        { id: 'd2', text: 'Do you follow a daily routine or schedule?', type: 'likert' },
        { id: 'd3', text: 'How rarely do you miss deadlines?', type: 'likert' },
        { id: 'd4', text: 'Rate your ability to follow instructions carefully.', type: 'likert' },
      ],
    },
    {
      id: 'agility',
      title: 'Learning Agility',
      weight: 0.15,
      questions: [
        { id: 'a1', text: 'How quickly do you learn new software or tools?', type: 'likert' },
        { id: 'a2', text: 'How well do you respond when given constructive feedback?', type: 'likert' },
        { id: 'a3', text: 'Have you ever taken an online course or certification?', type: 'likert' },
        { id: 'a4', text: 'Do you ask questions when you don\'t understand something?', type: 'likert' },
      ],
    },
    {
      id: 'professionalism',
      title: 'Career Clarity & Professionalism',
      weight: 0.15,
      questions: [
        { id: 'p1', text: 'Do you have a clear idea of the role you want in 2 years?', type: 'likert' },
        { id: 'p2', text: 'How motivated are you to work in the BFSI sector?', type: 'likert' },
        { id: 'p3', text: 'What drives you most in your career?', type: 'mcq', options: ['Salary & compensation', 'Career growth & learning', 'Job stability & security', 'Work-life balance'], correct: 1 },
        { id: 'p4', text: 'Have you done any job research before applying?', type: 'likert' },
      ],
    },
    {
      id: 'confidence',
      title: 'Interview Confidence',
      weight: 0.10,
      questions: [
        { id: 'i1', text: 'Have you attended formal interviews before?', type: 'likert' },
        { id: 'i2', text: 'How confident are you in group interview settings?', type: 'likert' },
        { id: 'i3', text: 'Can you talk about yourself for 2 minutes comfortably?', type: 'likert' },
      ],
    },
  ],
};

// Calculate section score from raw answers
export function calculateSectionScore(answers: number[], questionCount: number): number {
  const maxScore = questionCount * 4; // Each question max 4
  const totalScore = answers.reduce((sum, a) => sum + Math.min(a, 4), 0);
  return (totalScore / maxScore) * 100;
}

// Determine CRI band from overall score
export function getCriBand(cri: number): string {
  if (cri >= 80) return 'High';
  if (cri >= 60) return 'Trainable';
  if (cri >= 40) return 'Needs Intervention';
  return 'High Risk';
}
