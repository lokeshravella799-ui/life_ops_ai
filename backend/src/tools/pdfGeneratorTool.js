const { z } = require('zod');
const PDFDocument = require('pdfkit');
const artifactService = require('../services/artifactService');

const pdfInputSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  category: z.string().default('PLAN'),
  summary: z.string().optional(),
  sections: z.array(z.object({
    heading: z.string(),
    items: z.array(z.string()).optional(),
    content: z.string().optional(),
    table: z.array(z.object({
      col1: z.string(),
      col2: z.string(),
      col3: z.string().optional()
    })).optional()
  })).optional(),
  footerNotes: z.string().optional(),
  filename: z.string().optional()
});

const pdfOutputSchema = z.object({
  success: z.boolean(),
  artifactId: z.string(),
  filename: z.string(),
  fileSizeBytes: z.number(),
  title: z.string(),
  mimeType: z.string()
});

async function executePdfGenerator(input, context = {}) {
  const { title, subtitle, category = 'PLAN', summary, sections = [], footerNotes, filename } = input;
  const userId = context.userId || 'system_user';
  const workflowId = context.workflowId || null;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const chunks = [];

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', async () => {
        try {
          const pdfBuffer = Buffer.concat(chunks);
          const safeFilename = filename || `${title.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30)}.pdf`;

          const artifact = await artifactService.saveArtifactFile({
            userId,
            workflowId,
            name: title,
            artifactType: 'PDF',
            filename: safeFilename.endsWith('.pdf') ? safeFilename : `${safeFilename}.pdf`,
            mimeType: 'application/pdf',
            bufferOrString: pdfBuffer,
            metadata: {
              category,
              sectionsCount: sections.length
            }
          });

          resolve({
            success: true,
            artifactId: artifact.id,
            filename: artifact.filename,
            fileSizeBytes: artifact.file_size_bytes,
            title,
            mimeType: 'application/pdf'
          });
        } catch (err) {
          reject(err);
        }
      });

      // --- PDF Content Design ---
      // Header Accent Bar
      doc.rect(50, 45, 495, 4).fill('#6366f1');

      // Brand & Category Badge
      doc.fontSize(9).fillColor('#6366f1').text(`LIFEOPS AI  •  ${category.toUpperCase()} BLUEPRINT`, 50, 58, { characterSpacing: 1 });

      // Document Title
      doc.fontSize(22).fillColor('#0f172a').font('Helvetica-Bold').text(title, 50, 75);
      
      if (subtitle) {
        doc.fontSize(11).fillColor('#64748b').font('Helvetica').text(subtitle, 50, 105);
      }

      let yPos = subtitle ? 130 : 115;

      // Executive Summary Box
      if (summary) {
        doc.rect(50, yPos, 495, 60).fill('#f8fafc');
        doc.rect(50, yPos, 4, 60).fill('#818cf8');
        doc.fontSize(9).fillColor('#4338ca').font('Helvetica-Bold').text('EXECUTIVE OBJECTIVE & STRATEGY', 65, yPos + 10);
        doc.fontSize(10).fillColor('#334155').font('Helvetica').text(summary, 65, yPos + 26, { width: 465, lineGap: 3 });
        yPos += 75;
      }

      // Sections
      for (const section of sections) {
        if (yPos > 680) {
          doc.addPage();
          yPos = 50;
        }

        doc.fontSize(13).fillColor('#1e293b').font('Helvetica-Bold').text(section.heading, 50, yPos);
        yPos += 20;

        if (section.content) {
          doc.fontSize(10).fillColor('#475569').font('Helvetica').text(section.content, 50, yPos, { width: 495, lineGap: 3 });
          yPos += doc.heightOfString(section.content, { width: 495, lineGap: 3 }) + 10;
        }

        if (section.items && section.items.length > 0) {
          for (const item of section.items) {
            if (yPos > 720) {
              doc.addPage();
              yPos = 50;
            }
            doc.fontSize(9).fillColor('#6366f1').text('▪', 55, yPos);
            doc.fontSize(10).fillColor('#334155').font('Helvetica').text(item, 70, yPos, { width: 475 });
            yPos += 18;
          }
          yPos += 8;
        }

        if (section.table && section.table.length > 0) {
          for (const row of section.table) {
            if (yPos > 720) {
              doc.addPage();
              yPos = 50;
            }
            doc.rect(50, yPos, 495, 24).fill('#f1f5f9');
            doc.fontSize(9).fillColor('#0f172a').font('Helvetica-Bold').text(row.col1, 60, yPos + 6, { width: 100 });
            doc.fontSize(9).fillColor('#334155').font('Helvetica').text(row.col2, 170, yPos + 6, { width: 240 });
            if (row.col3) {
              doc.fontSize(8).fillColor('#6366f1').font('Helvetica-Bold').text(row.col3, 420, yPos + 6, { width: 110, align: 'right' });
            }
            yPos += 28;
          }
          yPos += 10;
        }

        yPos += 10;
      }

      // Footer
      const footerText = footerNotes || 'Generated by LifeOps AI Autonomous Execution Fleet. Verified for constraint adherence and completeness.';
      doc.fontSize(8).fillColor('#94a3b8').text(footerText, 50, 780, { align: 'center', width: 495 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  name: 'PDF_GENERATOR',
  description: 'Generates professional verified PDF blueprints, schedules, itineraries, and study plans.',
  capability: 'PDF_GENERATION',
  riskLevel: 'LOW',
  requiresConfirmation: false,
  inputSchema: pdfInputSchema,
  outputSchema: pdfOutputSchema,
  execute: executePdfGenerator
};
