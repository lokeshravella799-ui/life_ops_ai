const { GoogleGenerativeAI } = require('@google/generative-ai');
const env = require('./env');

let genAI = null;

function initializeGemini() {
  if (!genAI && env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    console.log(`✅ Google Gemini API client initialized with default model: ${env.GEMINI_MODEL}`);
  }
  return genAI;
}

const isTest = process.env.NODE_ENV === 'test' || process.argv.some(arg => arg.includes('test'));

function getGeminiModel(customModelName) {
  if (isTest) return null;
  const apiKey = ('GEMINI_API_KEY' in process.env) ? process.env.GEMINI_API_KEY : env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  const client = new GoogleGenerativeAI(apiKey);
  const modelToUse = customModelName || env.GEMINI_MODEL || 'gemini-1.5-flash';
  return client.getGenerativeModel({ model: modelToUse });
}

module.exports = {
  initializeGemini,
  getGeminiModel,
  isGeminiConfigured: !isTest && Boolean(('GEMINI_API_KEY' in process.env) ? process.env.GEMINI_API_KEY : env.GEMINI_API_KEY)
};
