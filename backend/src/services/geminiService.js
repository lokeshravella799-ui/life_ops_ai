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
   * Helper to strip reasoning/thinking tags (e.g. <think>...</think>) from output
   */
  stripThinkingTags(text) {
    if (!text) return '';
    let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
    if (cleaned.includes('<think>')) {
      const parts = cleaned.split(/<\/think>/i);
      cleaned = parts.length > 1 ? parts.slice(1).join('') : cleaned.replace(/<think>[\s\S]*/gi, '');
    }
    cleaned = cleaned.trim();
    if (!cleaned && text.trim()) {
      return text.replace(/<\/?think>/gi, '').trim();
    }
    return cleaned;
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

    if (activeProvider === 'NONE') {
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
          const groqModels = [
            effectiveModel,
            'openai/gpt-oss-120b',
            'openai/gpt-oss-20b',
            'groq/compound-mini'
          ].filter((v, i, a) => Boolean(v) && a.indexOf(v) === i);

          let groqSuccess = false;
          let groqErr = null;

          for (const m of groqModels) {
            try {
              logger.info(`🤖 [AIService] Invoking Groq model "${m}"...`);
              const isReasoningModel = m.includes('qwen') || m.includes('deepseek') || m.includes('r1');
              const completionOptions = {
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
                temperature
              };

              if (!isReasoningModel) {
                completionOptions.response_format = { type: 'json_object' };
              }

              const completion = await groqClient.chat.completions.create(completionOptions);
              const content = completion.choices[0]?.message?.content?.trim();
              if (content && content.length > 2) {
                rawText = this.stripThinkingTags(content);
                if (rawText && rawText.length > 2) {
                  groqSuccess = true;
                  logger.info(`✨ [AIService] Groq model "${m}" responded successfully (${rawText.length} chars).`);
                  break;
                }
              }
            } catch (mErr) {
              groqErr = mErr;
              logger.error(`❌ [AIService] Groq model "${m}" execution error: ${this.sanitizeError(mErr)}`);
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
          rawText = this.stripThinkingTags(response.text());
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
            brokenText: rawText,
            schemaName,
            systemInstruction
          });
        }

        // 2. Validate against Zod schema
        if (schema) {
          const validation = schema.safeParse(parsedJson);
          if (!validation.success) {
            logger.warn(`⚠️ [AIService] Schema validation issues for ${schemaName}: ${JSON.stringify(validation.error.format())}`);
            const repaired = await this.repairStructuredResponse({
              groqClient,
              geminiModel: this.customModelClient || geminiModel,
              brokenText: JSON.stringify(parsedJson),
              schemaName,
              systemInstruction,
              errorContext: JSON.stringify(validation.error.issues)
            });
            if (revalidation.success) {
              parsedJson = revalidation.data;
            } else if (this.customModelClient) {
              throw new GeminiError(
                `Schema validation failed for ${schemaName}: ${JSON.stringify(validation.error.issues)}`,
                'GEMINI_SCHEMA_VALIDATION_FAILED'
              );
            } else if (fallbackGenerator) {
              logger.warn(`⚠️ [AIService] Using fallback generator for ${schemaName} after schema mismatch.`);
              return fallbackGenerator();
            } else {
              throw new GeminiError(
                `Schema validation failed for ${schemaName}: ${JSON.stringify(validation.error.issues)}`,
                'GEMINI_SCHEMA_VALIDATION_FAILED'
              );
            }
          } else {
            parsedJson = validation.data;
          }
        }

        const duration = Date.now() - startTime;
        logger.info(`✅ [AIService] ${schemaName} completed successfully in ${duration}ms.`);
        return parsedJson;
      } catch (err) {
        lastError = err;
        const classifiedCode = this.classifyError(err);
        logger.error(`❌ [AIService] Error on attempt ${attempt} for ${schemaName} [${classifiedCode}]: ${this.sanitizeError(err)}`);

        if (classifiedCode === 'GEMINI_RATE_LIMIT') {
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
    }

    // Dynamic domain fallback if all attempts and providers failed
    if (fallbackGenerator) {
      logger.warn(`⚠️ [AIService] All providers failed for ${schemaName}. Invoking domain fallback generator.`);
      return fallbackGenerator();
    }

    throw new GeminiError(
      `AI Service failed for ${schemaName}: ${this.sanitizeError(lastError)}`,
      this.classifyError(lastError),
      lastError
    );
  }

  /**
   * Helper alias for generateStructuredResponse
   */
  async generateStructuredOutput(params) {
    return this.generateStructuredResponse(params);
  }

  /**
   * 1-shot self-healing JSON repair
   */
  async repairStructuredResponse({ groqClient, geminiModel, brokenText, schemaName, systemInstruction, errorContext }) {
    const repairPrompt = `You are a JSON Repair Agent. Fix the malformed text into a single, valid JSON object for schema "${schemaName}".
${errorContext ? `Errors: ${errorContext}\n` : ''}
${systemInstruction ? `Schema Goal: ${systemInstruction}\n` : ''}

MALFORMED TEXT TO FIX:
${brokenText.slice(0, 4000)}

Respond STRICTLY with valid JSON only.`;

    try {
      if (groqClient) {
        const repairModels = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'];
        for (const rm of repairModels) {
          try {
            const completion = await groqClient.chat.completions.create({
              model: rm,
              messages: [{ role: 'user', content: repairPrompt }],
              temperature: 0.1,
              response_format: { type: 'json_object' }
            });
            const text = completion.choices[0]?.message?.content?.trim();
            if (text) {
              return extractAndParseJSON(text);
            }
          } catch {}
        }
      }

      if (geminiModel) {
        const result = await geminiModel.generateContent({
          contents: [{ role: 'user', parts: [{ text: repairPrompt }] }],
          generationConfig: { temperature: 0.1 }
        });
        const response = await result.response;
        return extractAndParseJSON(response.text());
      }
    } catch (repairErr) {
      logger.warn(`⚠️ [AIService] 1-shot repair failed: ${this.sanitizeError(repairErr)}`);
    }

    return extractAndParseJSON(brokenText);
  }
}

module.exports = new GeminiService();
module.exports.GeminiService = GeminiService;
module.exports.GeminiError = GeminiError;
