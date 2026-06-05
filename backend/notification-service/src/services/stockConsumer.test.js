"use strict";

const RedisMock = require("ioredis-mock");
const { spamTtlSeconds, acquireSpamSlot, releaseSpamSlot } = require("./stockConsumer");

describe("spamTtlSeconds — 1h laboral (08–20h), 6h muertas", () => {
  const at = (h) => new Date(2026, 0, 1, h, 0, 0);
  test("horario laboral → 3600s", () => {
    expect(spamTtlSeconds(at(8))).toBe(3600);
    expect(spamTtlSeconds(at(13))).toBe(3600);
    expect(spamTtlSeconds(at(19))).toBe(3600);
  });
  test("horas muertas → 21600s (6h)", () => {
    expect(spamTtlSeconds(at(20))).toBe(21600);
    expect(spamTtlSeconds(at(2))).toBe(21600);
    expect(spamTtlSeconds(at(7))).toBe(21600);
  });
});

describe("rate-limiter de spam (SET NX EX) con ioredis-mock", () => {
  let redis;
  beforeEach(() => { redis = new RedisMock(); });

  test("1ª vez toma el slot; 2ª (dentro del TTL) no", async () => {
    expect(await acquireSpamSlot("S1", redis)).toBe(true);
    expect(await acquireSpamSlot("S1", redis)).toBe(false);
  });

  test("el slot tiene TTL (no es permanente)", async () => {
    await acquireSpamSlot("S2", redis);
    const ttl = await redis.ttl("spam:S2");
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(21600);
  });

  test("tras liberar el slot, se puede volver a tomar (modela el próximo pulso)", async () => {
    await acquireSpamSlot("S3", redis);
    await releaseSpamSlot("S3", redis);
    expect(await acquireSpamSlot("S3", redis)).toBe(true);
  });
});
