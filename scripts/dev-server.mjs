import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.cwd(), 'public');
const port = Number(process.env.PORT || 4173);

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function resolveFile(url) {
  const requestPath = decodeURIComponent(new URL(url, 'http://local').pathname);
  const cleanPath = normalize(requestPath).replace(/^(\.\.[/\\])+/, '');
  let filePath = resolve(root, `.${cleanPath}`);

  if (!filePath.startsWith(root)) {
    return null;
  }

  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, 'index.html');
  }

  if (!existsSync(filePath) && !extname(filePath)) {
    filePath = join(filePath, 'index.html');
  }

  return filePath.startsWith(root) && existsSync(filePath) ? filePath : null;
}

const server = createServer((request, response) => {
  const filePath = resolveFile(request.url || '/');

  if (!filePath) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'content-type': types[extname(filePath)] || 'application/octet-stream',
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, () => {
  console.log(`Local preview: http://localhost:${port}`);
});
