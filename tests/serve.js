// Minimal static file server for src/team-task-dashboard, used only by the
// Playwright test suite (playwright.config.js starts this automatically).
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'src', 'team-task-dashboard');
const PORT = 8934;

function contentTypeFor(p) {
  const ext = path.extname(p);
  if (ext === '.js') return 'application/javascript';
  if (ext === '.html') return 'text/html';
  if (ext === '.json') return 'application/json';
  return 'application/octet-stream';
}

http
  .createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p === '/') p = '/index.html';
    const full = path.join(ROOT, p);
    fs.readFile(full, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentTypeFor(full) });
      res.end(data);
    });
  })
  .listen(PORT, () => console.log('Serving team-task-dashboard on http://localhost:' + PORT));
