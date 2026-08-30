const Groq = require('groq-sdk');
const env = require('./env');

const isTest = () => {
  return process.env.NODE_ENV === 'test' || process.argv.some(arg => arg.includes('--test') || arg.endsWith('.test.js'));
};

function getApiKey() {
  if (isTest()) return null;
  return process.env.GROQ_API_KEY || env.GROQ_API_KEY;
}

function getGroqClient() {
  if (isTest()) {
    return null;
  }
  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }
  return new Groq({ apiKey });
}

module.exports = {
  getGroqClient,
  get isGroqConfigured() {
    return !isTest() && Boolean(getApiKey());
  }
};
