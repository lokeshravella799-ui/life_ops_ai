const db = require('../config/supabase');
const logger = require('../utils/logger');
const { memoryOutputSchema } = require('../validators/agentOutputSchemas');

class MemoryAgent {
  constructor() {
    this.name = 'Memory / Context Agent';
    this.role = 'Personal Context Retrieval & Preference Injection';
  }

  async getContextForUser(userId) {
    const startTime = Date.now();
    logger.info(`🤖 [${this.name}] Fetching active user memories for user ${userId}...`);

    try {
      const memories = await db.getMemoriesByUserId(userId);
      const activeMemories = (memories || []).filter(m => m.is_active !== false);

      const profile = await db.getProfileByUserId(userId);

      const contextItems = activeMemories.map(m => ({
        key: m.key_tag || 'preference',
        content: m.content
      }));

      if (profile && profile.preferred_study_time) {
        contextItems.push({
          key: 'preferred_study_time',
          content: `Preferred daily working/study window: ${profile.preferred_study_time}`
        });
      }

      if (profile && profile.preferences && profile.preferences.maxHoursPerDay) {
        contextItems.push({
          key: 'max_daily_hours',
          content: `Maximum daily availability limit: ${profile.preferences.maxHoursPerDay} hours/day`
        });
      }

      const validatedOutput = memoryOutputSchema.parse({
        relevantMemories: contextItems
      });

      const executionTimeMs = Date.now() - startTime;
      logger.info(`✅ [${this.name}] Retrieved ${validatedOutput.relevantMemories.length} relevant memory items in ${executionTimeMs}ms.`);

      return {
        success: true,
        data: validatedOutput,
        executionTimeMs,
        status: 'COMPLETED'
      };
    } catch (err) {
      const executionTimeMs = Date.now() - startTime;
      logger.error(`❌ [${this.name}] Failed: ${err.message}`);
      return {
        success: true,
        data: { relevantMemories: [] },
        executionTimeMs,
        status: 'COMPLETED'
      };
    }
  }
}

module.exports = new MemoryAgent();
