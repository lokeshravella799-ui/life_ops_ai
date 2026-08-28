const { z } = require('zod');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } = require('docx');
const artifactService = require('../services/artifactService');

const docxInputSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  documentType: z.enum(['RESUME', 'ASSIGNMENT', 'REPORT', 'NOTES', 'DOCUMENT']).default('DOCUMENT'),
  summary: z.string().optional(),
  sections: z.array(z.object({
    title: z.string(),
    content: z.string().optional(),
    bulletPoints: z.array(z.string()).optional(),
    subsections: z.array(z.object({
      subtitle: z.string(),
      details: z.string().optional(),
      bullets: z.array(z.string()).optional()
    })).optional()
  })),
  filename: z.string().optional()
});

const docxOutputSchema = z.object({
  success: z.boolean(),
  artifactId: z.string(),
  filename: z.string(),
  fileSizeBytes: z.number(),
  title: z.string(),
  mimeType: z.string()
});

async function executeDocxGenerator(input, context = {}) {
  const { title, subtitle, documentType = 'DOCUMENT', summary, sections = [], filename } = input;
  const userId = context.userId || 'system_user';
  const workflowId = context.workflowId || null;

  const docChildren = [];

  // Title Header
  docChildren.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 36, // 18pt
          color: '1E293B',
          font: 'Calibri'
        })
      ]
    })
  );

  // Subtitle / Contact line
  if (subtitle) {
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        children: [
          new TextRun({
            text: subtitle,
            size: 20, // 10pt
            color: '64748B',
            font: 'Calibri'
          })
        ]
      })
    );
  }

  // Summary / Professional Profile
  if (summary) {
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: documentType === 'RESUME' ? 'PROFESSIONAL SUMMARY' : 'EXECUTIVE SUMMARY',
            bold: true,
            size: 24,
            color: '4338CA',
            font: 'Calibri'
          })
        ]
      })
    );

    docChildren.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: summary,
            size: 22,
            font: 'Calibri',
            color: '334155'
          })
        ]
      })
    );
  }

  // Iterate Sections
  for (const section of sections) {
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        children: [
          new TextRun({
            text: section.title.toUpperCase(),
            bold: true,
            size: 24,
            color: '1E293B',
            font: 'Calibri'
          })
        ]
      })
    );

    if (section.content) {
      docChildren.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: section.content,
              size: 22,
              font: 'Calibri',
              color: '334155'
            })
          ]
        })
      );
    }

    if (section.bulletPoints && section.bulletPoints.length > 0) {
      for (const bullet of section.bulletPoints) {
        docChildren.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: bullet,
                size: 22,
                font: 'Calibri',
                color: '334155'
              })
            ]
          })
        );
      }
    }

    if (section.subsections && section.subsections.length > 0) {
      for (const sub of section.subsections) {
        docChildren.push(
          new Paragraph({
            spacing: { before: 120, after: 60 },
            children: [
              new TextRun({
                text: sub.subtitle,
                bold: true,
                size: 22,
                font: 'Calibri',
                color: '1E293B'
              })
            ]
          })
        );

        if (sub.details) {
          docChildren.push(
            new Paragraph({
              spacing: { after: 80 },
              children: [
                new TextRun({
                  text: sub.details,
                  size: 20,
                  italics: true,
                  color: '64748B',
                  font: 'Calibri'
                })
              ]
            })
          );
        }

        if (sub.bullets && sub.bullets.length > 0) {
          for (const b of sub.bullets) {
            docChildren.push(
              new Paragraph({
                bullet: { level: 0 },
                spacing: { after: 60 },
                children: [
                  new TextRun({
                    text: b,
                    size: 21,
                    font: 'Calibri',
                    color: '334155'
                  })
                ]
              })
            );
          }
        }
      }
    }
  }

  const doc = new Document({
    sections: [{
      properties: {},
      children: docChildren
    }]
  });

  const docxBuffer = await Packer.toBuffer(doc);
  const safeFilename = filename || `${title.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30)}.docx`;

  const artifact = await artifactService.saveArtifactFile({
    userId,
    workflowId,
    name: title,
    artifactType: 'DOCX',
    filename: safeFilename.endsWith('.docx') ? safeFilename : `${safeFilename}.docx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    bufferOrString: docxBuffer,
    metadata: {
      documentType,
      sectionsCount: sections.length
    }
  });

  return {
    success: true,
    artifactId: artifact.id,
    filename: artifact.filename,
    fileSizeBytes: artifact.file_size_bytes,
    title,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  };
}

module.exports = {
  name: 'DOCX_GENERATOR',
  description: 'Generates formatted Word (.docx) documents, resumes, assignments, research reports, and study guides.',
  capability: 'DOCUMENT_GENERATION',
  riskLevel: 'LOW',
  requiresConfirmation: false,
  inputSchema: docxInputSchema,
  outputSchema: docxOutputSchema,
  execute: executeDocxGenerator
};
