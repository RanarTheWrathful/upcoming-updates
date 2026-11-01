"use strict";

const assert = require("assert");
const { createRedisUpdateScoreRecovery } = require("../lib/serverLifecycle/redisScoreRecovery");

class FakeRedis {
  constructor() { this.values = new Map(); }
  async set(key, value, options) {
    this.values.set(key, { value, expiresAt: Date.now() + options.EX * 1000 });
    return "OK";
  }
  async getDel(key) {
    const entry = this.values.get(key);
    this.values.delete(key);
    if (!entry || entry.expiresAt <= Date.now()) return null;
    return entry.value;
  }
  async scan(cursor, options) {
    const keys = Array.from(this.values.keys()).filter((key) => key.startsWith(options.MATCH.slice(0, -1)));
    return { cursor: "0", keys };
  }
  async del(keys) { for (const key of keys) this.values.delete(key); }
}

(async () => {
  const redis = new FakeRedis();
  const store = createRedisUpdateScoreRecovery(redis, "service-test");
  const identity = "203.0.113.10\u0000Example";
  assert.strictEqual(await store.load(), 0);
  assert.strictEqual(await store.capture([
    { key: identity, ip: "203.0.113.10", name: "Example", score: 125000 },
  ], Date.now() + 300000), true);
  const restored = await store.consume(identity);
  assert.strictEqual(restored.score, 125000);
  assert.strictEqual(await store.consume(identity), null, "Redis GETDEL must make recovery single-use");

  const secondIdentity = "203.0.113.11\u0000Other";
  await store.capture([{ key: secondIdentity, score: 50000 }], Date.now() + 300000);
  const isolated = createRedisUpdateScoreRecovery(redis, "another-service");
  assert.strictEqual(await isolated.consume(secondIdentity), null, "service namespaces must be isolated");
  assert.strictEqual((await store.consume(secondIdentity)).score, 50000);

  console.log("Redis score recovery tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
