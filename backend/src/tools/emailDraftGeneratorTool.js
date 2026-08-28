const { z } = require('zod');

const emailDraftInputSchema = z.object({
  recipientType: z.enum(['CUSTOMER', 'PROFESSOR', 'MANAGER', 'COLLEAGUE', 'VENDOR', 'SUPPORT', 'GENERAL']).default('GENERAL'),
  recipientPlaceholder: z.string().default('[Recipient Name]'),
  subject: z.string(),
  tone: z.enum(['PROFESSIONAL', 'POLITE', 'EMPATHETIC', 'FORMAL', 'URGENT']).default('PROFESSIONAL'),
  keyPoints: z.array(z.string()),
  proposedAction: z.string().optional(),
  attachmentsRequired: z.array(z.string()).optional()
});

const emailDraftOutputSchema = z.object({
  subject: z.string(),
  recipientPlaceholder: z.string(),
  tone: z.string(),
  draftBody: z.string(),
  attachmentsRequired: z.array(z.string()),
  nextSteps: z.array(z.string())
});

async function executeEmailDraftGenerator(input, context = {}) {
  const { recipientType = 'GENERAL', recipientPlaceholder = '[Recipient Name]', subject, tone = 'PROFESSIONAL', keyPoints = [], proposedAction, attachmentsRequired = [] } = input;

  let salutation = `Dear ${recipientPlaceholder},`;
  if (recipientType === 'COLLEAGUE') salutation = `Hi ${recipientPlaceholder},`;
  if (recipientType === 'PROFESSOR') salutation = `Dear Professor ${recipientPlaceholder},`;

  let signoff = 'Sincerely,\n[Your Name]\n[Your Title/Contact Information]';
  if (tone === 'POLITE' || tone === 'EMPATHETIC') {
    signoff = 'Warm regards,\n[Your Name]\nLifeOps Operations Team';
  } else if (tone === 'FORMAL') {
    signoff = 'Respectfully yours,\n[Your Name]\n[Contact Information]';
  }

  const bodyParagraphs = [];
  bodyParagraphs.push(salutation);
  bodyParagraphs.push('');

  if (recipientType === 'CUSTOMER' && (tone === 'EMPATHETIC' || tone === 'POLITE')) {
    bodyParagraphs.push('Thank you for reaching out to us. We sincerely apologize for any inconvenience caused and appreciate the opportunity to resolve this promptly.');
  } else {
    bodyParagraphs.push(`I am writing regarding ${subject.toLowerCase()}.`);
  }

  bodyParagraphs.push('');
  bodyParagraphs.push('Key details and summary:');
  keyPoints.forEach(pt => {
    bodyParagraphs.push(`• ${pt}`);
  });

  if (proposedAction) {
    bodyParagraphs.push('');
    bodyParagraphs.push(`Recommended Next Step: ${proposedAction}`);
  }

  if (attachmentsRequired.length > 0) {
    bodyParagraphs.push('');
    bodyParagraphs.push(`Please find attached: ${attachmentsRequired.join(', ')}.`);
  }

  bodyParagraphs.push('');
  bodyParagraphs.push('Please let me know if you require any additional information.');
  bodyParagraphs.push('');
  bodyParagraphs.push(signoff);

  const fullDraft = bodyParagraphs.join('\n');

  return {
    subject,
    recipientPlaceholder,
    tone,
    draftBody: fullDraft,
    attachmentsRequired,
    nextSteps: [
      'Review and personalize placeholders ([Recipient Name], [Your Name])',
      'Verify attached documents before dispatch',
      'Send email directly via your mail client'
    ]
  };
}

module.exports = {
  name: 'EMAIL_DRAFT_GENERATOR',
  description: 'Generates professional, structured email drafts for customers, managers, professors, and vendors.',
  capability: 'EMAIL_DRAFTING',
  riskLevel: 'MEDIUM',
  requiresConfirmation: false,
  inputSchema: emailDraftInputSchema,
  outputSchema: emailDraftOutputSchema,
  execute: executeEmailDraftGenerator
};
