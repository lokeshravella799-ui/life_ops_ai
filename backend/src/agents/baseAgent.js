const geminiService = require('../services/geminiService');
const logger = require('../utils/logger');

class BaseAgent {
  constructor(name, role) {
    this.name = name;
    this.role = role;
  }

  async run({
    prompt,
    systemInstruction,
    schema,
    schemaName,
    temperature = 0.2,
    fallbackGenerator = null
  }) {
    const startTime = Date.now();
    logger.info(`🤖 [${this.name}] Starting execution (${this.role})...`);

    try {
      const result = await geminiService.generateStructuredResponse({
        systemInstruction,
        prompt,
        schema,
        schemaName: schemaName || this.name,
        temperature,
        fallbackGenerator
      });

      const executionTimeMs = Date.now() - startTime;
      logger.info(`✅ [${this.name}] Completed successfully in ${executionTimeMs}ms.`);

      return {
        success: true,
        data: result,
        executionTimeMs,
        status: 'COMPLETED'
      };
    } catch (err) {
      const executionTimeMs = Date.now() - startTime;
      logger.error(`❌ [${this.name}] Failed in ${executionTimeMs}ms: ${err.message}`);

      // If fallback generator is available, use it gracefully
      if (fallbackGenerator) {
        logger.info(`🔄 [${this.name}] Using intelligent fallback generator.`);
        const fallbackData = fallbackGenerator();
        return {
          success: true,
          data: fallbackData,
          executionTimeMs,
          status: 'COMPLETED',
          isFallback: true
        };
      }

      return {
        success: false,
        error: err.message,
        errorCode: err.code || 'AGENT_EXECUTION_ERROR',
        executionTimeMs,
        status: 'FAILED'
      };
    }
  }
}

module.exports = BaseAgent;
