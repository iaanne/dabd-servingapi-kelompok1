// k6 load test - unduh file statis dari API Serving File.
//
// Cara pakai (hardcode via CLI lebih mudah):
//   ../tools/k6 run \
//     --vus 50 --duration 30s \
//     -e BASE_URL=http://localhost:3001 \
//     -e FILE=1mb.bin \
//     --summary-export data/raw/k6-1mb-c50.json \
//     loadtest/k6/script.js
//
// Environment default: VUS, DURATION, BASE_URL, FILE.

import http from 'k6/http';
import { check } from 'k6';

const VUS = Number(__ENV.VUS || 10);
const DURATION = __ENV.DURATION || '20s';
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const FILE = __ENV.FILE || '1mb.bin';

export const options = {
  scenarios: {
    download: {
      executor: 'constant-vus',
      vus: VUS,
      duration: DURATION,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.99'], // peringatan bila banyak request drop
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};

export default function () {
  const res = http.get(`${BASE_URL}/files/${FILE}`);
  check(res, {
    'status 200': (r) => r.status === 200,
  });
}