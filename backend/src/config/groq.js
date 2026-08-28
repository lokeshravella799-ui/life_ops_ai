const Groq = require('groq-sdk');
const dotenv = require('dotenv');
const path = require('path');
const env = require('./env');

const isTest = process.env.NODE_ENV === 'test' || process.argv.some(arg => arg.includes('test'));

function getApiKey() {
  if (isTest) return null;
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
  return process.env.GROQ_API_KEY || env.GROQ_API_KEY;
}

function getGroqClient() {
  if (isTest) {
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
  isGroqConfigured: !isTest && Boolean(getApiKey())
};
