/**
 * VYNE — k6 load test: critical API endpoints
 *
 * Usage:
 *   k6 run tests/k6/load.js
 *   k6 run --vus 50 --duration 60s tests/k6/load.js
 *
 * Stages defined below ramp from 0 → 50 VUs over 2 min,
 * hold for 3 min, then ramp down.
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

// ── Custom metrics ────────────────────────────────────────────────
const errorRate   = new Rate("errors");
const loginTime   = new Trend("login_duration",    true);
const projectTime = new Trend("projects_duration", true);
const chatTime    = new Trend("chat_duration",      true);
const aiTime      = new Trend("ai_query_duration",  true);

// ── Config ────────────────────────────────────────────────────────
const BASE_URL = __ENV.BASE_URL || "http://localhost:1040";

export const options = {
  stages: [
    { duration: "30s", target: 10  }, // warm up
    { duration: "1m",  target: 50  }, // ramp to target
    { duration: "3m",  target: 50  }, // sustained load
    { duration: "30s", target: 0   }, // ramp down
  ],
  thresholds: {
    http_req_failed:   ["rate<0.05"],      // <5% errors
    http_req_duration: ["p(95)<2000"],     // 95th percentile < 2s
    errors:            ["rate<0.05"],
    login_duration:    ["p(95)<1000"],
    projects_duration: ["p(95)<800"],
    chat_duration:     ["p(95)<800"],
    ai_query_duration: ["p(95)<3000"],     // AI queries may be slower
  },
};

// ── Helpers ───────────────────────────────────────────────────────
const HEADERS_JSON = { "Content-Type": "application/json" };

function authHeaders(token) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// ── Scenarios ─────────────────────────────────────────────────────

/** Authenticate and get a token */
function doLogin() {
  const start = Date.now();
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: "preet@vyne.ai", password: "demo123" }),
    { headers: HEADERS_JSON },
  );
  loginTime.add(Date.now() - start);

  const ok = check(res, {
    "login 200 or 401": (r) => r.status === 200 || r.status === 401,
    "login not 500":    (r) => r.status < 500,
  });
  errorRate.add(!ok);

  if (res.status === 200) {
    try { return JSON.parse(res.body).token; } catch { return null; }
  }
  return null;
}

/** List projects */
function doListProjects(token) {
  const start = Date.now();
  const res = http.get(`${BASE_URL}/api/projects`, { headers: authHeaders(token) });
  projectTime.add(Date.now() - start);

  const ok = check(res, {
    "projects 2xx": (r) => r.status >= 200 && r.status < 300,
    "projects < 1s": (r) => r.timings.duration < 1000,
  });
  errorRate.add(!ok);
}

/** Get chat messages */
function doChatMessages(token) {
  const start = Date.now();
  const res = http.get(`${BASE_URL}/api/channels`, { headers: authHeaders(token) });
  chatTime.add(Date.now() - start);

  check(res, {
    "channels 2xx or 404": (r) => r.status < 500,
  });
}

/** Health check — no auth needed */
function doHealth() {
  const res = http.get(`${BASE_URL}/health`);
  check(res, { "health 200": (r) => r.status === 200 });
}

/** AI query */
function doAiQuery(token) {
  const start = Date.now();
  const res = http.post(
    `${BASE_URL}/api/ai/agents/query`,
    JSON.stringify({ question: "What is the current revenue?" }),
    { headers: authHeaders(token), timeout: "10s" },
  );
  aiTime.add(Date.now() - start);

  check(res, {
    "ai query 2xx": (r) => r.status >= 200 && r.status < 300,
    "ai query not 500": (r) => r.status !== 500,
  });
}

// ── Default function (runs per VU per iteration) ──────────────────
export default function () {
  // 1. Health check (always)
  doHealth();
  sleep(0.1);

  // 2. Login (obtain token or use demo)
  const token = doLogin() ?? "demo-token";
  sleep(0.2);

  // 3. Load projects
  doListProjects(token);
  sleep(0.3);

  // 4. Chat channels
  doChatMessages(token);
  sleep(0.2);

  // 5. AI query (1 in 5 VUs to avoid hammering the AI service)
  if (Math.random() < 0.2) {
    doAiQuery(token);
  }

  sleep(1);
}
