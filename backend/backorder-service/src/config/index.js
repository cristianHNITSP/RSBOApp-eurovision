require("dotenv").config();
/**
 * Centralized Configuration for Backorder Service
 */

const requiredEnv = [
  'MONGO_URI',
  'GATEWAY_WS_URL',
  'INTERNAL_SERVICE_TOKEN',
  'NOTIFICATION_SERVICE_URL'
];

const missing = requiredEnv.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`\x1b[31m[CONFIG ERROR] Missing required environment variables in Backorder Service: ${missing.join(', ')}\x1b[0m`);
  process.exit(1);
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  host: process.env.SERVICE_HOST || '0.0.0.0',
  mongo: {
    uri: process.env.MONGO_URI,
  },
  gateway: {
    wsUrl: process.env.GATEWAY_WS_URL,
  },
  notification: {
    url: process.env.NOTIFICATION_SERVICE_URL,
  },
  auth: {
    internalToken: process.env.INTERNAL_SERVICE_TOKEN,
  },
  cors: {
    origins: (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean),
  }
};
