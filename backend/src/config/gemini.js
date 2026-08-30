const { GoogleGenerativeAI } = require('@google/generative-ai');
const env = require('./env');

let genAI = null;

const isTest = () => {
  return process.env.NODE_ENV === 'test' || process.argv.some(arg => arg.includes('--test') || arg.endsWith('.test.js'));
};

function initializeGemini() {
  const apiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
  if (!genAI && apiKey) {
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

function getGeminiModel(customModelName) {
  if (isTest()) return null;
  const apiKey = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
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
  get isGeminiConfigured() {
    return !isTest() && Boolean(process.env.GEMINI_API_KEY || env.GEMINI_API_KEY);
  }
};
