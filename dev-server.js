// Local server for the editor: serves the files in this folder and /api/ai (the same handler Vercel runs).
// Put OPENROUTER_API_KEY in .env.local (see .env.example), then: npm start → http://127.0.0.1:5183
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import aiHandler from './api/ai.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 5183;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

// OPENROUTER_* settings from .env.local / .env (a variable already set in the shell wins)
for (const name of ['.env.local', '.env']) {
  const file = path.join(root, name);
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*(OPENROUTER_\w+)\s*=\s*(.*?)\s*$/);
    if (m) process.env[m[1]] ??= m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/ai') return aiHandler(req, res);
  const rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
  const file = path.join(root, rel);
  // only plain files inside this folder; never .env files or the git folder
  if (!file.startsWith(root + path.sep) || rel.split('/').some(p => p.startsWith('.')) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Not found');
  }
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => {
  console.log(`Editor: http://127.0.0.1:${port}  (AI key ${process.env.OPENROUTER_API_KEY ? 'found' : 'not set: add OPENROUTER_API_KEY to .env.local'})`);
});
