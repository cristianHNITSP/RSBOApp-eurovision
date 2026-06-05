require("dotenv").config();
/**
 * Centralized Configuration for Gateway
 * Validates all microservice URLs at startup.
 */

const requiredEnv = [
  'AUTH_SERVICE_URL',
  'USERS_SERVICE_URL',
  'INVENTORY_SERVICE_URL',
  'NOTIFICATION_SERVICE_URL',
  'BACKORDER_SERVICE_URL'
];

const missing = requiredEnv.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`\x1b[31m[CONFIG ERROR] Missing required microservice URLs in Gateway: ${missing.join(', ')}\x1b[0m`);
  process.exit(1);
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  services: {
    auth: process.env.AUTH_SERVICE_URL,
    users: process.env.USERS_SERVICE_URL,
    inventory: process.env.INVENTORY_SERVICE_URL,
    notification: process.env.NOTIFICATION_SERVICE_URL,
    backorder: process.env.BACKORDER_SERVICE_URL,
  },
  cors: {
    origins: [
      ...(process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean),
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://192.168.0.87:5173'
    ],
  }
};
