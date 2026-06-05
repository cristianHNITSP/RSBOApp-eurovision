require("dotenv").config();
/**
 * Centralized Configuration for Auth Service
 * Enforces strict environment variable validation.
 */

const requiredEnv = [
  'MONGO_URI',
  'JWT_SECRET',
  'AUTH_PASSWORD_PEPPER',
  'INTERNAL_SERVICE_TOKEN',
  'INVENTORY_MONGO_URI',
  'NOTIFICATION_MONGO_URI',
  'BACKORDER_MONGO_URI',
  'INITIAL_ROOT_PASSWORD'
];

const missing = requiredEnv.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`\x1b[31m[CONFIG ERROR] Missing required environment variables in Auth Service: ${missing.join(', ')}\x1b[0m`);
  process.exit(1);
}

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  host: process.env.SERVICE_HOST || '0.0.0.0',
  mongo: {
    uri: process.env.MONGO_URI,
  },
  secrets: {
    jwt: process.env.JWT_SECRET,
    pepper: process.env.AUTH_PASSWORD_PEPPER,
    internalToken: process.env.INTERNAL_SERVICE_TOKEN,
  },
  cors: {
    origins: (process.env.CORS_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean),
  },
  // Extra URIs for AdminJS cross-service resource access
  externalMongo: {
    inventory: process.env.INVENTORY_MONGO_URI,
    notification: process.env.NOTIFICATION_MONGO_URI,
    // óptica consolidada en inventory_db (ver optica.connection.js)
    optica: process.env.INVENTORY_MONGO_URI,
    backorder: process.env.BACKORDER_MONGO_URI,
  }
};
