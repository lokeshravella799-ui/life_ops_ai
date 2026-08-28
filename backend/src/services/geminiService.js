const { getGeminiModel, isGeminiConfigured } = require('../config/gemini');
const { getGroqClient, isGroqConfigured } = require('../config/groq');
const { extractAndParseJSON } = require('../utils/jsonParser');
const logger = require('../utils/logger');
const env = require('../config/env');

class GeminiError extends Error {
  constructor(message, code = 'AI_ERROR', details = null) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.details = details;
  }
}

class GeminiService {
  constructor(customModelClient = null) {
    this.customModelClient = customModelClient;
  }

  setMockClient(client) {
    this.customModelClient = client;
  }

  clearMockClient() {
    this.customModelClient = null;
  }

  /**
   * Helper to sanitize error logs to prevent leaking secrets/keys
   */
  sanitizeError(error) {
    if (!error) return 'Unknown error';
    let msg = error.message || String(error);
    msg = msg.replace(/(key|token|secret|authorization)=([^\s&]+)/gi, '$1=[REDACTED]');
    msg = msg.replace(/gsk_[0-9A-Za-z-_]{30,60}/g, '[REDACTED_GROQ_KEY]');
    msg = msg.replace(/AIza[0-9A-Za-z-_]{30,40}/g, '[REDACTED_GEMINI_KEY]');
    return msg;
  }

  /**
   * Classifies error types for structured handling
   */
  classifyError(err) {
    const msg = (err.message || '').toLowerCase();
    if (msg.includes('api key') || msg.includes('api_key') || msg.includes('unauthorized') || msg.includes('401') || msg.includes('403')) {
      return 'GEMINI_AUTH_ERROR';
    }
    if (msg.includes('quota') || msg.includes('rate limit') || msg.includes('429') || msg.includes('resource_exhausted')) {
      return 'GEMINI_RATE_LIMIT';
    }
    if (msg.includes('json') || msg.includes('parse') || msg.includes('syntax') || msg.includes('validation') || msg.includes('repair')) {
      return 'GEMINI_SCHEMA_VALIDATION_FAILED';
    }
    if (msg.includes('timeout') || msg.includes('deadline')) {
      return 'GEMINI_TIMEOUT_ERROR';
    }
    if (msg.includes('not configured')) {
      return 'GEMINI_CONFIG_ERROR';
    }
    if (err.code) {
      return err.code;
    }
    return 'GEMINI_UNKNOWN_ERROR';
  }

  /**
   * Generate validated structured output from Groq or Google Gemini
   */
  async generateStructuredResponse({
    systemInstruction,
    prompt,
    schema,
    schemaName = 'StructuredOutput',
    modelName,
    maxRetries = 1,
    temperature = 0.2,
    fallbackGenerator = null
  }) {
    const startTime = Date.now();

    // Determine active provider (Groq prioritized, Gemini fallback)
    const groqClient = this.customModelClient ? null : getGroqClient();
    const geminiModel = this.customModelClient || getGeminiModel(modelName);

    const hasGroq = Boolean(groqClient);
    const hasGemini = Boolean(geminiModel);

    const activeProvider = this.customModelClient ? 'MOCK' : (hasGroq ? 'GROQ' : (hasGemini ? 'GEMINI' : 'NONE'));
    const effectiveModel = hasGroq ? (modelName || env.GROQ_MODEL || 'qwen/qwen3.6-27b') : (modelName || env.GEMINI_MODEL || 'gemini-1.5-flash');

    console.log(`[DIAGNOSTIC] Calling AI Service for: ${schemaName}`);
    console.log(`[DIAGNOSTIC] Active Provider: ${activeProvider} | Model: ${effectiveModel}`);

    if (activeProvider === 'NONE') {
      console.log(`[DIAGNOSTIC] Neither GROQ_API_KEY nor GEMINI_API_KEY is configured -> using dynamic domain fallback generator for ${schemaName}.`);
      if (fallbackGenerator) {
        return fallbackGenerator();
      }
      throw new GeminiError(
        'Neither Groq nor Gemini API key is configured in backend environment variables.',
        'GEMINI_CONFIG_ERROR'
      );
    }

    const fullPrompt = `${systemInstruction ? `SYSTEM INSTRUCTION:\n${systemInstruction}\n\n` : ''}CRITICAL REQUIREMENT: You MUST respond ONLY with a single, valid, parsable JSON object conforming strictly to the requested schema. Do NOT include conversational text, preamble, markdown headings, or commentary outside the JSON.\n\nUSER PROMPT:\n${prompt}`;

    let lastError = null;
    let attempt = 0;

    while (attempt <= maxRetries) {
      attempt++;
      try {
        logger.info(`🤖 [AIService] Executing request for ${schemaName} via ${activeProvider} (Attempt ${attempt}/${maxRetries + 1})...`);

        let rawText = '';

        if (this.customModelClient) {
          const result = await this.customModelClient.generateContent({
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            generationConfig: { temperature }
          });
          const response = await result.response;
          rawText = response.text();
        } else if (hasGroq && groqClient) {
          const groqModels = [effectiveModel, 'groq/compound-mini', 'openai/gpt-oss-20b', 'qwen/qwen3.6-27b'].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i);
          let groqSuccess = false;
          let groqErr = null;

          for (const m of groqModels) {
            try {
              const completion = await groqClient.chat.completions.create({
                model: m,
                messages: [
                  {
                    role: 'system',
                    content: `${systemInstruction ? `${systemInstruction}\n\n` : ''}You MUST respond STRICTLY with a single, valid, parsable JSON object matching the requested schema. No markdown formatting or text outside the JSON.`
                  },
                  {
                    role: 'user',
                    content: prompt
                  }
                ],
                response_format: { type: 'json_object' },
                temperature
              });
              rawText = completion.choices[0]?.message?.content || '{}';
              groqSuccess = true;
              break;
            } catch (mErr) {
              groqErr = mErr;
              logger.warn(`⚠️ [AIService] Groq model ${m} failed (${mErr.message}). Trying next fallback model...`);
            }
          }
          if (!groqSuccess && groqErr) {
            throw groqErr;
          }
        } else if (geminiModel) {
          const result = await geminiModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
            generationConfig: { temperature }
          });
          const response = await result.response;
          rawText = response.text();
        }

        // 1. Extract and Parse JSON
        let parsedJson;
        try {
          parsedJson = extractAndParseJSON(rawText);
        } catch (parseErr) {
          logger.warn(`⚠️ [AIService] Initial JSON parse failed. Initiating 1-shot JSON repair flow...`);
          parsedJson = await this.repairStructuredResponse({
            groqClient,
            geminiModel: this.customModelClient || geminiModel,
            effectiveModel,
            hasGroq,
            malformedText: rawText,
            schemaName,
            schema
          });
        }

        // 2. Validate with Zod Schema if provided
        if (schema) {
          try {
            const validated = schema.parse(parsedJson);
            const durationMs = Date.now() - startTime;
            logger.info(`✅ [AIService] ${schemaName} validated successfully via ${activeProvider} in ${durationMs}ms.`);
            return validated;
          } catch (zodErr) {
            logger.warn(`⚠️ [AIService] Zod validation failed for ${schemaName}. Attempting repair...`);
            const repaired = await this.repairStructuredResponse({
              groqClient,
              geminiModel: this.customModelClient || geminiModel,
              effectiveModel,
              hasGroq,
              malformedText: JSON.stringify(parsedJson),
              schemaName,
              schema,
              validationErrors: zodErr.errors
            });
            const durationMs = Date.now() - startTime;
            logger.info(`✅ [AIService] Repaired ${schemaName} validated in ${durationMs}ms.`);
            return repaired;
          }
        }

        return parsedJson;
      } catch (err) {
        lastError = err;
        console.error('[DIAGNOSTIC ERROR IN AI CALL]', err.message, err.status, err.stack);
        const classifiedCode = this.classifyError(err);

        // If it's a schema validation or auth error and maxRetries reached, fallback or fail
        if (classifiedCode === 'GEMINI_CONFIG_ERROR' || classifiedCode === 'GEMINI_AUTH_ERROR' || classifiedCode === 'GEMINI_SCHEMA_VALIDATION_FAILED') {
          if (attempt > maxRetries) {
            if (fallbackGenerator) {
              logger.warn(`⚠️ [AIService] Request failed with ${classifiedCode}. Returning fallbackGenerator.`);
              return fallbackGenerator();
            }
            throw new GeminiError(
              this.sanitizeError(err),
              classifiedCode
            );
          }
        }

        // Retry with backoff if attempts remaining
        if (attempt <= maxRetries) {
          const backoffDelay = attempt * 500;
          logger.warn(`⚠️ [AIService] Request failed with ${classifiedCode}. Retrying in ${backoffDelay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        }
      }
    }

    // All retries exhausted
    if (fallbackGenerator) {
      logger.warn(`⚠️ [AIService] All API attempts exhausted for ${schemaName}. Using domain fallback.`);
      return fallbackGenerator();
    }

    throw new GeminiError(
      `AI Structured Generation failed after ${maxRetries + 1} attempts: ${this.sanitizeError(lastError)}`,
      this.classifyError(lastError)
    );
  }

  /**
   * 1-Shot Self-Healing Repair Flow for malformed JSON or Zod validation errors
   */
  async repairStructuredResponse({ groqClient, geminiModel, effectiveModel, hasGroq, malformedText, schemaName, schema, validationErrors = null }) {
    logger.info(`🔧 [AIService] Running 1-shot JSON repair for ${schemaName}...`);

    const repairPrompt = `The previous response failed schema validation or contained malformed JSON.
SCHEMA NAME: ${schemaName}
VALIDATION ERRORS: ${validationErrors ? JSON.stringify(validationErrors) : 'Malformed JSON syntax'}
PREVIOUS MALFORMED TEXT:
${malformedText}

INSTRUCTION: Fix all syntax errors and schema mismatches. Return strictly valid JSON conforming to the schema. Output JSON ONLY.`;

    try {
      let repairedText = '';
      if (hasGroq && groqClient) {
        const completion = await groqClient.chat.completions.create({
          model: effectiveModel,
          messages: [{ role: 'user', content: repairPrompt }],
          response_format: { type: 'json_object' },
          temperature: 0.1
        });
        repairedText = completion.choices[0]?.message?.content || '{}';
      } else if (geminiModel) {
        const repairResult = await geminiModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: repairPrompt }] }],
          generationConfig: { temperature: 0.1 }
        });
        const repairResponse = await repairResult.response;
        repairedText = repairResponse.text();
      }

      const repairedJson = extractAndParseJSON(repairedText);

      if (schema) {
        return schema.parse(repairedJson);
      }
      return repairedJson;
    } catch (repairErr) {
      logger.error(`❌ [AIService] 1-shot repair failed for ${schemaName}: ${this.sanitizeError(repairErr)}`);
      throw new GeminiError(
        `Failed to repair malformed AI response for ${schemaName}: ${this.sanitizeError(repairErr)}`,
        'GEMINI_SCHEMA_VALIDATION_FAILED',
        { originalText: malformedText.slice(0, 300) }
      );
    }
  }

  /**
   * Universal Structured Output Alias
   */
  async generateStructuredOutput(params) {
    return this.generateStructuredResponse({
      ...params,
      schemaName: params.schemaName || params.agentName || 'StructuredOutput'
    });
  }
}

const defaultInstance = new GeminiService();
defaultInstance.GeminiService = GeminiService;
defaultInstance.GeminiError = GeminiError;

module.exports = defaultInstance;
module.exports.GeminiService = GeminiService;
module.exports.GeminiError = GeminiError;
