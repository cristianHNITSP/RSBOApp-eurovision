/**
 * Redis cache service for inventory-service.
 *
 * Connects on import if REDIS_URL is set; otherwise all methods are safe no-ops.
 * Provides: get/set/del/invalidatePattern + cacheMiddleware for Express routes.
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
      if (times > 5) return null; // stop retrying
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
} else {
  console.log(`ℹ️  ${!Redis ? 'ioredis not installed' : 'REDIS_URL not set'} — cache disabled (all ops are no-ops)`);
}

/* ─── Core helpers ────────────────────────────────────────── */

/**
 * Get a cached JSON value.
 * @param {string} key
 * @returns {Promise<any|null>}
 */
async function cacheGet(key) {
  if (!ready) return null;
  try {
    const raw = await client.get(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/**
 * Set a JSON value with TTL (seconds).
 * @param {string} key
 * @param {any} value
 * @param {number} ttl  — seconds (default 60)
 */
async function cacheSet(key, value, ttl = 60) {
  if (!ready) return;
  try {
    await client.set(key, JSON.stringify(value), "EX", ttl);
  } catch { /* non-critical */ }
}

/**
 * Delete a specific key.
 * @param {string} key
 */
async function cacheDel(key) {
  if (!ready) return;
  try { await client.del(key); } catch { /* */ }
}

/**
 * Invalidate all keys matching a glob pattern (e.g. "inv:sheet:abc123:*").
 * Uses SCAN for safety (no KEYS in production).
 * @param {string} pattern  — Redis glob pattern
 */
async function invalidatePattern(pattern) {
  if (!ready) return;
  try {
    let cursor = "0";
    do {
      const [next, keys] = await client.scan(cursor, "MATCH", pattern, "COUNT", 100);
      cursor = next;
      if (keys.length) await client.del(...keys);
    } while (cursor !== "0");
  } catch { /* non-critical */ }
}

/* ─── Express middleware ──────────────────────────────────── */

/**
 * Cache middleware for GET routes.
 * @param {Function} keyFn  — (req) => string  — builds the cache key from the request
 * @param {number} ttl      — seconds (default 30)
 */
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
    } catch { /* fall through */ }

    // Monkey-patch res.json to intercept the response and cache it
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      // Only cache successful responses
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cacheSet(key, body, ttl).catch(() => {});
      }
      res.set("X-Cache", "MISS");
      return originalJson(body);
    };
    next();
  };
}

/* ─── Convenience key builders ────────────────────────────── */

const KEYS = {
  /** Dashboard stats */
  stats: () => "inv:stats:dashboard",
  /** Sheet items by id + query params */
  sheetItems: (sheetId, query) => {
    const qs = Object.entries(query || {}).sort().map(([k,v]) => `${k}=${v}`).join("&");
    return `inv:sheet:${sheetId}:items:${qs}`;
  },
  /** Sheet metadata */
  sheetMeta: (sheetId) => `inv:sheet:${sheetId}:meta`,
  /** All sheets list for a given route prefix */
  sheetsList: (prefix) => `inv:${prefix}:sheets`,
  /** Pattern to invalidate all cache for a sheet */
  sheetPattern: (sheetId) => `inv:sheet:${sheetId}:*`,
  /** Pattern to invalidate all inventory cache */
  allPattern: () => "inv:*",
};

module.exports = {
  cacheGet,
  cacheSet,
  cacheDel,
  invalidatePattern,
  cacheMiddleware,
  KEYS,
  /** Expose client for advanced usage (e.g. pub/sub) */
  getClient: () => client,
  isReady: () => ready,
};
