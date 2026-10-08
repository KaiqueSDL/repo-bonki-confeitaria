import fs from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { projectRoot } from '../backend/config.js';

async function files(directory) {
  const result = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await files(filename)));
    else result.push(filename);
  }
  return result;
}
let count = 0;
for (const folder of ['backend', 'admin', 'frontend', 'scripts', 'tests']) {
  for (const filename of await files(path.join(projectRoot, folder))) {
    if (!filename.endsWith('.js')) continue;
    const check = spawnSync(process.execPath, ['--check', filename], { encoding: 'utf8' });
    if (check.status !== 0) throw new Error(check.stderr);
    const source = await fs.readFile(filename, 'utf8');
    for (const match of source.matchAll(/from\s+['"](\.\.?\/[^'"]+)['"]/g))
      await fs.access(path.resolve(path.dirname(filename), match[1]));
    count++;
  }
}
for (const document of ['frontend/index.html', 'admin/index.html', 'admin/login.html']) {
  const source = await fs.readFile(path.join(projectRoot, document), 'utf8');
  for (const match of source.matchAll(/(?:src|href)="([^"]+)"/g)) {
    const reference = match[1];
    if (reference.startsWith('http') || reference.startsWith('#') || reference === '/') continue;
    let target;
    if (reference.startsWith('/admin/login-assets/'))
      target = path.join(
        projectRoot,
        'admin/login-assets',
        reference.slice('/admin/login-assets/'.length),
      );
    else if (reference.startsWith('/admin/'))
      target = path.join(projectRoot, 'admin', reference.slice('/admin/'.length));
    else if (reference.startsWith('/assets/'))
      target = path.join(projectRoot, 'frontend', reference);
    else target = path.join(projectRoot, path.dirname(document), reference);
    await fs.access(target);
  }
}
const data = JSON.parse(await fs.readFile(path.join(projectRoot, 'data/content.json'), 'utf8'));
for (const image of data.media)
  await fs.access(path.join(projectRoot, 'uploads', image.path.slice('/uploads/'.length)));
console.log(
  `OK: sintaxe de ${count} arquivos JavaScript, imports locais, documentos e ${data.media.length} imagens.`,
);
