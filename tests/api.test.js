import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { fixture } from './helpers.js';
import { createApp } from '../backend/app.js';
import { once } from 'node:events';

async function using(run) {
  const f = await fixture();
  try {
    await run(f);
  } finally {
    await f.cleanup();
  }
}
const newProduct = (data) => ({
  ...data.products[0],
  name: 'Produto de teste',
  featured: true,
  price: 12.99,
});

test('migração: catálogo original, imagens físicas e nenhum Base64 público', () =>
  using(async (f) => {
    const { result } = await f.call('/api/content');
    assert.equal(result.products.length, 11);
    assert.equal(result.carousel.slides.length, 3);
    assert.equal(result.history.timeline.length, 4);
    assert.equal(result.settings.contact.whatsapp, '5511947511238');
    assert(!JSON.stringify(result).includes('base64'));
    for (const product of result.products) {
      assert.equal((await f.call(product.image.path)).response.status, 200);
    }
    assert.equal((await f.call('/data/content.json')).response.status, 404);
    assert.equal((await f.call('/private/auth.json')).response.status, 404);
  }));
test('autenticação: login, cookie seguro, sessão, painel protegido e logout', () =>
  using(async (f) => {
    assert.equal((await f.call('/api/admin/content', { auth: false })).response.status, 401);
    assert.equal((await f.call('/admin', { auth: false })).response.status, 302);
    const login = await f.login();
    assert.equal(login.response.status, 200);
    assert.match(login.response.headers.get('set-cookie'), /HttpOnly/);
    assert.match(login.response.headers.get('set-cookie'), /SameSite=Strict/);
    assert.equal((await f.call('/api/auth/session')).result.username, 'test-admin');
    assert.equal((await f.call('/admin/')).response.status, 200);
    await f.call('/api/auth/logout', { method: 'POST' });
    assert.equal((await f.call('/api/auth/session')).response.status, 401);
  }));
test('segurança: escrita sem sessão, CSRF, origem e esquema são bloqueados', () =>
  using(async (f) => {
    assert.equal(
      (await f.call('/api/admin/products', { method: 'POST', body: {}, auth: false })).response
        .status,
      401,
    );
    await f.login();
    const data = (await f.call('/api/content')).result;
    assert.equal(
      (
        await f.call('/api/admin/products', {
          method: 'POST',
          body: newProduct(data),
          headers: { 'X-CSRF-Token': '' },
        })
      ).response.status,
      403,
    );
    assert.equal(
      (
        await f.call('/api/admin/products', {
          method: 'POST',
          body: newProduct(data),
          headers: { Origin: 'https://evil.invalid' },
        })
      ).response.status,
      403,
    );
    assert.equal(
      (
        await f.call('/api/admin/products', {
          method: 'POST',
          body: { ...newProduct(data), price: -1 },
        })
      ).response.status,
      400,
    );
    assert.equal(
      (
        await f.call('/api/admin/products', {
          method: 'POST',
          body: { ...newProduct(data), categoryId: 'invalid' },
        })
      ).response.status,
      400,
    );
  }));
test('produtos: criar, editar, duplicar, ocultar, excluir e manter destaques', () =>
  using(async (f) => {
    await f.login();
    const data = (await f.call('/api/content')).result;
    const created = await f.call('/api/admin/products', { method: 'POST', body: newProduct(data) });
    assert.equal(created.response.status, 200);
    const id = created.result.data.id;
    assert(
      (await f.call('/api/content')).result.products.some(
        (product) => product.id === id && product.featured,
      ),
    );
    const updated = {
      ...created.result.data,
      description: 'Descrição atualizada',
      price: 15,
      imageId: data.products[1].imageId,
    };
    await f.call('/api/admin/products/' + id, { method: 'PUT', body: updated });
    assert.equal((await f.call('/api/products/' + id)).result.data.price, 15);
    const duplicate = await f.call('/api/admin/products', {
      method: 'POST',
      body: { ...updated, name: 'Cópia' },
    });
    assert.notEqual(duplicate.result.data.id, id);
    await f.call('/api/admin/products/' + id, {
      method: 'PUT',
      body: { ...updated, active: false },
    });
    assert.equal((await f.call('/api/products/' + id)).response.status, 404);
    await f.call('/api/admin/products/' + id, { method: 'DELETE' });
    assert(
      !(await f.call('/api/admin/content')).result.products.some((product) => product.id === id),
    );
    assert((await fs.readdir(path.join(f.config.privateDir, 'backups'))).length >= 5);
  }));
test('categorias: nomes estáveis, filtros e exclusões com referências protegidas', () =>
  using(async (f) => {
    await f.login();
    const data = (await f.call('/api/admin/content')).result,
      category = data.categories[0];
    await f.call('/api/admin/categories/' + category.id, {
      method: 'PUT',
      body: { ...category, name: 'Cookies artesanais' },
    });
    assert.equal(
      (await f.call('/api/content')).result.products.find(
        (product) => product.categoryId === category.id,
      ).category,
      'Cookies artesanais',
    );
    assert.equal(
      (await f.call('/api/admin/categories/' + category.id, { method: 'DELETE' })).response.status,
      409,
    );
    assert.equal(
      (
        await f.call('/api/admin/categories/' + category.id, {
          method: 'PUT',
          body: { ...category, subcategories: [] },
        })
      ).response.status,
      400,
    );
    await f.call('/api/admin/categories/' + category.id, {
      method: 'PUT',
      body: { ...category, active: false },
    });
    assert(
      !(await f.call('/api/content')).result.products.some(
        (product) => product.categoryId === category.id,
      ),
    );
  }));
test('carrossel, história e configurações são editáveis, ordenados e persistentes', () =>
  using(async (f) => {
    await f.login();
    const data = (await f.call('/api/admin/content')).result,
      slide = data.carousel.slides[0];
    const created = await f.call('/api/admin/carousel', {
      method: 'POST',
      body: { ...slide, title: 'Novo slide', order: 0 },
    });
    assert.equal((await f.call('/api/carousel')).result.data.slides[0].title, 'Novo slide');
    assert.equal(
      (
        await f.call('/api/admin/carousel/' + slide.id, {
          method: 'PUT',
          body: { ...slide, button: { text: 'Ataque', url: 'javascript:alert(1)' } },
        })
      ).response.status,
      400,
    );
    await f.call('/api/admin/carousel-settings', {
      method: 'PUT',
      body: { ...data.carousel.settings, autoplay: false, interval: 8000 },
    });
    await f.call('/api/admin/history', {
      method: 'PUT',
      body: {
        ...data.history,
        title: 'História editada',
        paragraphs: ['Parágrafo preservado e editado'],
      },
    });
    const settings = structuredClone(data.settings);
    settings.contact.whatsapp = '5511999999999';
    settings.home.featuredTitle = 'Novos destaques';
    await f.call('/api/admin/settings', { method: 'PUT', body: settings });
    await f.call('/api/admin/carousel/' + created.result.data.id, { method: 'DELETE' });
    const persisted = JSON.parse(
      await fs.readFile(path.join(f.config.dataDir, 'content.json'), 'utf8'),
    );
    assert.equal(persisted.history.title, 'História editada');
    assert.equal(persisted.settings.contact.whatsapp, '5511999999999');
    const restarted = createApp(f.config),
      server = restarted.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/content`);
      assert.equal((await response.json()).settings.home.featuredTitle, 'Novos destaques');
    } finally {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    }
  }));
test('mídia: upload real, metadados, reutilização, exclusão segura e persistência', () =>
  using(async (f) => {
    await f.login();
    const buffer = await sharp({
      create: { width: 30, height: 20, channels: 3, background: '#c8873a' },
    })
      .png()
      .toBuffer();
    const form = new FormData();
    form.append('image', new Blob([buffer], { type: 'image/png' }), '../../cookie.png');
    form.append('bucket', 'products');
    form.append('alt', 'Cookie de teste');
    const upload = await f.call('/api/admin/media/upload', { method: 'POST', body: form });
    assert.equal(upload.response.status, 200);
    const image = upload.result.data;
    assert.match(image.path, /^\/uploads\/products\/[a-f0-9-]+\.webp$/);
    assert.equal(
      (
        await sharp(
          await fs.readFile(path.join(f.config.uploadsDir, 'products', image.filename)),
        ).metadata()
      ).format,
      'webp',
    );
    assert.equal((await f.call(image.path)).response.status, 200);
    const current = (await f.call('/api/admin/content')).result,
      product = current.products[0];
    await f.call('/api/admin/products/' + product.id, {
      method: 'PUT',
      body: { ...product, imageId: image.id },
    });
    assert.equal(
      (await f.call('/api/admin/media/' + image.id, { method: 'DELETE' })).response.status,
      409,
    );
    assert(
      (await f.call('/api/admin/media')).result.data.find((media) => media.id === image.id).uses
        .length,
    );
    await f.call('/api/admin/products/' + product.id, { method: 'PUT', body: product });
    await f.call('/api/admin/media/' + image.id, { method: 'PUT', body: { alt: 'Novo texto' } });
    assert.equal(
      (await f.call('/api/admin/media/' + image.id, { method: 'DELETE' })).response.status,
      200,
    );
    assert.equal((await f.call(image.path)).response.status, 404);
    assert.equal(
      (await fs.readFile(path.join(f.config.privateDir, 'media-trash', image.filename))).length > 0,
      true,
    );
    const invalid = new FormData();
    invalid.append('image', new Blob(['<script>bad</script>'], { type: 'image/png' }), 'false.png');
    invalid.append('bucket', 'products');
    invalid.append('alt', 'Arquivo falso');
    assert.equal(
      (await f.call('/api/admin/media/upload', { method: 'POST', body: invalid })).response.status,
      400,
    );
  }));
test('concorrência: mesma versão produz um sucesso e um conflito, sem perda de dados', () =>
  using(async (f) => {
    await f.login();
    const data = (await f.call('/api/admin/content')).result,
      version = data.revision;
    const send = (product) =>
      fetch(f.origin + '/api/admin/products/' + product.id, {
        method: 'PUT',
        headers: {
          Origin: f.origin,
          Cookie: f.cookie,
          'X-CSRF-Token': f.csrf,
          'If-Match': String(version),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...product, price: 19 }),
      });
    const results = await Promise.all([send(data.products[0]), send(data.products[1])]);
    assert.deepEqual(results.map((response) => response.status).sort(), [200, 409]);
    const current = await f.app.locals.repository.read();
    assert.equal(current.revision, version + 1);
  }));
test('abuso de login: limite de tentativas e senha fora dos dados públicos', () =>
  using(async (f) => {
    for (let attempt = 0; attempt < 8; attempt++)
      assert.equal(
        (
          await f.call('/api/auth/login', {
            method: 'POST',
            body: { username: 'test-admin', password: 'errada' },
            auth: false,
          })
        ).response.status,
        401,
      );
    assert.equal((await f.login()).response.status, 429);
    const privateData = JSON.parse(
      await fs.readFile(path.join(f.config.privateDir, 'auth.json'), 'utf8'),
    );
    assert.equal(privateData.algorithm, 'scrypt');
    assert(!JSON.stringify(privateData).includes('senha-de-teste'));
  }));

test('biblioteca: substituição compartilhada atualiza referências em uma única transação', () =>
  using(async (f) => {
    await f.login();
    const current = (await f.call('/api/admin/content')).result;
    const old = current.products.find((product) => product.id === 'black-triplo').imageId;
    const replacement = current.products.find((product) => product.id === 'pote-latte').imageId;
    const response = await f.call('/api/admin/media/' + old + '/replace', {
      method: 'PUT',
      body: { replacementId: replacement },
    });
    assert.equal(response.response.status, 200);
    const updated = (await f.call('/api/admin/content')).result;
    assert.equal(
      updated.products.find((product) => product.id === 'black-triplo').imageId,
      replacement,
    );
    assert.equal(updated.carousel.slides[1].imageIds[0], replacement);
    assert.equal(updated.media.find((image) => image.id === old).uses.length, 0);
  }));
