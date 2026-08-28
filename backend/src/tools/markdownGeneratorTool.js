const { z } = require('zod');
const artifactService = require('../services/artifactService');

const markdownInputSchema = z.object({
  title: z.string(),
  content: z.string(),
  format: z.enum(['MD', 'TXT']).default('MD'),
  filename: z.string().optional()
});

const markdownOutputSchema = z.object({
  success: z.boolean(),
  artifactId: z.string(),
  filename: z.string(),
  fileSizeBytes: z.number(),
  title: z.string(),
  mimeType: z.string()
});

async function executeMarkdownGenerator(input, context = {}) {
  const { title, content, format = 'MD', filename } = input;
  const userId = context.userId || 'system_user';
  const workflowId = context.workflowId || null;

  const ext = format.toLowerCase();
  const safeFilename = filename || `${title.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30)}.${ext}`;
  const mimeType = format === 'MD' ? 'text/markdown' : 'text/plain';

  const artifact = await artifactService.saveArtifactFile({
    userId,
    workflowId,
    name: title,
    artifactType: format,
    filename: safeFilename.endsWith(`.${ext}`) ? safeFilename : `${safeFilename}.${ext}`,
    mimeType,
    bufferOrString: content,
    metadata: {
      format,
      lineCount: content.split('\n').length
    }
  });

  return {
    success: true,
    artifactId: artifact.id,
    filename: artifact.filename,
    fileSizeBytes: artifact.file_size_bytes,
    title,
    mimeType
  };
}

module.exports = {
  name: 'MARKDOWN_GENERATOR',
  description: 'Generates structured Markdown (.md) or plain text (.txt) documentation and cheat sheets.',
  capability: 'DOCUMENT_GENERATION',
  riskLevel: 'LOW',
  requiresConfirmation: false,
  inputSchema: markdownInputSchema,
  outputSchema: markdownOutputSchema,
  execute: executeMarkdownGenerator
};
