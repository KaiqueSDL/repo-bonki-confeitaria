import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import vm from 'node:vm';
import { fixture } from './helpers.js';

async function publicDOM(fixture, stored = []) {
  const html = await fs.readFile(path.join(fixture.config.root, 'frontend/index.html'), 'utf8');
  const dom = new JSDOM(html, {
    url: fixture.origin,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const window = dom.window;
  window.eval = (code) => vm.runInContext(code, dom.getInternalVMContext());
  window.fetch = (url, options) => fetch(new URL(url, fixture.origin), options);
  window.scrollTo = () => {};
  window.matchMedia = () => ({ matches: false });
  window.IntersectionObserver = class {
    constructor(callback) {
      this.callback = callback;
    }
    observe(target) {
      this.callback([{ target, isIntersecting: true }]);
    }
    unobserve() {}
    disconnect() {}
  };
  window.localStorage.setItem('bonki-cart', JSON.stringify(stored));
  for (const script of window.document.querySelectorAll('script[src]'))
    window.eval(
      await fs.readFile(
        path.join(fixture.config.root, 'frontend', script.getAttribute('src')),
        'utf8',
      ),
    );
  await window.eval('refreshContent().then(render)');
  return dom;
}

test('site público: navegação, cards, modal, filtros, carrinho e WhatsApp via DOM real', async () => {
  const f = await fixture();
  let dom;
  try {
    dom = await publicDOM(f);
    const window = dom.window,
      document = window.document;
    assert.equal(document.querySelectorAll('.slide').length, 3);
    assert.equal(document.querySelectorAll('.stack img').length, 3);
    document.querySelector('[data-add]').click();
    assert.equal(window.eval('count()'), 1);
    const firstID = window.eval('cart[0].id');
    window.eval(`openModal(${JSON.stringify(firstID)})`);
    assert(document.querySelector('#modal').classList.contains('on'));
    document.querySelector('#modal [data-p]').click();
    document.querySelector('#mAdd').click();
    assert.equal(window.eval('count()'), 3);
    window.location.hash = '#/cardapio';
    window.eval('render()');
    const search = document.querySelector('#q');
    search.value = 'latte';
    search.dispatchEvent(new window.Event('input', { bubbles: true }));
    assert.equal(document.querySelectorAll('#list .card').length, 1);
    assert(document.querySelector('#list').textContent.includes('Pote Latte'));
    search.value = '<img src=x onerror=alert(1)>';
    search.dispatchEvent(new window.Event('input', { bubbles: true }));
    window.eval('render()');
    assert.equal(document.querySelectorAll('#q img').length, 0);
    assert.equal(document.querySelector('#q').value, search.value);
    window.location.hash = '#/carrinho';
    window.eval('render()');
    assert(document.querySelector('.crow'));
    document.querySelector('.crow [data-m]').click();
    assert.equal(window.eval('count()'), 2);
    assert.equal(window.eval('total()'), 26);
    assert(window.eval('msgCart()').includes('2x Choco Chip - Clássico'));
    assert(window.eval('waLink(msgCart())').startsWith('https://wa.me/5511947511238?text='));
    const stored = window.localStorage.getItem('bonki-cart');
    dom.window.close();
    dom = await publicDOM(f, JSON.parse(stored));
    assert.equal(dom.window.eval('count()'), 2);
  } finally {
    dom?.window.close();
    await f.cleanup();
  }
});
test('carrinhos antigos: produtos removidos e indisponíveis não causam erro', async () => {
  const f = await fixture();
  let dom;
  try {
    dom = await publicDOM(f, [{ id: 'nao-existe', qty: 2, name: 'Produto antigo' }]);
    dom.window.location.hash = '#/carrinho';
    dom.window.eval('render()');
    assert(dom.window.document.querySelector('#checkout').disabled);
    assert.match(dom.window.document.querySelector('#app').textContent, /Indisponível ou removido/);
    dom.window.document.querySelector('[data-del]').click();
    assert.equal(dom.window.eval('count()'), 0);
    await f.login();
    const product = (await f.call('/api/admin/content')).result.products[0];
    await f.call('/api/admin/products/' + product.id, {
      method: 'PUT',
      body: { ...product, available: false },
    });
    await dom.window.eval('refreshContent().then(render)');
    assert.equal(
      dom.window.eval(`card(byId(${JSON.stringify(product.id)})).includes('data-add=')`),
      false,
    );
  } finally {
    dom?.window.close();
    await f.cleanup();
  }
});
test('finalização: preços novos exigem revisão; pedidos usam dados atualizados', async () => {
  const f = await fixture();
  let dom;
  try {
    dom = await publicDOM(f);
    dom.window.eval("add('choco-chip',2)");
    let popup;
    dom.window.open = () => {
      popup = {
        location: {},
        close() {
          this.closed = true;
        },
      };
      return popup;
    };
    await f.login();
    const product = (await f.call('/api/admin/content')).result.products.find(
      (product) => product.id === 'choco-chip',
    );
    await f.call('/api/admin/products/' + product.id, {
      method: 'PUT',
      body: { ...product, price: 15 },
    });
    await dom.window.eval('finalizeOrder({preventDefault(){}})');
    assert(popup.closed);
    assert.equal(dom.window.eval('total()'), 30);
    await dom.window.eval('finalizeOrder({preventDefault(){}})');
    assert(popup.location.href.includes('wa.me'));
    assert(decodeURIComponent(popup.location.href).includes('R$ 30,00'));
    await f.call('/api/admin/products/' + product.id, { method: 'DELETE' });
    await dom.window.eval('finalizeOrder({preventDefault(){}})');
    assert(popup.closed);
    assert(dom.window.document.querySelector('#checkout').disabled);
  } finally {
    dom?.window.close();
    await f.cleanup();
  }
});
test('XSS: conteúdo administrável é exibido como texto, incluindo atributos', async () => {
  const f = await fixture();
  let dom;
  try {
    await f.login();
    const product = (await f.call('/api/admin/content')).result.products[0];
    const malicious = '<img src=x onerror="window.hacked=true">';
    await f.call('/api/admin/products/' + product.id, {
      method: 'PUT',
      body: { ...product, name: malicious, description: malicious, featured: true },
    });
    dom = await publicDOM(f);
    assert.equal(dom.window.document.querySelectorAll('[onerror]').length, 0);
    assert.equal(dom.window.hacked, undefined);
    assert(dom.window.document.querySelector('#app').textContent.includes(malicious));
  } finally {
    dom?.window.close();
    await f.cleanup();
  }
});
