#!/usr/bin/env node
/**
 * Manage the gate's keys.json (docs/features/F-006-afribit-gpu-server.md). Keys are shown once and stored
 * only as SHA-256 hashes. After a change, reload the gate: `docker compose kill -s HUP gate`.
 *
 *   node keys.mjs add <community-id> [--peer auto|10.77.0.N] [--per-minute 30] [--concurrent 4] [--note "…"]
 *   node keys.mjs revoke <community-id>
 *   node keys.mjs list
 *   node keys.mjs operator          a new operator key, for GET /usage
 *
 * `add` prints machine-readable lines (PEER=…, KEY=…) that add-community.sh reads.
 * File: GATE_KEYS_FILE (default /etc/afribit-gate/keys.json).
 */
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { parseKeys, sha256 } from "./gate.mjs";

const FILE = process.env.GATE_KEYS_FILE ?? "/etc/afribit-gate/keys.json";
const [cmd, id, ...rest] = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 && rest[i + 1] !== undefined ? rest[i + 1] : fallback;
};
const fail = (msg) => {
  console.error(msg);
  process.exit(1);
};

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") return { communities: [] };
    throw e;
  }
}
function save(data) {
  parseKeys(data); // never write a file the gate would refuse
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
  fs.renameSync(tmp, FILE);
}
const newKey = () => `afb_${randomBytes(32).toString("base64url")}`;

const data = load();
data.communities ??= [];

if (cmd === "add") {
  if (!id) fail("Usage: keys.mjs add <community-id> [--peer auto|10.77.0.N] [--per-minute 30] [--concurrent 4] [--note …]");
  if (data.communities.some((c) => c.id === id)) fail(`"${id}" already exists. Revoke it first, or choose another id.`);
  let peer = opt("peer", "auto");
  if (peer === "auto") {
    const used = new Set(data.communities.map((c) => c.peer).filter(Boolean));
    const free = Array.from({ length: 253 }, (_, i) => `10.77.0.${i + 2}`).find((a) => !used.has(a));
    if (!free) fail("No free tunnel address left in 10.77.0.0/24.");
    peer = free;
  } else if (peer === "none") peer = null;
  const key = newKey();
  data.communities.push({
    id,
    keySha256: sha256(key),
    peer,
    perMinute: Number(opt("per-minute", 30)),
    concurrent: Number(opt("concurrent", 4)),
    note: opt("note", undefined),
    added: new Date().toISOString().slice(0, 10),
  });
  save(data);
  console.log(`PEER=${peer ?? ""}`);
  console.log(`KEY=${key}`);
} else if (cmd === "revoke") {
  const c = data.communities.find((x) => x.id === id);
  if (!c) fail(`No community "${id}".`);
  c.disabled = true;
  c.revoked = new Date().toISOString().slice(0, 10);
  save(data);
  console.log(`Revoked "${id}". Reload the gate (docker compose kill -s HUP gate) and remove its WireGuard peer.`);
} else if (cmd === "list") {
  for (const c of data.communities) {
    console.log(`${c.id.padEnd(24)} ${(c.peer ?? "(any address)").padEnd(14)} ${String(c.perMinute ?? 30).padStart(4)}/min  ${String(c.concurrent ?? 4).padStart(2)} at once  ${c.disabled ? `REVOKED ${c.revoked ?? ""}` : "active"}  ${c.note ?? ""}`);
  }
  if (!data.communities.length) console.log("No communities yet.");
} else if (cmd === "operator") {
  const key = newKey();
  data.operatorKeySha256 = sha256(key);
  save(data);
  console.log(`KEY=${key}`);
  console.log("The operator key reads GET /usage. It is shown once; only its hash is stored.");
} else {
  fail("Usage: keys.mjs add|revoke|list|operator …  (see the top of this file)");
}
