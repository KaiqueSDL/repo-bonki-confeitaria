import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { projectRoot } from '../backend/config.js';
import { createApp } from '../backend/app.js';
import { createAdministrator } from '../backend/services/auth.js';

export async function fixture() {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'bonki-test-'));
  const config = {
    root: projectRoot,
    dataDir: path.join(directory, 'data'),
    uploadsDir: path.join(directory, 'uploads'),
    privateDir: path.join(directory, 'private'),
    production: false,
  };
  await fs.cp(path.join(projectRoot, 'data'), config.dataDir, { recursive: true });
  await fs.cp(path.join(projectRoot, 'uploads'), config.uploadsDir, { recursive: true });
  await createAdministrator(config, 'test-admin', 'senha-de-teste-123456');
  const app = createApp(config),
    server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  app.locals.config.origin = origin;
  let cookie = '',
    csrf = '',
    revision = 1;
  async function call(endpoint, { method = 'GET', body, auth = true, headers = {} } = {}) {
    const requestHeaders = { Origin: origin, ...headers };
    if (auth && cookie) requestHeaders.Cookie = cookie;
    if (method !== 'GET' && auth) {
      requestHeaders['X-CSRF-Token'] = csrf;
      requestHeaders['If-Match'] = String(revision);
    }
    if (body && !(body instanceof FormData)) {
      requestHeaders['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }
    Object.assign(requestHeaders, headers);
    const response = await fetch(origin + endpoint, {
      method,
      headers: requestHeaders,
      body,
      redirect: 'manual',
    });
    if (response.headers.get('set-cookie'))
      cookie = response.headers.get('set-cookie').split(';')[0];
    const result = (response.headers.get('content-type') || '').includes('json')
      ? await response.json()
      : await response.text();
    if (result.csrf) csrf = result.csrf;
    if (result.revision) revision = result.revision;
    return { response, result };
  }
  const login = () =>
    call('/api/auth/login', {
      method: 'POST',
      body: { username: 'test-admin', password: 'senha-de-teste-123456' },
      auth: false,
    });
  async function close() {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  async function cleanup() {
    await close();
    await fs.rm(directory, { recursive: true, force: true });
  }
  return {
    app,
    server,
    config,
    origin,
    call,
    login,
    close,
    cleanup,
    get cookie() {
      return cookie;
    },
    get csrf() {
      return csrf;
    },
    get revision() {
      return revision;
    },
  };
}
