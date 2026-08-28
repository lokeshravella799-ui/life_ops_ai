const { z } = require('zod');
const XLSX = require('xlsx');
const artifactService = require('../services/artifactService');

const spreadsheetInputSchema = z.object({
  title: z.string(),
  sheets: z.array(z.object({
    sheetName: z.string(),
    headers: z.array(z.string()),
    rows: z.array(z.array(z.union([z.string(), z.number(), z.boolean()])))
  })),
  filename: z.string().optional()
});

const spreadsheetOutputSchema = z.object({
  success: z.boolean(),
  artifactId: z.string(),
  filename: z.string(),
  fileSizeBytes: z.number(),
  title: z.string(),
  mimeType: z.string(),
  sheetsCount: z.number()
});

async function executeSpreadsheetGenerator(input, context = {}) {
  const { title, sheets = [], filename } = input;
  const userId = context.userId || 'system_user';
  const workflowId = context.workflowId || null;

  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const data = [sheet.headers, ...sheet.rows];
    const worksheet = XLSX.utils.aoa_to_sheet(data);

    // Set column widths
    const colWidths = sheet.headers.map((h, colIdx) => {
      let maxLen = h.length;
      sheet.rows.forEach(row => {
        const val = row[colIdx] !== undefined ? String(row[colIdx]) : '';
        if (val.length > maxLen) maxLen = val.length;
      });
      return { wch: Math.min(45, Math.max(12, maxLen + 3)) };
    });
    worksheet['!cols'] = colWidths;

    const safeSheetName = (sheet.sheetName || 'Sheet1').slice(0, 31).replace(/[\\/?*[\]]/g, '_');
    XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
  }

  const xlsxBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const safeFilename = filename || `${title.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30)}.xlsx`;

  const artifact = await artifactService.saveArtifactFile({
    userId,
    workflowId,
    name: title,
    artifactType: 'XLSX',
    filename: safeFilename.endsWith('.xlsx') ? safeFilename : `${safeFilename}.xlsx`,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    bufferOrString: xlsxBuffer,
    metadata: {
      sheetsCount: sheets.length
    }
  });

  return {
    success: true,
    artifactId: artifact.id,
    filename: artifact.filename,
    fileSizeBytes: artifact.file_size_bytes,
    title,
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    sheetsCount: sheets.length
  };
}

module.exports = {
  name: 'SPREADSHEET_GENERATOR',
  description: 'Generates structured Excel (.xlsx) workbooks, budget allocations, schedules, and comparison sheets.',
  capability: 'SPREADSHEET_GENERATION',
  riskLevel: 'LOW',
  requiresConfirmation: false,
  inputSchema: spreadsheetInputSchema,
  outputSchema: spreadsheetOutputSchema,
  execute: executeSpreadsheetGenerator
};
