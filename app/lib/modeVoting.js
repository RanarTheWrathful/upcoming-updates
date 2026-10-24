"use strict";

function normalizeModeName(value) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US")
    : "";
}

function resolveModeName(value, allowedModes) {
  const normalized = normalizeModeName(value);
  if (!normalized || !Array.isArray(allowedModes)) return null;
  return allowedModes.find((mode) => normalizeModeName(mode) === normalized) || null;
}

function tallyVotes(votes, allowedModes) {
  const counts = new Map();
  if (Array.isArray(allowedModes)) {
    for (const mode of allowedModes) counts.set(mode, 0);
  }
  if (!Array.isArray(votes)) return counts;

  for (const vote of votes) {
    const mode = resolveModeName(vote, allowedModes);
    if (mode !== null) counts.set(mode, (counts.get(mode) || 0) + 1);
  }
  return counts;
}

function chooseMode(votes, allowedModes, randomChoice = (items) => items[Math.floor(Math.random() * items.length)]) {
  const modes = Array.isArray(allowedModes) ? allowedModes.filter((mode) => typeof mode === "string" && mode.trim()) : [];
  if (!modes.length) return null;

  const counts = tallyVotes(votes, modes);
  let highScore = 0;
  let winners = [];
  for (const mode of modes) {
    const count = counts.get(mode) || 0;
    if (count > highScore) {
      highScore = count;
      winners = [mode];
    } else if (count === highScore && count > 0) {
      winners.push(mode);
    }
  }

  // No valid votes: choose a valid mode randomly. Stale mode names are ignored.
  const candidates = highScore > 0 ? winners : modes;
  const choice = randomChoice(candidates);
  return candidates.includes(choice) ? choice : candidates[0];
}

function registerVote({ voteText, allowedModes, voterId, voterList, votes, weight = 1 }) {
  const mode = resolveModeName(voteText, allowedModes);
  if (mode === null) return { ok: false, reason: "invalid-mode" };
  if (voterId == null || String(voterId).trim() === "") {
    return { ok: false, reason: "missing-voter-id" };
  }
  if (!Array.isArray(voterList) || !Array.isArray(votes)) {
    return { ok: false, reason: "invalid-vote-state" };
  }
  const id = String(voterId);
  if (voterList.includes(id)) return { ok: false, reason: "already-voted" };

  const safeWeight = Number.isFinite(Number(weight))
    ? Math.max(1, Math.min(100, Math.floor(Number(weight))))
    : 1;
  for (let i = 0; i < safeWeight; i++) votes.push(mode);
  voterList.push(id);
  return { ok: true, mode, weight: safeWeight };
}

module.exports = {
  normalizeModeName,
  resolveModeName,
  tallyVotes,
  chooseMode,
  registerVote,
};
