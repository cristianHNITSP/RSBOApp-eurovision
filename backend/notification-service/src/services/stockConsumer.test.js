"use strict";

const RedisMock = require("ioredis-mock");
const { spamTtlSeconds, acquireSpamSlot, releaseSpamSlot } = require("./stockConsumer");

// Firma vigente: spamTtlSeconds(urgencyScore, date) — cadencia GRADUADA por urgencia.
//   - Crítico (≥85): 1h laboral / 3h muertas
//   - Advertencia (≥45): 4h laboral / 12h muertas
//   - Resto (aceptable): 24h (no insiste)
describe("spamTtlSeconds — cadencia graduada por urgencia + horario", () => {
  const at = (h) => new Date(2026, 0, 1, h, 0, 0);
  const LABORAL = at(13);   // 13:00 → laboral
  const MUERTA = at(2);     // 02:00 → hora muerta

  test("crítico (≥85): 1h laboral, 3h muerta", () => {
    expect(spamTtlSeconds(90, LABORAL)).toBe(3600);
    expect(spamTtlSeconds(85, LABORAL)).toBe(3600);
    expect(spamTtlSeconds(90, MUERTA)).toBe(3 * 3600);
  });

  test("advertencia (≥45): 4h laboral, 12h muerta", () => {
    expect(spamTtlSeconds(50, LABORAL)).toBe(4 * 3600);
    expect(spamTtlSeconds(45, LABORAL)).toBe(4 * 3600);
    expect(spamTtlSeconds(50, MUERTA)).toBe(12 * 3600);
  });

  test("aceptable (<45): 24h, sin distinción de horario", () => {
    expect(spamTtlSeconds(10, LABORAL)).toBe(24 * 3600);
    expect(spamTtlSeconds(0, MUERTA)).toBe(24 * 3600);
  });

  test("más urgencia ⇒ TTL menor (reaparece antes / más insistente)", () => {
    expect(spamTtlSeconds(90, LABORAL)).toBeLessThan(spamTtlSeconds(50, LABORAL));
    expect(spamTtlSeconds(50, LABORAL)).toBeLessThan(spamTtlSeconds(10, LABORAL));
  });
});

describe("rate-limiter de spam (SET NX EX) con ioredis-mock", () => {
  let redis;
  beforeEach(() => { redis = new RedisMock(); });

  test("1ª vez toma el slot; 2ª (dentro del TTL) no", async () => {
    expect(await acquireSpamSlot("S1", redis, 90)).toBe(true);
    expect(await acquireSpamSlot("S1", redis, 90)).toBe(false);
  });

  test("el slot tiene TTL acotado al máximo (24h)", async () => {
    await acquireSpamSlot("S2", redis, 90);
    const ttl = await redis.ttl("spam:S2");
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(24 * 3600);
  });

  test("tras liberar el slot, se puede volver a tomar (modela el próximo pulso)", async () => {
    await acquireSpamSlot("S3", redis, 90);
    await releaseSpamSlot("S3", redis);
    expect(await acquireSpamSlot("S3", redis, 90)).toBe(true);
  });
});
