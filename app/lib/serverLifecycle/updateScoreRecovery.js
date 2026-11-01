"use strict";

const fs = require("fs");
const path = require("path");

function createUpdateScoreRecovery(filePath, nowProvider = Date.now) {
  const entries = new Map();

  function persist() {
    const directory = path.dirname(filePath);
    const temporaryPath = filePath + ".tmp";
    if (entries.size === 0) {
      try { fs.unlinkSync(filePath); } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      try { fs.unlinkSync(temporaryPath); } catch (error) {
        if (error.code !== "ENOENT") throw error;
      }
      return;
    }

    const values = Array.from(entries.values());
    const expiresAt = values.reduce((minimum, entry) => Math.min(minimum, entry.expiresAt), Infinity);
    const payload = JSON.stringify({ version: 1, expiresAt, entries: values }, null, 2);
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(temporaryPath, payload);
    fs.renameSync(temporaryPath, filePath);
  }

  function prune(persistChanges = true) {
    const now = nowProvider();
    let changed = false;
    for (const [key, entry] of entries) {
      if (!entry || !Number.isFinite(entry.expiresAt) || entry.expiresAt <= now) {
        entries.delete(key);
        changed = true;
      }
    }
    if (changed && persistChanges) persist();
    return changed;
  }

  function load() {
    entries.clear();
    let data;
    try {
      data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") {
        try { fs.unlinkSync(filePath); } catch (_) {}
      }
      return 0;
    }

    const fallbackExpiry = Number(data && data.expiresAt);
    const savedEntries = Array.isArray(data && data.entries) ? data.entries : [];
    const now = nowProvider();
    for (const entry of savedEntries) {
      if (!entry || typeof entry.key !== "string" || !entry.key) continue;
      const score = Number(entry.score);
      const expiresAt = Number(entry.expiresAt) || fallbackExpiry;
      if (!Number.isFinite(score) || score < 0 || !Number.isFinite(expiresAt) || expiresAt <= now) continue;
      entries.set(entry.key, {
        key: entry.key,
        ip: typeof entry.ip === "string" ? entry.ip : "",
        name: typeof entry.name === "string" ? entry.name : "",
        score,
        expiresAt,
      });
    }
    if (entries.size !== savedEntries.length) persist();
    return entries.size;
  }

  function capture(records, expiresAt) {
    const expiry = Number(expiresAt);
    if (!Number.isFinite(expiry) || expiry <= nowProvider()) return false;
    prune(false);

    // An additional update gives unclaimed records a fresh five-minute window.
    for (const entry of entries.values()) entry.expiresAt = expiry;

    for (const record of Array.isArray(records) ? records : []) {
      if (!record || typeof record.key !== "string" || !record.key) continue;
      const score = Number(record.score);
      if (!Number.isFinite(score) || score < 0) continue;
      const previous = entries.get(record.key);
      entries.set(record.key, {
        key: record.key,
        ip: typeof record.ip === "string" ? record.ip : previous ? previous.ip : "",
        name: typeof record.name === "string" ? record.name : previous ? previous.name : "",
        score: Math.max(score, previous ? previous.score : 0),
        expiresAt: expiry,
      });
    }
    persist();
    return true;
  }

  function consume(key) {
    prune(false);
    if (typeof key !== "string" || !key) return null;
    const entry = entries.get(key);
    if (!entry) return null;
    entries.delete(key);
    persist();
    return { ...entry };
  }

  function nextExpiry() {
    prune();
    let next = Infinity;
    for (const entry of entries.values()) next = Math.min(next, entry.expiresAt);
    return Number.isFinite(next) ? next : null;
  }

  function clear() {
    entries.clear();
    persist();
  }

  return { load, capture, consume, prune, nextExpiry, clear, get size() { return entries.size; } };
}

module.exports = { createUpdateScoreRecovery };
