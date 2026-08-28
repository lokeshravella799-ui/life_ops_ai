const db = require('../config/supabase');
const geminiService = require('../services/geminiService');
const { z } = require('zod');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

const documentExtractionSchema = z.object({
  summary: z.string(),
  keyDeadlines: z.array(z.string()),
  deliverables: z.array(z.string()),
  extractedActionItems: z.array(z.object({
    title: z.string(),
    description: z.string(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    estimatedHours: z.number()
  }))
});

class DocumentController {
  async processText(req, res, next) {
    try {
      const { title, rawContent } = req.body;
      if (!rawContent || rawContent.trim().length === 0) {
        return errorResponse(res, 'Document text content is required', 'VALIDATION_ERROR', 400);
      }

      const systemInstruction = `You are the Document Extraction Agent in LifeOps AI.
Analyze the provided document text, extract key deliverables, identify deadlines, and formulate structured action items.

Respond strictly with a JSON object matching this schema:
{
  "summary": "Concise summary of the document",
  "keyDeadlines": ["Deadline 1", "Deadline 2"],
  "deliverables": ["Deliverable 1", "Deliverable 2"],
  "extractedActionItems": [
    {
      "title": "Action Title",
      "description": "Specific task",
      "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
      "estimatedHours": 2
    }
  ]
}`;

      const prompt = `Document Title: "${title || 'Untitled Document'}"\n\nContent:\n${rawContent.slice(0, 4000)}`;

      const fallbackGenerator = () => ({
        summary: `Analyzed document "${title || 'Document'}" containing ${rawContent.split(' ').length} words.`,
        keyDeadlines: ['Standard milestone deadline: 7 days'],
        deliverables: ['Review document objectives', 'Implement key requirements', 'Perform QA audit'],
        extractedActionItems: [
          {
            title: `Review and analyze requirements from "${title || 'Document'}"`,
            description: 'Read thoroughly and highlight ambiguous terms or missing constraints.',
            priority: 'HIGH',
            estimatedHours: 2
          },
          {
            title: 'Draft execution blueprint',
            description: 'Translate document specifications into technical deliverables.',
            priority: 'MEDIUM',
            estimatedHours: 3
          }
        ]
      });

      const extracted = await geminiService.generateStructuredOutput({
        prompt,
        systemInstruction,
        schema: documentExtractionSchema,
        agentName: 'Document Agent',
        fallbackGenerator
      });

      const doc = await db.createDocument({
        user_id: req.user.id,
        title: title || 'Processed Document',
        raw_content: rawContent,
        extracted_data: extracted
      });

      return successResponse(res, { document: doc, extracted }, 201);
    } catch (err) {
      next(err);
    }
  }

  async getDocuments(req, res, next) {
    try {
      const documents = await db.getDocumentsByUserId(req.user.id);
      return successResponse(res, { documents });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DocumentController();
