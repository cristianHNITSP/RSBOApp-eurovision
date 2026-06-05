const config = require("../config");
let Redis;
try { Redis = require("ioredis"); } catch { Redis = null; }

let client = null;
let ready = false;

const REDIS_URL = config.redis.url;

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

// ============================================================================
// PRIMITIVAS (low-level)
// ============================================================================

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

/**
 * Borra todas las keys que matchean `pattern` SIN bloquear Redis:
 * usa SCAN (cursor, COUNT 100) + UNLINK (borrado asíncrono) por lotes.
 * Solo para paths fríos (lista/admin); el camino caliente usa versioning.
 */
async function invalidatePattern(pattern) {
  if (!ready) return;
  try {
    const stream = client.scanStream({ match: pattern, count: 100 });
    const pending = [];
    for await (const keys of stream) {
      if (keys.length) pending.push(client.unlink(...keys));
    }
    if (pending.length) await Promise.all(pending);
  } catch (err) {
    console.warn("[Redis] invalidatePattern error:", err.message);
  }
}

/** Versión actual del set de items de una planilla (default "0"). */
async function sheetVersion(sheetId) {
  if (!ready) return "0";
  try {
    return (await client.get(KEYS.sheetVersion(sheetId))) || "0";
  } catch { return "0"; }
}

// ============================================================================
// MIDDLEWARE de caché HTTP (read-through). keyFn puede ser sync o async.
// ============================================================================

function cacheMiddleware(keyFn, ttl = 30) {
  return async (req, res, next) => {
    if (!ready) return next();
    let key;
    try {
      key = typeof keyFn === "function" ? await keyFn(req) : keyFn;
    } catch { return next(); }

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

// ============================================================================
// KEYS — único lugar que conoce la forma de las keys
// ============================================================================

const KEYS = {
  stats: () => "inv:stats:dashboard",
  // Items versionados: la versión vive en sheetVersion(); al cambiar, el INCR
  // deja inaccesibles las keys viejas (mueren por TTL/LRU). Sin SCAN al escribir.
  sheetItems: (sheetId, ver, query) => {
    const qs = Object.entries(query || {}).sort().map(([k, v]) => `${k}=${v}`).join("&");
    return `inv:sheet:${sheetId}:v${ver}:items:${qs}`;
  },
  sheetVersion: (sheetId) => `inv:sheet:${sheetId}:ver`,
  sheetMeta: (sheetId) => `inv:sheet:${sheetId}:meta`,
  sheetsListPattern: () => "inv:*sheets:*",
};

// ============================================================================
// CAPA SEMÁNTICA de invalidación — los routes invalidan por INTENCIÓN.
// Estas 4 funciones son el único acoplamiento permitido a las formas de key.
// ============================================================================

/** Cambió la data (celdas) de una planilla → items frescos en el próximo cold open. O(1). */
async function invalidateSheetItems(sheetId) {
  if (!ready) return;
  try { await client.incr(KEYS.sheetVersion(sheetId)); } catch { }
}

/** Cambió la meta de una planilla (nombre, rangos, compra, etc.). */
async function invalidateSheetMeta(sheetId) {
  await cacheDel(KEYS.sheetMeta(sheetId));
}

/** Cambió la lista de planillas (crear/renombrar/papelera/restaurar). Cubre inventory + contactlenses. */
async function invalidateSheetsList() {
  await invalidatePattern(KEYS.sheetsListPattern());
}

/** El dashboard de stats quedó obsoleto (cualquier cambio de existencias o de planillas). */
async function invalidateStats() {
  await cacheDel(KEYS.stats());
}

// ============================================================================
// Lifecycle
// ============================================================================

async function close() {
  if (!client) return;
  try { await client.quit(); } catch { }
}

module.exports = {
  // primitivas
  cacheGet,
  cacheSet,
  cacheDel,
  invalidatePattern,
  sheetVersion,
  cacheMiddleware,
  KEYS,
  // capa semántica
  invalidateSheetItems,
  invalidateSheetMeta,
  invalidateSheetsList,
  invalidateStats,
  // lifecycle / introspección
  close,
  getClient: () => client,
  isReady: () => ready,
};
