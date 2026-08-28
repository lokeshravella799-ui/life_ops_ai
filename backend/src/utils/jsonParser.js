/**
 * Safe JSON Parser & Extractor for LLM Outputs
 * Parses pure JSON, markdown fenced JSON, and JSON surrounded by commentary without using eval().
 */
function extractAndParseJSON(rawText) {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    const error = new Error('Empty or invalid AI output string received');
    error.code = 'GEMINI_INVALID_RESPONSE';
    throw error;
  }

  const trimmed = rawText.trim();

  // 1. Direct JSON Parse attempt
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    // Continue to extraction
  }

  // 2. Extract from markdown code fence ```json ... ``` or ``` ... ```
  const fenceRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const fenceMatch = trimmed.match(fenceRegex);
  if (fenceMatch && fenceMatch[1]) {
    try {
      return JSON.parse(fenceMatch[1].trim());
    } catch (e) {
      // Continue to bracket extraction on the fence content or whole string
    }
  }

  // 3. Extract outermost JSON object { ... } or array [ ... ]
  const textToScan = fenceMatch && fenceMatch[1] ? fenceMatch[1] : trimmed;
  const firstBrace = textToScan.indexOf('{');
  const firstBracket = textToScan.indexOf('[');

  let startIdx = -1;
  let endIdx = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endIdx = textToScan.lastIndexOf('}');
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endIdx = textToScan.lastIndexOf(']');
  }

  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    const candidate = textToScan.substring(startIdx, endIdx + 1);
    try {
      return JSON.parse(candidate);
    } catch (e) {
      // Sanitize common LLM formatting quirks (smart quotes, trailing commas before closing braces/brackets)
      const sanitized = candidate
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/,\s*([\}\]])/g, '$1');
      try {
        return JSON.parse(sanitized);
      } catch (err2) {
        const error = new Error(`Failed to parse candidate JSON structure: ${err2.message}`);
        error.code = 'GEMINI_INVALID_RESPONSE';
        throw error;
      }
    }
  }

  const error = new Error('No valid JSON object or array structure found in AI response');
  error.code = 'GEMINI_INVALID_RESPONSE';
  throw error;
}

module.exports = {
  extractAndParseJSON
};
