/**
 * Redis cache service for inventory-service.
 */
let Redis;
try { Redis = require("ioredis"); } catch { Redis = null; }

let client = null;
let ready = false;

const REDIS_URL = process.env.REDIS_URL || "";

if (REDIS_URL && Redis) {
  client = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
      if (times > 5) return null;
      return Math.min(times * 200, 2000);
    },
    lazyConnect: false,
  });

  client.on("connect", () => {
    ready = true;
    console.log("✅ Redis connected");
  });
  client.on("error", (err) => {
    ready = false;
    console.warn("[Redis] connection error:", err.message);
  });
  client.on("close", () => { ready = false; });
}

async function cacheGet(key) {
  if (!ready) return null;
  try {
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function cacheSet(key, value, ttl = 60) {
  if (!ready) return;
  try {
    await client.set(key, JSON.stringify(value), "EX", ttl);
  } catch { }
}

async function cacheDel(key) {
  if (!ready) return;
  try { await client.del(key); } catch { }
}

async function invalidatePattern(pattern) {
  if (!ready) return;
  try {
    const keys = await client.keys(pattern);
    if (keys && keys.length > 0) {
      await client.del(...keys);
    }
  } catch (err) {
    console.warn("[Redis] invalidatePattern error:", err.message);
  }
}

function cacheMiddleware(keyFn, ttl = 30) {
  return async (req, res, next) => {
    if (!ready) return next();
    const key = typeof keyFn === "function" ? keyFn(req) : keyFn;
    try {
      const cached = await cacheGet(key);
      if (cached !== null) {
        res.set("X-Cache", "HIT");
        return res.json(cached);
      }
    } catch { }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheSet(key, body, ttl).catch(() => {});
      }
      res.set("X-Cache", "MISS");
      return originalJson(body);
    };
    next();
  };
}

const KEYS = {
  stats: () => "inv:stats:dashboard",
  sheetItems: (sheetId, query) => {
    const qs = Object.entries(query || {}).sort().map(([k,v]) => `${k}=${v}`).join("&");
    return `inv:sheet:${sheetId}:items:${qs}`;
  },
  sheetMeta: (sheetId) => `inv:sheet:${sheetId}:meta`,
  sheetsList: (prefix) => `inv:${prefix}:sheets`,
  sheetPattern: (sheetId) => `inv:sheet:${sheetId}:*`,
  allPattern: () => "inv:*",
};

module.exports = {
  cacheGet,
  cacheSet,
  cacheDel,
  invalidatePattern,
  cacheMiddleware,
  KEYS,
  getClient: () => client,
  isReady: () => ready,
};
