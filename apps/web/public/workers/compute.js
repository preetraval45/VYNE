// VYNE compute worker.
// Runs heavy CSV / aggregation / stat work off the main thread so the
// UI stays at 60 fps during imports and big chart re-renders.
//
// Protocol:
//   { id, op, payload } → posted from the main thread
//   { id, ok, result }  → resolved
//   { id, ok: false, error } → rejected
//
// Operations:
//   - csv-parse:    payload = { text, delimiter? } → { rows, headers }
//   - csv-stringify: payload = { rows, headers? } → string
//   - aggregate:     payload = { rows, by, measure, agg }
//                    → array of { key, count, sum, avg, min, max }
//   - histogram:     payload = { values, bins } → { edges, counts }
//   - dedupe-fingerprint: payload = { rows, fields } → groups
//
// Adding a new op: append the handler to OPS below + bump the
// SCRIPT_VERSION so cached workers refresh.
const SCRIPT_VERSION = "vyne-compute-v1";

const OPS = {
  "csv-parse": (payload) => {
    const text = String(payload?.text ?? "");
    const delim = payload?.delimiter ?? ",";
    const lines = text.split(/\r?\n/).filter((l) => l.length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };
    const headers = parseCsvLine(lines[0], delim);
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cells = parseCsvLine(lines[i], delim);
      const row = {};
      for (let c = 0; c < headers.length; c++) {
        row[headers[c]] = cells[c] ?? "";
      }
      rows.push(row);
    }
    return { headers, rows };
  },

  "csv-stringify": (payload) => {
    const rows = Array.isArray(payload?.rows) ? payload.rows : [];
    if (rows.length === 0) return "";
    const headers =
      payload?.headers ?? Object.keys(rows[0] ?? {});
    const out = [headers.map(escapeCsv).join(",")];
    for (const r of rows) {
      out.push(headers.map((h) => escapeCsv(r?.[h] ?? "")).join(","));
    }
    return out.join("\n");
  },

  aggregate: (payload) => {
    const rows = Array.isArray(payload?.rows) ? payload.rows : [];
    const by = payload?.by;
    const measure = payload?.measure;
    const agg = payload?.agg ?? "sum";
    if (!by) return [];
    const map = new Map();
    for (const r of rows) {
      const key = String(r?.[by] ?? "");
      const v = Number(r?.[measure]);
      const cur =
        map.get(key) ?? {
          key,
          count: 0,
          sum: 0,
          min: Number.POSITIVE_INFINITY,
          max: Number.NEGATIVE_INFINITY,
        };
      cur.count += 1;
      if (Number.isFinite(v)) {
        cur.sum += v;
        if (v < cur.min) cur.min = v;
        if (v > cur.max) cur.max = v;
      }
      map.set(key, cur);
    }
    const out = [];
    for (const cur of map.values()) {
      out.push({
        key: cur.key,
        count: cur.count,
        sum: cur.sum,
        avg: cur.count > 0 ? cur.sum / cur.count : 0,
        min: cur.min === Number.POSITIVE_INFINITY ? 0 : cur.min,
        max: cur.max === Number.NEGATIVE_INFINITY ? 0 : cur.max,
      });
    }
    out.sort((a, b) =>
      agg === "count" ? b.count - a.count : b.sum - a.sum,
    );
    return out;
  },

  histogram: (payload) => {
    const values = (payload?.values ?? [])
      .map(Number)
      .filter((v) => Number.isFinite(v));
    const bins = Math.max(1, Number(payload?.bins ?? 12));
    if (values.length === 0) return { edges: [], counts: [] };
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (const v of values) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    if (min === max) max = min + 1;
    const span = max - min;
    const edges = Array.from(
      { length: bins + 1 },
      (_, i) => min + (span * i) / bins,
    );
    const counts = new Array(bins).fill(0);
    for (const v of values) {
      let idx = Math.floor(((v - min) / span) * bins);
      if (idx >= bins) idx = bins - 1;
      counts[idx] += 1;
    }
    return { edges, counts };
  },

  "dedupe-fingerprint": (payload) => {
    const rows = Array.isArray(payload?.rows) ? payload.rows : [];
    const fields = Array.isArray(payload?.fields) ? payload.fields : [];
    if (!fields.length) return [];
    const groups = new Map();
    for (const r of rows) {
      const key = fields
        .map((f) => String(r?.[f] ?? "").toLowerCase().trim())
        .join("");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    }
    const out = [];
    for (const list of groups.values()) {
      if (list.length > 1) out.push(list);
    }
    return out;
  },
};

self.addEventListener("message", (event) => {
  const { id, op, payload } = event.data || {};
  const handler = OPS[op];
  if (!handler) {
    self.postMessage({
      id,
      ok: false,
      error: `Unknown op: ${op}. Available: ${Object.keys(OPS).join(", ")}`,
    });
    return;
  }
  try {
    const result = handler(payload);
    self.postMessage({ id, ok: true, result });
  } catch (err) {
    self.postMessage({
      id,
      ok: false,
      error: err && err.message ? err.message : String(err),
    });
  }
});

self.postMessage({ id: "boot", ok: true, version: SCRIPT_VERSION });

function parseCsvLine(line, delim) {
  const out = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
      continue;
    }
    if (ch === delim) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function escapeCsv(value) {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
