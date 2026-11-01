"use strict";

const crypto = require("crypto");

// Render instances do not share their local filesystems. Store each recovery
// record as its own Redis key so GETDEL atomically guarantees one-time claims.
function createRedisUpdateScoreRecovery(client, namespace) {
  if (!client || typeof client.set !== "function" || typeof client.getDel !== "function") {
    throw new TypeError("A connected Redis client with SET and GETDEL support is required.");
  }
  const prefix = "ranar:score-recovery:" + String(namespace || "default") + ":";

  function storageKey(identityKey) {
    const digest = crypto.createHash("sha256").update(String(identityKey)).digest("hex");
    return prefix + digest;
  }

  async function capture(records, expiresAt) {
    const expiry = Number(expiresAt);
    const ttl = Math.ceil((expiry - Date.now()) / 1000);
    if (!Number.isFinite(expiry) || ttl <= 0) return false;
    const writes = [];
    for (const record of Array.isArray(records) ? records : []) {
      if (!record || typeof record.key !== "string" || !record.key) continue;
      const score = Number(record.score);
      if (!Number.isFinite(score) || score < 0) continue;
      const payload = JSON.stringify({
        score,
        name: typeof record.name === "string" ? record.name : "",
        expiresAt: expiry,
      });
      writes.push(client.set(storageKey(record.key), payload, { EX: ttl }));
    }
    await Promise.all(writes);
    return true;
  }

  async function consume(identityKey) {
    if (typeof identityKey !== "string" || !identityKey) return null;
    const raw = await client.getDel(storageKey(identityKey));
    if (!raw) return null;
    try {
      const entry = JSON.parse(raw);
      const score = Number(entry && entry.score);
      const expiresAt = Number(entry && entry.expiresAt);
      if (!Number.isFinite(score) || score < 0 || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;
      return { score, name: typeof entry.name === "string" ? entry.name : "", expiresAt };
    } catch (_) {
      return null;
    }
  }

  return {
    async load() { return 0; },
    capture,
    consume,
    async prune() { return false; },
    nextExpiry() { return null; },
    async clear() {
      let cursor = "0";
      do {
        const result = await client.scan(cursor, { MATCH: prefix + "*", COUNT: 100 });
        cursor = result.cursor;
        if (result.keys.length) await client.del(result.keys);
      } while (String(cursor) !== "0");
    },
    get size() { return 0; },
  };
}

module.exports = { createRedisUpdateScoreRecovery };
