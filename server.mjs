import { createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { realpath, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const distRoot = resolve(fileURLToPath(new URL('./dist/', import.meta.url)));
const indexFile = resolve(distRoot, 'index.html');
const port = Number(process.env.PORT) || 3000;
const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.mp4', 'video/mp4'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webp', 'image/webp'],
]);

function sendText(response, status, message, method) {
  const body = Buffer.from(`${message}\n`);
  response.writeHead(status, {
    'Cache-Control': 'no-store',
    'Content-Length': body.length,
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(method === 'HEAD' ? undefined : body);
}

async function serve(request, response) {
  const method = request.method ?? 'GET';
  if (method !== 'GET' && method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    sendText(response, 405, 'Method Not Allowed', method);
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  } catch {
    sendText(response, 400, 'Bad Request', method);
    return;
  }

  if (pathname === '/healthz') {
    sendText(response, 200, 'ok', method);
    return;
  }

  if (pathname.includes('\0')) {
    sendText(response, 400, 'Bad Request', method);
    return;
  }

  const relativePath = pathname.replace(/^\/+/, '');
  const requestedPath = relativePath ? resolve(distRoot, relativePath) : indexFile;
  if (requestedPath !== distRoot && !requestedPath.startsWith(`${distRoot}${sep}`)) {
    sendText(response, 404, 'Not Found', method);
    return;
  }

  let filePath = requestedPath;
  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('Not a file');
    filePath = await realpath(filePath);
    if (!filePath.startsWith(`${distRoot}${sep}`)) throw new Error('Outside dist');
  } catch {
    if (extname(relativePath)) {
      sendText(response, 404, 'Not Found', method);
      return;
    }
    filePath = indexFile;
  }

  try {
    const info = await stat(filePath);
    const contentType = mimeTypes.get(extname(filePath)) ?? 'application/octet-stream';
    const immutableAsset = pathname.startsWith('/assets/');
    const commonHeaders = {
      'Cache-Control': immutableAsset ? 'public, max-age=31536000, immutable' : 'no-cache',
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
    };
    if (extname(filePath) === '.mp4') {
      const rangeHeader = request.headers.range;
      if (rangeHeader) {
        const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader);
        if (!match || (!match[1] && !match[2])) {
          response.writeHead(416, { 'Content-Range': `bytes */${info.size}`, ...commonHeaders });
          response.end();
          return;
        }
        const suffixLength = match[1] ? 0 : Number(match[2]);
        const start = match[1] ? Number(match[1]) : Math.max(info.size - suffixLength, 0);
        const end = match[2] && match[1] ? Number(match[2]) : info.size - 1;
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= info.size || end < start) {
          response.writeHead(416, { 'Content-Range': `bytes */${info.size}`, ...commonHeaders });
          response.end();
          return;
        }
        const boundedEnd = Math.min(end, info.size - 1);
        response.writeHead(206, {
          ...commonHeaders,
          'Accept-Ranges': 'bytes',
          'Content-Length': boundedEnd - start + 1,
          'Content-Range': `bytes ${start}-${boundedEnd}/${info.size}`,
        });
        if (method === 'HEAD') response.end();
        else createReadStream(filePath, { start, end: boundedEnd }).pipe(response);
        return;
      }
      response.setHeader('Accept-Ranges', 'bytes');
    }
    response.writeHead(200, { ...commonHeaders, 'Content-Length': info.size });
    if (method === 'HEAD') response.end();
    else createReadStream(filePath).pipe(response);
  } catch {
    sendText(response, 500, 'Internal Server Error', method);
  }
}

const server = createServer((request, response) => {
  void serve(request, response).catch(() => {
    if (!response.headersSent) sendText(response, 500, 'Internal Server Error', request.method ?? 'GET');
    else response.destroy();
  });
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Egg storefront listening on 0.0.0.0:${port}`);
});
