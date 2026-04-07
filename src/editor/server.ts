import * as http from 'node:http';
import type { Buddy } from '../types.js';
import { writeJSON } from '../fs-atomic.js';
import { buildEditorHTML } from './template.js';

export interface EditorServerOptions {
  buddy: Buddy;
  buddyPath: string;
  onSave?: (buddy: Buddy) => void;
}

export function startEditorServer(
  options: EditorServerOptions,
): Promise<{ port: number; close: () => void }> {
  const { buddy, buddyPath, onSave } = options;

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = req.url ?? '/';
      const method = req.method ?? 'GET';

      if (method === 'GET' && url === '/') {
        const html = buildEditorHTML(buddy);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(html);
        return;
      }

      if (method === 'POST' && url === '/save') {
        let body = '';
        req.setEncoding('utf8');
        req.on('data', (chunk: string) => {
          body += chunk;
        });
        req.on('end', () => {
          let parsed: unknown;
          try {
            parsed = JSON.parse(body);
          } catch {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Invalid JSON');
            return;
          }

          if (
            typeof parsed !== 'object' ||
            parsed === null ||
            !('name' in parsed) ||
            !('frames' in parsed) ||
            !('voice' in parsed)
          ) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Missing required fields: name, frames, voice');
            return;
          }

          const savedBuddy = parsed as Buddy;

          writeJSON(buddyPath, savedBuddy)
            .then(() => {
              res.writeHead(200, { 'Content-Type': 'text/plain' });
              res.end('OK');

              if (onSave) {
                onSave(savedBuddy);
              }

              // Close server after a short delay to let the browser receive the response
              setTimeout(() => {
                server.close();
              }, 1000);
            })
            .catch((err: unknown) => {
              const message = err instanceof Error ? err.message : String(err);
              res.writeHead(500, { 'Content-Type': 'text/plain' });
              res.end(`Write error: ${message}`);
            });

          return;
        });
        req.on('error', () => {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Request error');
        });
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
    });

    server.on('error', reject);

    // Port 0 = OS picks a random available port
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('Failed to get server address'));
        return;
      }

      const port = addr.port;

      const close = () => {
        server.close();
      };

      resolve({ port, close });
    });
  });
}
