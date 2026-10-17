/* Dependency-free local preview for Next.js static export; never use next start for output:export. */
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..', 'out');
const portArg = process.argv.indexOf('--port');
const port = Number(portArg >= 0 ? process.argv[portArg + 1] : process.env.PORT || 3000);
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};
let base = '/';
(async () => {
  try {
    base = JSON.parse(await fs.readFile(path.join(root, 'manifest.json'), 'utf8')).scope || '/';
  } catch {
    console.error('Build files not found. Run npm run build first.');
    process.exitCode = 1;
    return;
  }
  http
    .createServer(async (request, response) => {
      if (!['GET', 'HEAD'].includes(request.method)) {
        response.writeHead(405);
        response.end();
        return;
      }
      try {
        let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
        if (base !== '/' && pathname === '/') {
          response.writeHead(302, { Location: base });
          response.end();
          return;
        }
        if (base !== '/' && pathname.startsWith(base)) pathname = pathname.slice(base.length - 1);
        const target = path.resolve(root, '.' + pathname);
        if (target !== root && !target.startsWith(root + path.sep)) {
          response.writeHead(403);
          response.end();
          return;
        }
        let file = target;
        try {
          if ((await fs.stat(file)).isDirectory()) file = path.join(file, 'index.html');
        } catch {}
        let content,
          status = 200;
        try {
          content = await fs.readFile(file);
        } catch {
          file = path.join(root, '404.html');
          content = await fs.readFile(file);
          status = 404;
        }
        response.writeHead(status, {
          'Content-Type': mime[path.extname(file)] || 'application/octet-stream',
          'Cache-Control': file.includes(path.sep + '_next' + path.sep)
            ? 'public, max-age=31536000, immutable'
            : 'no-cache',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        });
        response.end(request.method === 'HEAD' ? undefined : content);
      } catch {
        response.writeHead(400);
        response.end('Bad request');
      }
    })
    .listen(port, '127.0.0.1', () =>
      console.log(`Life OS preview: http://127.0.0.1:${port}${base}`),
    );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
