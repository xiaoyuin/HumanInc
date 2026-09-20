import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const assetRoot = pathname.startsWith('/assets/') || ['/favicon.ico', '/favicon.svg', '/apple-touch-icon.png'].includes(pathname) ? resolve(root, 'public') : root;
    const file = resolve(assetRoot, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!file.startsWith(assetRoot.endsWith(sep) ? assetRoot : assetRoot + sep) || !Object.hasOwn(types, extname(file))) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)], 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' }).end(data);
  } catch {
    res.writeHead(404).end('Not found');
  }
});
server.listen(Number(process.env.PORT) || 3000, '0.0.0.0', () => console.log(`Human, Inc. → http://localhost:${server.address().port}`));
