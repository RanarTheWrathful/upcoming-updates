"use strict";
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const serverSource = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
const start = serverSource.indexOf("const PUBLIC_COMMAND_GROUPS = [");
const end = serverSource.indexOf("\nfunction statusCopy(text) {", start);
assert.ok(start >= 0 && end > start, "command catalog and chat renderer must exist");

const prelude = `
function escapeHtml(value) {
  return String(value == null ? "" : value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\\"/g,"&quot;").replace(/'/g,"&#39;");
}
function statusCopy(value) { return escapeHtml(value).replace(/\\r?\\n/g, "<br>"); }
`;
const script = `${prelude}\n${serverSource.slice(start, end)}\nglobalThis.result = {
  developerHtml: renderChatPage({ isDeveloper: true, message: "Ready" }),
  publicHtml: renderChatPage({ isDeveloper: false, message: "Ready" }),
  developerHelp: buildCommandHelpText(true),
  publicHelp: buildCommandHelpText(false),
};`;
const sandbox = {};
vm.runInNewContext(script, sandbox, { timeout: 5000 });
const result = sandbox.result;

const requiredDeveloperCommands = [
  "/dev help", "/tda [developer key]", "/broadcast [message]", "/close server",
  "/define ID [number]", "/repeat [1–100]", "/tgm", "/team setup [mode]",
  "/creation team [teamID]", "/see team", "/set wave [number]", "/toggle AI",
  "/toggle growth", "/toggle plague", "/toggle graveyard", "/spawn [classExport] [x] [y]",
  "/transform [group] [classExport]", "/kill [group]", "/obliterate [group]",
  "/heal [group]", "/size [group] [size]", "/color [group] [color]", "/team [group] [teamID]",
  "/points [group] [points]", "/score [group] [score]", "/propertize entity [group] [property] [value]",
  "/propertize global [room|config] [property] [value]", "/find loc", "/pMute [IP]",
  "/pUnmute [IP]", "/pKick [IP]", "/pBan [IP]", "/pUnban [IP]",
];
for (const command of requiredDeveloperCommands) {
  assert.ok(result.developerHelp.includes(command), `developer help missing ${command}`);
  assert.ok(result.developerHtml.includes(command), `developer UI missing ${command}`);
}
assert.ok(result.developerHelp.includes("/reset"), "public commands should also be in developer help");
assert.ok(result.developerHelp.includes("/vote [mode]"), "public vote command should be listed");
assert.ok(!result.publicHelp.includes("/close server"), "developer commands must not appear in public help text");
assert.ok(!result.publicHtml.includes("/pBan [IP]"), "developer command buttons must not render for public sessions");
assert.ok(result.publicHtml.includes("Developer commands appear here only for authorized sessions"));

// Long command descriptions should wrap inside the sidebar rather than clip on a single flex row.
assert.ok(serverSource.includes("overflow-wrap:anywhere;word-break:normal;hyphens:auto"), "command descriptions must wrap instead of clipping");
assert.ok(serverSource.includes("flex-direction:column;align-items:flex-start"), "command rows should stack command tokens and descriptions");

console.log("Developer command catalog and long-description layout tests passed.");
