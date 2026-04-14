/**
 * VYNE — k6 spike test: sudden burst of traffic
 *
 * Simulates a traffic spike (e.g. press mention, email blast).
 *
 * Usage:
 *   k6 run tests/k6/spike.js
 */
import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:1040";

export const options = {
  stages: [
    { duration: "10s", target: 5   }, // baseline
    { duration: "10s", target: 200 }, // spike to 200 VUs instantly
    { duration: "30s", target: 200 }, // hold spike
    { duration: "10s", target: 5   }, // recover
    { duration: "10s", target: 0   },
  ],
  thresholds: {
    http_req_failed:   ["rate<0.10"],  // allow up to 10% during spike
    http_req_duration: ["p(99)<5000"], // 99th percentile < 5s
  },
};

export default function () {
  // Lightweight endpoint that tests the gateway and app layer
  const res = http.get(`${BASE_URL}/health`);
  check(res, { "status 200": (r) => r.status === 200 });
  sleep(0.5);

  // Also test the auth endpoint
  const login = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: "preet@vyne.ai", password: "demo123" }),
    { headers: { "Content-Type": "application/json" } },
  );
  check(login, { "auth not 500": (r) => r.status !== 500 });
  sleep(0.5);
}
