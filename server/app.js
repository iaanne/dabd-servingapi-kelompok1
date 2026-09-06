const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3001;
const FILES_DIR = process.env.FILES_DIR || path.join(__dirname, '..', 'dummy-files');

const files = {};
if (fs.existsSync(FILES_DIR)) {
  for (const f of fs.readdirSync(FILES_DIR)) {
    files['/files/' + f] = path.join(FILES_DIR, f);
  }
}

app.get('/', (req, res) => {
  res.json({
    service: 'API Serving File',
    message: 'Tugas 1 - Little\'s Law: GET /files/:name',
    tersedia: Object.keys(files),
  });
});

app.get('/files/:name', (req, res, next) => {
  const target = files['/files/' + req.params.name];
  if (!target) return res.status(404).json({ error: 'File tidak ditemukan' });
  res.sendFile(target, (err) => {
    if (err && !res.headersSent) next(err);
  });
});

app.get('/status', (req, res) => {
  const mem = process.memoryUsage();
  res.json({
    pid: process.pid,
    rssMb: +(mem.rss / 1048576).toFixed(2),
    heapUsedMb: +(mem.heapUsed / 1048576).toFixed(2),
    uptime: process.uptime(),
  });
});

app.listen(PORT, () => {
  console.log(`[server] API Serving File jalan di http://localhost:${PORT}`);
  console.log(`[server] file tersedia: ${Object.keys(files).join(' ')}`);
});