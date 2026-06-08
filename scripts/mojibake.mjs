#!/usr/bin/env node
// Mojibake guard + repair.
//
// The corruption: UTF-8 bytes get decoded as Windows-1252 (e.g. by a
// PowerShell `Get-Content`/`Set-Content` run without `-Encoding utf8`, or an
// editor saving as ANSI) and re-saved as UTF-8 — em dash, ellipsis, arrows
// and emoji turn into multi-char "garbage" sequences led by a-circumflex /
// A-tilde. This script reverses it generically by mapping each suspect run's
// chars back to their cp1252 byte and decoding
// those bytes as UTF-8 with FATAL validation, so anything that isn't truly
// mojibake is left untouched (no false repairs).
//
// Usage:
//   node scripts/mojibake.mjs --check [files...]   exit 1 if any mojibake found
//   node scripts/mojibake.mjs --fix   [files...]   rewrite files in place
// With no file args it walks apps/web/src. Pre-commit runs it in --check mode
// on staged files (see package.json lint-staged).
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// cp1252 high range (0x80-0x9F) -> the Unicode chars Windows-1252 assigns them.
const CP1252_HIGH = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f,
};

function charToByte(ch) {
  const cp = ch.codePointAt(0);
  if (cp <= 0xff) return cp;
  if (cp in CP1252_HIGH) return CP1252_HIGH[cp];
  return null;
}

const CONT =
  "\\u0080-\\u00bf\\u20ac\\u201a\\u0192\\u201e\\u2026\\u2020\\u2021\\u02c6" +
  "\\u2030\\u0160\\u2039\\u0152\\u017d\\u2018\\u2019\\u201c\\u201d\\u2022" +
  "\\u2013\\u2014\\u02dc\\u2122\\u0161\\u203a\\u0153\\u017e\\u0178";
const RE = new RegExp(`[\\u00c2-\\u00f4][${CONT}]{1,3}`, "g");
const decoder = new TextDecoder("utf-8", { fatal: true });

// Returns { fixed, hits } where hits is the count of repaired runs.
function repair(text) {
  let hits = 0;
  const fixed = text.replace(RE, (run) => {
    const bytes = [];
    for (const ch of run) {
      const b = charToByte(ch);
      if (b === null) return run;
      bytes.push(b);
    }
    try {
      const decoded = decoder.decode(Uint8Array.from(bytes));
      if ([...decoded].every((c) => c.codePointAt(0) < 0x80)) return run;
      hits++;
      return decoded;
    } catch {
      return run;
    }
  });
  return { fixed, hits };
}

const EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".md", ".css", ".json"]);
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const defaultDir = join(repoRoot, "apps", "web", "src");

function collect(dir, out) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) {
      if (name === "node_modules" || name === ".next" || name === ".git") continue;
      collect(p, out);
    } else if (EXTS.has(extname(name))) {
      out.push(p);
    }
  }
}

const argv = process.argv.slice(2);
const mode = argv.includes("--fix") ? "fix" : "check";
const fileArgs = argv.filter((a) => !a.startsWith("--"));

let files = fileArgs.filter((f) => EXTS.has(extname(f)));
if (files.length === 0 && fileArgs.length === 0) {
  files = [];
  collect(defaultDir, files);
}

let offenders = 0;
let repaired = 0;
for (const f of files) {
  let content;
  try {
    content = readFileSync(f, "utf8");
  } catch {
    continue;
  }
  const { fixed, hits } = repair(content);
  if (hits === 0) continue;
  if (mode === "fix") {
    writeFileSync(f, fixed, "utf8");
    repaired += hits;
    console.log(`fixed ${hits}\t${f}`);
  } else {
    offenders++;
    console.error(`✗ ${hits} mojibake sequence(s) in ${f}`);
  }
}

if (mode === "fix") {
  console.log(`\nRepaired ${repaired} sequence(s).`);
  process.exit(0);
}

if (offenders > 0) {
  console.error(
    `\nMojibake detected in ${offenders} file(s). These are UTF-8 chars\n` +
      `corrupted to Windows-1252. Run:  node scripts/mojibake.mjs --fix\n` +
      `then re-stage. (Root cause is usually a PowerShell Get/Set-Content\n` +
      `without -Encoding utf8, or an editor saving as ANSI.)`,
  );
  process.exit(1);
}
process.exit(0);
