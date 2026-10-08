import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import path from 'node:path';
import sharp from 'sharp';
import { fixture } from './helpers.js';

async function startServer(config, origin) {
  const child = spawn(process.execPath, [path.join(config.root, 'backend/server.js')], {
    cwd: config.root,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      PORT: new URL(origin).port,
      APP_ORIGIN: origin,
      DATA_DIR: config.dataDir,
      UPLOADS_DIR: config.uploadsDir,
      PRIVATE_DIR: config.privateDir,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill();
      reject(new Error('Servidor não iniciou.'));
    }, 5000);
    child.stderr.on('data', (data) => {
      if (data.toString().includes('Error:')) {
        clearTimeout(timeout);
        reject(new Error(data.toString()));
      }
    });
    child.once('exit', (code) => {
      clearTimeout(timeout);
      if (code !== 0) reject(new Error('Servidor encerrou durante a inicialização.'));
    });
    child.stdout.on('data', (data) => {
      if (data.toString().includes('Bonki:')) {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
  return child;
}
async function stop(child) {
  if (!child || child.exitCode !== null) return;
  await new Promise((resolve) => {
    child.once('exit', resolve);
    child.kill('SIGTERM');
  });
}
test('reinício real do processo: JSON, upload e credenciais persistem; sessão é revogada', async () => {
  const fixtureData = await fixture();
  await fixtureData.close();
  let child;
  try {
    child = await startServer(fixtureData.config, fixtureData.origin);
    const login = await fetch(fixtureData.origin + '/api/auth/login', {
      method: 'POST',
      headers: { Origin: fixtureData.origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test-admin', password: 'senha-de-teste-123456' }),
    });
    const session = await login.json(),
      cookie = login.headers.get('set-cookie').split(';')[0];
    const data = await (await fetch(fixtureData.origin + '/api/content')).json();
    const buffer = await sharp({
      create: { width: 20, height: 20, channels: 3, background: '#1f4e4a' },
    })
      .png()
      .toBuffer();
    const form = new FormData();
    form.append('image', new Blob([buffer], { type: 'image/png' }), 'reinicio.png');
    form.append('bucket', 'products');
    form.append('alt', 'Imagem persistente');
    const upload = await fetch(fixtureData.origin + '/api/admin/media/upload', {
      method: 'POST',
      headers: {
        Origin: fixtureData.origin,
        Cookie: cookie,
        'X-CSRF-Token': session.csrf,
        'If-Match': String(data.revision),
      },
      body: form,
    });
    assert.equal(upload.status, 200);
    const uploaded = await upload.json();
    const product = { ...data.products[0], price: 17.5, imageId: uploaded.data.id };
    const update = await fetch(fixtureData.origin + '/api/admin/products/' + product.id, {
      method: 'PUT',
      headers: {
        Origin: fixtureData.origin,
        Cookie: cookie,
        'X-CSRF-Token': session.csrf,
        'If-Match': String(uploaded.revision),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(product),
    });
    assert.equal(update.status, 200);
    await stop(child);
    child = await startServer(fixtureData.config, fixtureData.origin);
    const restarted = await (
      await fetch(fixtureData.origin + '/api/products/' + product.id)
    ).json();
    assert.equal(restarted.data.price, 17.5);
    assert.equal(restarted.data.image.path, uploaded.data.path);
    assert.equal((await fetch(fixtureData.origin + uploaded.data.path)).status, 200);
    assert.equal(
      (await fetch(fixtureData.origin + '/api/auth/session', { headers: { Cookie: cookie } }))
        .status,
      401,
    );
    const relogin = await fetch(fixtureData.origin + '/api/auth/login', {
      method: 'POST',
      headers: { Origin: fixtureData.origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test-admin', password: 'senha-de-teste-123456' }),
    });
    assert.equal(relogin.status, 200);
  } finally {
    await stop(child);
    await fixtureData.cleanup();
  }
});
