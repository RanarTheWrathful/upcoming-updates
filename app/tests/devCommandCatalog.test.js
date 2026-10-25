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
  "/dev help", "/tda <key>", "/server announce <message>", "/server close",
  "/server id <number>", "/server repeat <count>", "/player god", "/teams setup <mode>",
  "/team spawn <id>", "/team me", "/wave set <number>", "/ai toggle", "/growth toggle",
  "/plague toggle", "/graveyard toggle", "/entity spawn <export> <x> <y>",
  "/entity transform <group> <export>", "/entity kill <group>", "/entity destroy <group>",
  "/entity heal <group>", "/entity size <group> <size>", "/entity color <group> <color>",
  "/entity team <group> <teamID>", "/entity points <group> <points>",
  "/entity score <group> <score>", "/entity set <group> <property> <value>",
  "/world set <room|config> <property> <value>", "/player mute <IP>",
  "/player unmute <IP>", "/player kick <IP>", "/player ban <IP>", "/player unban <IP>",
];
for (const command of requiredDeveloperCommands) {
  assert.ok(result.developerHelp.includes(command), `developer help missing ${command}`);
  const htmlCommand = command.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  assert.ok(result.developerHtml.includes(htmlCommand), `developer UI missing ${command}`);
}
assert.ok(result.developerHelp.includes("/reset"), "public commands should also be in developer help");
assert.ok(result.developerHelp.includes("/vote <mode>"), "public vote command should be listed");
assert.ok(result.developerHelp.includes("/team setup [mode]"), "legacy commands should remain documented as aliases");
assert.ok(result.developerHelp.includes("/propertize entity [group] [property] [value]"), "legacy entity syntax should remain documented");
assert.ok(!result.publicHelp.includes("/close server"), "developer commands must not appear in public help text");
assert.ok(!result.publicHtml.includes("/player ban <IP>"), "developer command buttons must not render for public sessions");
assert.ok(result.publicHtml.includes("Developer commands appear here only for authorized sessions"));

// Long command descriptions should wrap inside the sidebar rather than clip on a single flex row.
assert.ok(serverSource.includes("overflow-wrap:anywhere;word-break:normal;hyphens:auto"), "command descriptions must wrap instead of clipping");
assert.ok(serverSource.includes("flex-direction:column;align-items:flex-start"), "command rows should stack command tokens and descriptions");

// Developer-only recent command history should be present only for authorized sessions.
assert.ok(result.developerHtml.includes('id="command-search"'), "command library should be searchable");
assert.ok(result.developerHtml.includes('id="recent-commands-panel"'), "developer chat should render recent command history");
assert.ok(result.developerHtml.includes('id="clear-recent-commands"'), "developer history should be clearable");
assert.ok(!result.publicHtml.includes('id="recent-commands-panel"'), "public chat must not render developer command history");
assert.ok(result.publicHtml.includes('id="command-search"'), "public command library should also be searchable");
assert.ok(serverSource.includes("ranarsProphecy.devRecentCommands.v1"), "recent commands should use a versioned browser-local storage key");
assert.ok(serverSource.includes("function isSensitiveCommand(value)"), "authentication command filtering should be present");
assert.ok(serverSource.includes("saveRecentCommand(command)"), "submitted commands should be captured for developers");
const inlineScript = result.developerHtml.match(/<script>([\s\S]*?)<\/script>/i);
assert.ok(inlineScript, "chat page should include its client script");
new vm.Script(inlineScript[1], { filename: "rendered-chat-client.js" });

console.log("Developer command catalog, long-description layout, and recent-command history tests passed.");
