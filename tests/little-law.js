import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3001';
const FILE_SIZE = __ENV.FILE_SIZE || '1kb';
const VUS = Number(__ENV.VUS || 100);
const DURATION = __ENV.DURATION || '5m';

export const options = {
  vus: VUS,
  duration: DURATION,
};

export default function () {
  const res = http.get(`${BASE_URL}/files/${FILE_SIZE}.bin`);

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 10000ms': (r) => r.timings.duration < 10000,
  });

  errorRate.add(res.status !== 200);
}

export function handleSummary(data) {
  const d = data.metrics.http_req_duration?.values;
  const r = data.metrics.http_reqs?.values;
  const e = data.metrics.errors?.values;

  const result = {
    file: FILE_SIZE,
    vus: VUS,
    duration: DURATION,
    latency: {
      avg: d?.avg?.toFixed(2),
      p90: d?.['p(90)']?.toFixed(2),
      p95: d?.['p(95)']?.toFixed(2),
      p99: d?.['p(99)']?.toFixed(2),
      max: d?.max?.toFixed(2),
    },
    throughput: {
      reqPerSec: r?.rate?.toFixed(2),
      totalRequests: r?.count,
    },
    errorRate: e ? (e.rate * 100).toFixed(2) + '%' : '0%',
  };

  return {
    [`tests/tugas1-${FILE_SIZE}-vu${VUS}.json`]: JSON.stringify(result, null, 2),
    stdout: JSON.stringify(result, null, 2) + '\n',
  };
}
