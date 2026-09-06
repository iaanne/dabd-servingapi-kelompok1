import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  stages: [
    { duration: '30s', target: 10 },
    { duration: '1m', target: 10 },
    { duration: '10s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  const fileSize = __ENV.FILE_SIZE || '1kb';
  const url = `http://localhost:3001/files/${fileSize}.bin`;
  
  const res = http.get(url);
  
  if (res.status !== 200) {
    console.error(` Failed: ${res.status} - ${res.body?.substring(0, 50)}`);
  }
  
  sleep(1);
}