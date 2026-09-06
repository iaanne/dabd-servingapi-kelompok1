const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const MAX_CONN = Number(process.env.MAX_CONN || 0);
const LOG = process.env.LOG === '1';

const FILES_DIR = path.resolve(__dirname, '..', 'dummy-files');

const knownFiles = {};
if (fs.existsSync(FILES_DIR)) {
  for (const f of fs.readdirSync(FILES_DIR)) {
    knownFiles['/files/' + f] = path.join(FILES_DIR, f);
  }
}

if (LOG) {
  app.use((req, res, next) => {
    res.on('finish', () => {
      console.log(`[${Date.now()}] ${req.method} ${req.originalUrl} -> ${res.statusCode}`);
    });
    next();
  });
}

app.get('/', (req, res) => {
  res.json({
    service: 'API Serving File',
    message: 'GET /files/:name untuk mengunduh file dummy.',
    available: Object.keys(knownFiles),
  });
});

app.get('/files/:name', (req, res, next) => {
  const target = knownFiles['/files/' + req.params.name];
  if (!target) return res.status(404).json({ error: 'File tidak ditemukan' });
  res.sendFile(target, null, (err) => {
    if (err && !res.headersSent) next(err);
  });
});

app.use('/files', express.static(FILES_DIR));

app.get('/status', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    pid: process.pid,
    uptime: process.uptime(),
    rssMb: +(mem.rss / 1048576).toFixed(2),
    heapUsedMb: +(mem.heapUsed / 1048576).toFixed(2),
    maxConn: MAX_CONN || 'unlimited',
  });
});

const server = app.listen(PORT, () => {
  console.log(`[server] API Serving File berjalan di http://localhost:${PORT}`);
  console.log(`[server] $ curl http://localhost:${PORT}/files/10mb.bin`);
});

if (MAX_CONN > 0) server.maxConnections = MAX_CONN;