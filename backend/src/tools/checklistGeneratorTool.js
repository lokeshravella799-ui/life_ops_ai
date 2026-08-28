const { z } = require('zod');

const checklistInputSchema = z.object({
  title: z.string(),
  domain: z.string().default('GENERAL'),
  categories: z.array(z.object({
    categoryName: z.string(),
    items: z.array(z.object({
      task: z.string(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
      isCritical: z.boolean().default(false),
      estimatedMinutes: z.number().optional(),
      notes: z.string().optional()
    }))
  }))
});

const checklistOutputSchema = z.object({
  title: z.string(),
  domain: z.string(),
  totalItems: z.number(),
  criticalItemsCount: z.number(),
  checklist: z.array(z.object({
    categoryName: z.string(),
    items: z.array(z.object({
      id: z.string(),
      task: z.string(),
      priority: z.string(),
      isCritical: z.boolean(),
      completed: z.boolean(),
      notes: z.string().optional()
    }))
  }))
});

async function executeChecklistGenerator(input, context = {}) {
  const { title, domain = 'GENERAL', categories = [] } = input;

  let totalItems = 0;
  let criticalItemsCount = 0;

  const formattedCategories = categories.map((cat, catIdx) => {
    const formattedItems = (cat.items || []).map((item, itemIdx) => {
      totalItems++;
      if (item.isCritical) criticalItemsCount++;

      return {
        id: `chk_${catIdx + 1}_${itemIdx + 1}`,
        task: item.task,
        priority: item.priority || 'MEDIUM',
        isCritical: Boolean(item.isCritical),
        completed: false,
        notes: item.notes || ''
      };
    });

    return {
      categoryName: cat.categoryName,
      items: formattedItems
    };
  });

  return {
    title,
    domain,
    totalItems,
    criticalItemsCount,
    checklist: formattedCategories
  };
}

module.exports = {
  name: 'CHECKLIST_GENERATOR',
  description: 'Generates structured, categorized, and prioritized actionable execution checklists.',
  capability: 'CHECKLIST_GENERATION',
  riskLevel: 'LOW',
  requiresConfirmation: false,
  inputSchema: checklistInputSchema,
  outputSchema: checklistOutputSchema,
  execute: executeChecklistGenerator
};
