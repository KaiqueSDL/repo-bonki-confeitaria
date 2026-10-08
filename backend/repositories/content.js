import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { AppError } from '../middleware/errors.js';

export async function atomicJSON(filename, content) {
  await fs.mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${randomUUID()}.tmp`;
  const handle = await fs.open(temporary, 'wx', 0o600);
  try {
    await handle.writeFile(JSON.stringify(content, null, 2) + '\n');
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await fs.rename(temporary, filename);
  } catch (error) {
    await fs.rm(temporary, { force: true });
    throw error;
  }
  // Persist the directory entry where supported (Windows does not support this).
  try {
    const directory = await fs.open(path.dirname(filename), 'r');
    try {
      await directory.sync();
    } finally {
      await directory.close();
    }
  } catch {}
}

/** All content transactions share one queue. A process lock prevents two servers
 * from writing the same repository; If-Match prevents stale administrator edits. */
export class ContentRepository {
  constructor(config) {
    this.filename = path.join(config.dataDir, 'content.json');
    this.backups = path.join(config.privateDir, 'backups');
    this.queue = Promise.resolve();
  }
  async read() {
    return JSON.parse(await fs.readFile(this.filename, 'utf8'));
  }
  async transaction(version, operation) {
    const execute = async () => {
      const current = await this.read();
      if (!Number.isSafeInteger(version))
        throw new AppError(428, 'Recarregue os dados antes de salvar.');
      if (current.revision !== version)
        throw new AppError(409, 'O conteúdo mudou em outra operação. Recarregue antes de salvar.');
      const next = structuredClone(current);
      const result = await operation(next);
      next.revision += 1;
      await atomicJSON(
        path.join(this.backups, `${current.revision}-${randomUUID()}.json`),
        current,
      );
      await atomicJSON(this.filename, next);
      return { result, revision: next.revision };
    };
    const pending = this.queue.then(execute);
    this.queue = pending.catch(() => {});
    return pending;
  }
}
