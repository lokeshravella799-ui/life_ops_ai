const { z } = require('zod');

const messageDraftInputSchema = z.object({
  channel: z.enum(['SLACK', 'TEAMS', 'WHATSAPP', 'SMS', 'DISCORD', 'SUPPORT_CHAT']).default('SLACK'),
  recipientPlaceholder: z.string().default('@team'),
  context: z.string(),
  actionRequired: z.string(),
  urgency: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).default('NORMAL')
});

const messageDraftOutputSchema = z.object({
  channel: z.string(),
  draftText: z.string(),
  characterCount: z.number(),
  urgency: z.string(),
  preview: z.string()
});

async function executeMessageDraftGenerator(input, context = {}) {
  const { channel = 'SLACK', recipientPlaceholder = '@team', context: ctx, actionRequired, urgency = 'NORMAL' } = input;

  let prefix = '';
  if (urgency === 'CRITICAL') prefix = '🚨 [URGENT] ';
  else if (urgency === 'HIGH') prefix = '⚠️ [IMPORTANT] ';

  let draftText = '';
  if (channel === 'SLACK' || channel === 'TEAMS') {
    draftText = `${prefix}${recipientPlaceholder} - Quick update regarding ${ctx}:\n👉 *Action Needed*: ${actionRequired}`;
  } else if (channel === 'WHATSAPP' || channel === 'SMS') {
    draftText = `${prefix}Hi ${recipientPlaceholder}, quick note regarding ${ctx}. Please ${actionRequired}. Thanks!`;
  } else {
    draftText = `${prefix}${ctx} -> ${actionRequired}`;
  }

  return {
    channel,
    draftText,
    characterCount: draftText.length,
    urgency,
    preview: draftText.slice(0, 100)
  };
}

module.exports = {
  name: 'MESSAGE_DRAFT_GENERATOR',
  description: 'Generates concise, context-aware instant message drafts for Slack, Teams, WhatsApp, and support chats.',
  capability: 'MESSAGE_DRAFTING',
  riskLevel: 'LOW',
  requiresConfirmation: false,
  inputSchema: messageDraftInputSchema,
  outputSchema: messageDraftOutputSchema,
  execute: executeMessageDraftGenerator
};
