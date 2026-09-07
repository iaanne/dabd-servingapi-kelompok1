const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Konfigurasi (bisa di-override lewat env)
const K6_PATH = process.env.K6_PATH || 'k6';
const DURATION = process.env.DURATION || '5m';          // durasi TETAP tiap run
const VUS_LIST = (process.env.VUS_LIST || '200,400,600,800,1000').split(',').map(Number);
const FILES_LIST = (process.env.FILES_LIST || '1kb,10kb,100kb,1000kb,10000kb').split(',');
const TUGAS = process.env.TUGAS || 'both';               // '1' | '2' | 'both'

const TASKS = {
  1: { script: 'little-law.js', base: 'http://localhost:3001', tag: 'tugas1' },
  2: { script: 'amdahl-law.js', base: 'http://localhost:8080', tag: 'tugas2' },
};

function runK6(script, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(K6_PATH, ['run', ...args, path.join('tests', script)], {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`k6 exit ${code}`))));
    child.on('error', reject);
  });
}

function log(msg) {
  console.log(`\n===== ${msg} =====\n`);
}

async function main() {
  const taskKeys = TUGAS === 'both' ? [1, 2] : [Number(TUGAS)];
  const total = taskKeys.length * FILES_LIST.length * VUS_LIST.length;

  console.log(`K6_PATH   : ${K6_PATH}`);
  console.log(`DURATION  : ${DURATION}`);
  console.log(`VUS       : ${VUS_LIST.join(', ')}`);
  console.log(`FILES     : ${FILES_LIST.join(', ')}`);
  console.log(`TUGAS     : ${taskKeys.join(', ')}`);
  console.log(`TOTAL RUN : ${total} (durasi per run ${DURATION})\n`);

  let done = 0;
  for (const key of taskKeys) {
    const task = TASKS[key];
    for (const file of FILES_LIST) {
      for (const vus of VUS_LIST) {
        done++;
        log(`[${done}/${total}] ${task.tag} | file=${file} | VU=${vus} | ${DURATION}`);
        await runK6(task.script, [
          `--env`, `BASE_URL=${task.base}`,
          `--env`, `FILE_SIZE=${file}`,
          `--env`, `VUS=${vus}`,
          `--env`, `DURATION=${DURATION}`,
        ]);
        console.log(`=> OK: tests/${task.tag}-${file}-vu${vus}.json`);
      }
    }
  }

  log('SEMUA TEST SELESAI');
  summarize(taskKeys);
}

// Ringkas hasil dari file JSON yang sudah ditulis k6
function summarize(taskKeys) {
  console.log('\nRingkasan (latency p90 / p95 / throughput):\n');
  for (const key of taskKeys) {
    const task = TASKS[key];
    console.log(`--- ${task.tag} (VU) ---`);
    for (const file of FILES_LIST) {
      console.log(` >> file ${file}:`);
      for (const vus of VUS_LIST) {
        const f = path.join('tests', `${task.tag}-${file}-vu${vus}.json`);
        if (!fs.existsSync(f)) {
          console.log(`    VU ${vus}: (file tidak ada)`);
          continue;
        }
        const d = JSON.parse(fs.readFileSync(f, 'utf8'));
        console.log(
          `    VU ${vus}: p90=${d.latency.p90}ms p95=${d.latency.p95}ms ` +
          `throughput=${d.throughput.reqPerSec}/s err=${d.errorRate}`
        );
      }
    }
  }
}

main().catch((e) => {
  console.error('GAGAL:', e.message);
  process.exit(1);
});