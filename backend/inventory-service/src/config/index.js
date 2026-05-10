require("dotenv").config();
/**
 * Centralized Configuration for Inventory Service
 * Enforces strict environment variable validation.
 */

const requiredEnv = [
  'MONGO_URI',
  'REDIS_URL',
  'GATEWAY_WS_URL',
  'INTERNAL_SERVICE_TOKEN'
];

const missing = requiredEnv.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`\x1b[31m[CONFIG ERROR] Missing required environment variables in Inventory Service: ${missing.join(', ')}\x1b[0m`);
  process.exit(1);
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  host: process.env.SERVICE_HOST || '0.0.0.0',
  mongo: {
    uri: process.env.MONGO_URI,
  },
  redis: {
    url: process.env.REDIS_URL,
  },
  gateway: {
    wsUrl: process.env.GATEWAY_WS_URL,
  },
  auth: {
    internalToken: process.env.INTERNAL_SERVICE_TOKEN,
  },
  cors: {
    origins: (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean),
  }
};
