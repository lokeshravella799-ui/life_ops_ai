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
      const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
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
      doc.fontSize(20).fillColor('#0f172a').font('Helvetica-Bold').text(title, 50, 75, { width: 495 });
      
      if (subtitle) {
        doc.fontSize(10).fillColor('#64748b').font('Helvetica').text(subtitle, 50, doc.y + 4, { width: 495 });
      }

      let yPos = doc.y + 12;

      // Executive Summary Box
      if (summary) {
        const sumHeight = Math.max(50, doc.heightOfString(summary, { width: 465, lineGap: 2 }) + 26);
        doc.rect(50, yPos, 495, sumHeight).fill('#f8fafc');
        doc.rect(50, yPos, 4, sumHeight).fill('#818cf8');
        doc.fontSize(8.5).fillColor('#4338ca').font('Helvetica-Bold').text('EXECUTIVE OBJECTIVE & STRATEGY', 65, yPos + 8);
        doc.fontSize(9.5).fillColor('#334155').font('Helvetica').text(summary, 65, yPos + 22, { width: 465, lineGap: 2 });
        yPos += sumHeight + 15;
      }

      // Sections
      for (const section of sections) {
        if (yPos > 680) {
          doc.addPage();
          doc.rect(50, 45, 495, 2).fill('#6366f1');
          yPos = 58;
        }

        doc.fontSize(12).fillColor('#1e293b').font('Helvetica-Bold').text(section.heading, 50, yPos);
        yPos += 18;

        if (section.content) {
          doc.fontSize(9.5).fillColor('#475569').font('Helvetica').text(section.content, 50, yPos, { width: 495, lineGap: 2 });
          yPos += doc.heightOfString(section.content, { width: 495, lineGap: 2 }) + 8;
        }

        if (section.items && section.items.length > 0) {
          for (const item of section.items) {
            if (yPos > 720) {
              doc.addPage();
              doc.rect(50, 45, 495, 2).fill('#6366f1');
              yPos = 58;
            }
            doc.fontSize(8.5).fillColor('#6366f1').text('▪', 55, yPos);
            doc.fontSize(9).fillColor('#334155').font('Helvetica').text(item, 70, yPos, { width: 475 });
            yPos += 16;
          }
          yPos += 6;
        }

        if (section.table && section.table.length > 0) {
          for (const row of section.table) {
            if (yPos > 730) {
              doc.addPage();
              doc.rect(50, 45, 495, 2).fill('#6366f1');
              yPos = 58;
            }
            doc.rect(50, yPos, 495, 20).fill('#f8fafc');
            doc.fontSize(8.5).fillColor('#0f172a').font('Helvetica-Bold').text(row.col1, 58, yPos + 5, { width: 70 });
            doc.fontSize(8.5).fillColor('#334155').font('Helvetica').text(row.col2, 135, yPos + 5, { width: 260, ellipsis: true });
            if (row.col3) {
              doc.fontSize(7.5).fillColor('#4f46e5').font('Helvetica-Bold').text(row.col3, 400, yPos + 5, { width: 135, align: 'right' });
            }
            yPos += 22;
          }
          yPos += 8;
        }

        yPos += 8;
      }

      // Add page numbering across all pages
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        const footerText = footerNotes || `LifeOps AI Autonomous Execution Blueprint • Page ${i + 1} of ${range.count}`;
        doc.fontSize(7.5).fillColor('#94a3b8').text(footerText, 50, 792, { align: 'center', width: 495 });
      }

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
