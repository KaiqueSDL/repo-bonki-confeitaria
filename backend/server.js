import fs from 'node:fs/promises';
import path from 'node:path';
import { configuration } from './config.js';
import { createApp } from './app.js';

const config = configuration();
if (config.production && !config.origin.startsWith('https://'))
  throw new Error('APP_ORIGIN deve usar HTTPS em produção.');
await fs.mkdir(config.privateDir, { recursive: true });
const lock = path.join(config.privateDir, 'server.lock');
// Conservative single-writer lock; stale files are only removed for dead PIDs.
try {
  const pid = Number(await fs.readFile(lock, 'utf8'));
  let alive = false;
  try {
    process.kill(pid, 0);
    alive = true;
  } catch (error) {
    if (error.code !== 'ESRCH') alive = true;
  }
  if (alive) throw new Error('Outro servidor está usando este armazenamento.');
  await fs.rm(lock);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}
await fs.writeFile(lock, String(process.pid), { flag: 'wx', mode: 0o600 });
const app = createApp(config);
await app.locals.repository.read();
const server = app.listen(config.port, () =>
  console.log(`Bonki: ${config.origin} | Administração: ${config.origin}/admin`),
);
async function shutdown() {
  server.close(async () => {
    await app.locals.repository.queue;
    await fs.rm(lock, { force: true });
    process.exit(0);
  });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
server.on('error', async (error) => {
  await fs.rm(lock, { force: true });
  console.error(error.message);
  process.exit(1);
});
