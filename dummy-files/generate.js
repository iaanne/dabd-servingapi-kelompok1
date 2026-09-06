#!/usr/bin/env node
// Generator file dummy (random bytes) dengan ukuran tertentu.
// Jalankan: node generate.js
const fs = require('fs');
const path = require('path');

const FILES = {
  '1kb.bin': 1 * 1024,
  '10kb.bin': 10 * 1024,
  '100kb.bin': 100 * 1024,
  '1000kb.bin': 1000 * 1024,
  '10000kb.bin': 10000 * 1024,
};

function randomBytes(size) {
  const buf = Buffer.allocUnsafe(size);
  let seed = 123456 + size;
  const rand = () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < size; i += 4) {
    buf.writeUInt32LE((rand() * 0xffffffff) >>> 0, i);
  }
  return buf;
}

for (const [name, bytes] of Object.entries(FILES)) {
  fs.writeFileSync(path.join(__dirname, name), randomBytes(bytes));
  console.log(`created ${name} (${bytes} bytes)`);
}
console.log('Selesai.');