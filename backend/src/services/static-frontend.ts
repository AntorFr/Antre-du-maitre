import type { FastifyInstance } from 'fastify';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const FRONTEND_DIST_DIR = resolve(process.cwd(), 'frontend/dist');
const INDEX_FILE = resolve(FRONTEND_DIST_DIR, 'index.html');

const MIME_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
};

export async function registerStaticFrontend(app: FastifyInstance) {
  if (!(await isFile(INDEX_FILE))) {
    app.log.warn(
      {
        frontendDistDir: FRONTEND_DIST_DIR,
      },
      'Frontend dist not found. Static frontend serving disabled.',
    );
    return;
  }

  app.get('/*', async (request, reply) => {
    const pathname = readPathname(request.url);

    if (!pathname || pathname.startsWith('/api')) {
      return reply.code(404).send({
        message: 'Not found.',
      });
    }

    const requestedFile = await findStaticFile(pathname);
    const file = requestedFile ?? INDEX_FILE;

    reply
      .type(MIME_TYPES[extname(file)] ?? 'application/octet-stream')
      .send(await readFile(file));
  });
}

function readPathname(url: string): string | null {
  try {
    return decodeURIComponent(new URL(url, 'http://localhost').pathname);
  } catch {
    return null;
  }
}

async function findStaticFile(pathname: string): Promise<string | null> {
  if (pathname === '/') {
    return INDEX_FILE;
  }

  const file = resolve(FRONTEND_DIST_DIR, `.${pathname}`);

  if (!isPathInside(FRONTEND_DIST_DIR, file) || !(await isFile(file))) {
    return null;
  }

  return file;
}

function isPathInside(parent: string, child: string) {
  return child === parent || child.startsWith(`${parent}${sep}`);
}

async function isFile(path: string) {
  try {
    return (await stat(path)).isFile();
  } catch {
    return false;
  }
}
