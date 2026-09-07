import http from 'k6/http';
import { check } from 'k6';
import { Rate, Counter } from 'k6/metrics';

const errorRate = new Rate('errors');
const ok200 = new Counter('ok_200');
const fail200 = new Counter('fail_200');
const okDur = new Counter('ok_dur');
const failDur = new Counter('fail_dur');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const FILE_SIZE = __ENV.FILE_SIZE || '10000kb';
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

  if (res.status === 200) ok200.add(1);
  else fail200.add(1);

  if (res.timings.duration < 10000) okDur.add(1);
  else failDur.add(1);

  errorRate.add(res.status !== 200);
}

function cell(m, key) {
  const v = m?.[key];
  return (v === undefined || v === null) ? null : Number(v).toFixed(2);
}

function fnum(v) {
  return (v === undefined || v === null) ? null : Number(v).toFixed(2);
}

function cnt(v) {
  return (v === undefined || v === null) ? 0 : v;
}

export function handleSummary(data) {
  const d = data.metrics.http_req_duration?.values;
  const r = data.metrics.http_reqs?.values;
  const e = data.metrics.errors?.values;
  const it = data.metrics.iterations?.values;
  const rx = data.metrics.data_received?.values;
  const tx = data.metrics.data_sent?.values;
  const vusMax = data.metrics.vus_max?.values;

  const result = {
    meta: {
      tugas: 'tugas2',
      script: 'amdahl-law.js',
      url: BASE_URL,
      file: FILE_SIZE,
      vus: VUS,
      duration: DURATION,
      timestamp: new Date().toISOString(),
    },
    latency_ms: {
      min: cell(d, 'min'),
      avg: cell(d, 'avg'),
      med: cell(d, 'med'),
      p90: cell(d, 'p(90)'),
      p95: cell(d, 'p(95)'),
      p99: cell(d, 'p(99)'),
      max: cell(d, 'max'),
    },
    http_timing_ms: {
      blocked: cell(data.metrics.http_req_blocked?.values, 'avg'),
      connecting: cell(data.metrics.http_req_connecting?.values, 'avg'),
      sending: cell(data.metrics.http_req_sending?.values, 'avg'),
      waiting: cell(data.metrics.http_req_waiting?.values, 'avg'),
      receiving: cell(data.metrics.http_req_receiving?.values, 'avg'),
    },
    throughput: {
      reqPerSec: fnum(r?.rate),
      totalRequests: cnt(r?.count),
    },
    iterations: {
      count: cnt(it?.count),
      perSec: fnum(it?.rate),
    },
    data: {
      receivedBytes: cnt(rx?.count),
      sentBytes: cnt(tx?.count),
      receivedPerSec: fnum(rx?.rate),
      sentPerSec: fnum(tx?.rate),
    },
    checks: {
      statusIs200: {
        passes: cnt(data.metrics.ok_200?.values?.count),
        fails: cnt(data.metrics.fail_200?.values?.count),
      },
      responseTimeBelow10s: {
        passes: cnt(data.metrics.ok_dur?.values?.count),
        fails: cnt(data.metrics.fail_dur?.values?.count),
      },
    },
    errors: {
      errorRatePct: e ? fnum(e.rate * 100) : '0.00',
      errorCount: cnt(e?.count),
    },
    vusMax: cnt(vusMax?.value),
  };

  return {
    [`tests/tugas2-${FILE_SIZE}-vu${VUS}.json`]: JSON.stringify(result, null, 2),
    stdout: JSON.stringify(result, null, 2) + '\n',
  };
}