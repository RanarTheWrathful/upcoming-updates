"use strict";

const assert = require("assert");
const modeVoting = require("../lib/modeVoting");

const modes = ["Open Execution", "Maze Execution", "Siege"];

assert.strictEqual(
  modeVoting.resolveModeName("  mAZe   EXECUTION ", modes),
  "Maze Execution",
  "mode matching ignores case and repeated whitespace"
);

assert.strictEqual(
  modeVoting.chooseMode(["unknown mode", "Siege", "siege", "Open Execution"], modes, (choices) => choices[0]),
  "Siege",
  "stale saved votes are ignored and valid votes determine the winner"
);

assert.strictEqual(
  modeVoting.chooseMode(["deleted mode"], modes, (choices) => choices[1]),
  "Maze Execution",
  "no valid saved votes fall back to a random allowed mode"
);

assert.strictEqual(
  modeVoting.chooseMode(["Siege", "Open Execution"], modes, (choices) => choices[choices.length - 1]),
  "Siege",
  "ties are resolved through the supplied random-choice function"
);

{
  const votes = [];
  const voters = [];
  const first = modeVoting.registerVote({
    voteText: "siege",
    allowedModes: modes,
    voterId: "127.0.0.1",
    voterList: voters,
    votes,
    weight: 1,
  });
  assert.deepStrictEqual(first, { ok: true, mode: "Siege", weight: 1 });
  assert.deepStrictEqual(votes, ["Siege"]);
  assert.deepStrictEqual(voters, ["127.0.0.1"]);

  const duplicate = modeVoting.registerVote({
    voteText: "Open Execution",
    allowedModes: modes,
    voterId: "127.0.0.1",
    voterList: voters,
    votes,
  });
  assert.strictEqual(duplicate.reason, "already-voted");
  assert.deepStrictEqual(votes, ["Siege"], "duplicate votes do not alter the tally");

  const invalid = modeVoting.registerVote({
    voteText: "made up mode",
    allowedModes: modes,
    voterId: "127.0.0.2",
    voterList: voters,
    votes,
  });
  assert.strictEqual(invalid.reason, "invalid-mode");
  assert(!voters.includes("127.0.0.2"), "invalid votes do not consume a voter slot");
}

{
  const votes = [];
  const voters = [];
  const result = modeVoting.registerVote({
    voteText: "Open Execution",
    allowedModes: modes,
    voterId: "dev",
    voterList: voters,
    votes,
    weight: 100,
  });
  assert.strictEqual(result.weight, 100);
  assert.strictEqual(votes.length, 100, "developer vote weighting remains capped at 100");
  assert(votes.every((vote) => vote === "Open Execution"));
}

console.log("Mode voting tests passed");
