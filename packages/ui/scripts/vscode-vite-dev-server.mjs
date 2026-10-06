import { createHash, randomUUID } from 'node:crypto';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { createServer as createControlServer, connect } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';

const uiRoot = fileURLToPath(new URL('..', import.meta.url));
const workspaceId = createHash('sha256').update(uiRoot).digest('hex').slice(0, 16);
const stateFile = join(tmpdir(), `kaoto-vscode-vite-${workspaceId}.json`);

async function start() {
  const vite = await createViteServer({ root: uiRoot, mode: 'dev' });
  await vite.listen();

  const token = randomUUID();
  const control = createControlServer((socket) => {
    let request = '';
    socket.on('data', (chunk) => {
      request += chunk;
      if (!request.includes('\n')) return;
      if (request.trim() !== token) {
        socket.end('denied');
        return;
      }
      socket.end('ok');
      void close();
    });
  });

  let closing;
  function close() {
    closing ??= (async () => {
      await vite.close();
      await new Promise((resolve) => control.close(resolve));
      await rm(stateFile, { force: true });
    })();
    return closing;
  }

  process.once('SIGINT', () => void close());
  process.once('SIGTERM', () => void close());
  await new Promise((resolve, reject) => {
    control.once('error', reject);
    control.listen(0, '127.0.0.1', resolve);
  });
  await writeFile(stateFile, JSON.stringify({ port: control.address().port, token }), { mode: 0o600 });
  vite.printUrls();
  console.log('Vite ready in VS Code');
}

async function stop() {
  let state;
  try {
    state = JSON.parse(await readFile(stateFile, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return;
    throw error;
  }

  try {
    await new Promise((resolve, reject) => {
      const socket = connect(state.port, '127.0.0.1');
      socket.setTimeout(2000);
      socket.once('connect', () => socket.write(`${state.token}\n`));
      socket.once('data', (reply) =>
        reply.toString() === 'ok' ? resolve() : reject(new Error('Vite refused to stop')),
      );
      socket.once('error', reject);
      socket.once('timeout', () => {
        socket.destroy();
        reject(new Error('Timed out stopping Vite'));
      });
      socket.once('close', () => reject(new Error('Vite closed the control connection without a reply')));
    });
  } catch (error) {
    if (error.code !== 'ECONNREFUSED') throw error;
    await rm(stateFile, { force: true });
  }
}

await (process.argv[2] === 'start' ? start() : stop());
