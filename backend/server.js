const app = require('./src/app');
const env = require('./src/config/env');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || env.PORT || 5000;
const HOST = '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  logger.info(`🚀 LifeOps AI Backend Server running on http://${HOST}:${PORT} [${env.NODE_ENV || 'production'}]`);
  logger.info(`🔗 Health check available at /api/health`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server process terminated.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server process terminated.');
    process.exit(0);
  });
});
