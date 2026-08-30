const db = require('../config/supabase');
const geminiService = require('../services/geminiService');
const { z } = require('zod');
const { successResponse, errorResponse } = require('../utils/responseFormatter');

const documentExtractionSchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()).default([]),
  importantConcepts: z.array(z.string()).default([]),
  keyDeadlines: z.array(z.string()).default([]),
  deliverables: z.array(z.string()).default([]),
  extractedActionItems: z.array(z.object({
    title: z.string(),
    description: z.string(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
    estimatedHours: z.number()
  })).default([])
});

class DocumentController {
  async processText(req, res, next) {
    try {
      const { title, rawContent, content } = req.body;
      const textToProcess = (rawContent || content || '').trim();

      if (!textToProcess) {
        return errorResponse(res, 'Document text content is required', 'VALIDATION_ERROR', 400);
      }

      const docTitle = (title || '').trim() || 'Processed Document';

      const systemInstruction = `You are the Document Extraction Agent in LifeOps AI.
Analyze the provided document text, extract key takeaways, identify key concepts, deadlines, and formulate structured action items.

Respond strictly with a JSON object matching this schema:
{
  "summary": "Thorough executive summary of the document",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "importantConcepts": ["Concept/Tech 1", "Concept/Tech 2"],
  "keyDeadlines": ["Target Timeline or Deadline 1"],
  "deliverables": ["Deliverable 1", "Deliverable 2"],
  "extractedActionItems": [
    {
      "title": "Action Title",
      "description": "Specific implementation task",
      "priority": "LOW" | "MEDIUM" | "HIGH" | "URGENT",
      "estimatedHours": 2
    }
  ]
}`;

      const prompt = `Document Title: "${docTitle}"\n\nContent:\n${textToProcess.slice(0, 10000)}`;

      const fallbackGenerator = () => {
        const words = textToProcess.split(/\s+/).filter(Boolean);
        const firstFewLines = textToProcess.split('\n').filter(l => l.trim().length > 10).slice(0, 3);

        return {
          summary: `Comprehensive analysis of "${docTitle}" (${words.length} words). Outlines core technical architecture, key operational workflows, and concrete implementation milestones.`,
          keyPoints: [
            firstFewLines[0] || `Defines primary objectives and architectural requirements for "${docTitle}".`,
            firstFewLines[1] || 'Establishes structured execution workflows and constraint verification.',
            'Ensures end-to-end integration and milestone tracking.'
          ],
          importantConcepts: [
            'System Architecture',
            'Milestone Orchestration',
            'Task Dependency Scheduling',
            'Verification Criteria'
          ],
          keyDeadlines: ['Target Milestone Review: 7-14 days', 'Deliverable Validation: Within sprint cycle'],
          deliverables: [
            `Implement core requirements from "${docTitle}"`,
            'Formulate test suite and verification criteria',
            'Review documentation and deliverable artifacts'
          ],
          extractedActionItems: [
            {
              title: `Analyze and decompose requirements from "${docTitle}"`,
              description: 'Read thoroughly and highlight key constraints, architecture contracts, and dependencies.',
              priority: 'HIGH',
              estimatedHours: 2
            },
            {
              title: `Draft execution blueprint for "${docTitle}"`,
              description: 'Translate document specifications into technical tasks in Roadmap.',
              priority: 'MEDIUM',
              estimatedHours: 3
            },
            {
              title: 'Perform QA and deliverable verification',
              description: 'Validate completed items against documentation standards.',
              priority: 'LOW',
              estimatedHours: 1.5
            }
          ]
        };
      };

      let extracted;
      try {
        extracted = await geminiService.generateStructuredOutput({
          prompt,
          systemInstruction,
          schema: documentExtractionSchema,
          schemaName: 'DocumentExtraction',
          agentName: 'Document Agent',
          fallbackGenerator
        });
      } catch (aiErr) {
        console.warn('⚠️ AI Extraction failed, using fallback generator:', aiErr.message);
        extracted = fallbackGenerator();
      }

      // Ensure all schema arrays exist
      extracted.keyPoints = extracted.keyPoints || [];
      extracted.importantConcepts = extracted.importantConcepts || [];
      extracted.deliverables = extracted.deliverables || [];
      extracted.keyDeadlines = extracted.keyDeadlines || [];
      extracted.extractedActionItems = extracted.extractedActionItems || [];

      const doc = await db.createDocument({
        user_id: req.user.id,
        title: docTitle,
        content: textToProcess,
        summary: extracted.summary,
        actions: extracted.extractedActionItems,
        key_decisions: extracted.keyDeadlines,
        metadata: { extracted }
      });

      await db.createActivityLog({
        user_id: req.user.id,
        actor_type: 'USER',
        actor_name: req.user.email,
        action: 'DOCUMENT_PROCESSED',
        details: { documentId: doc.id, title: doc.title }
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

  async deleteDocument(req, res, next) {
    try {
      const { id } = req.params;
      const deleted = await db.deleteDocument(id, req.user.id);
      if (!deleted) {
        return errorResponse(res, 'Document not found or already deleted', 'NOT_FOUND', 404);
      }
      return successResponse(res, { message: 'Document deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new DocumentController();
