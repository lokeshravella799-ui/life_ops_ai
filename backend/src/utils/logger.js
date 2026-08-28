const logger = {
  info: (msg, meta = '') => console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, meta ? JSON.stringify(meta) : ''),
  agent: (agentName, msg, meta = '') => console.log(`🤖 [${agentName.toUpperCase()}] ${msg}`, meta ? JSON.stringify(meta) : ''),
  warn: (msg, meta = '') => console.warn(`⚠️ [WARN] ${msg}`, meta ? JSON.stringify(meta) : ''),
  error: (msg, err = '') => console.error(`❌ [ERROR] ${msg}`, err)
};

module.exports = logger;
