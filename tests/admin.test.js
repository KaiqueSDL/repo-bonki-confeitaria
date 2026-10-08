import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { fixture } from './helpers.js';
import { state, loadContent } from '../admin/js/services/api.js';
import { productEditor, productList } from '../admin/js/pages/products.js';
import { slideEditor } from '../admin/js/pages/carousel.js';
import { categoryEditor } from '../admin/js/pages/categories.js';
import { historyEditor } from '../admin/js/pages/history.js';
import { settingsEditor } from '../admin/js/pages/settings.js';
import { mediaPage } from '../admin/js/pages/media.js';

async function waitFor(predicate) {
  const deadline = Date.now() + 5000;
  while (!predicate()) {
    if (Date.now() > deadline)
      throw new Error(
        'Formulário não confirmou a gravação: ' + document.querySelector('#notice')?.textContent,
      );
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
test('painel: formulários de produto, slide, categoria, história e configurações gravam via API', async () => {
  const f = await fixture(),
    nativeFetch = global.fetch;
  let dom;
  try {
    const login = await f.login();
    state.session = login.result;
    dom = new JSDOM(await fs.readFile(path.join(f.config.root, 'admin/index.html'), 'utf8'), {
      url: f.origin + '/admin/',
    });
    global.document = dom.window.document;
    global.confirm = () => true;
    global.fetch = (url, options = {}) =>
      nativeFetch(new URL(url, f.origin), {
        ...options,
        headers: { ...options.headers, Origin: f.origin, Cookie: f.cookie },
      });
    global.Option = dom.window.Option;
    global.Event = dom.window.Event;
    await loadContent();
    const container = document.querySelector('#content');
    let saved = false;
    productEditor(container, 'new', () => (saved = true));
    let form = container.querySelector('form');
    const product = state.content.products[0];
    for (const [name, data] of Object.entries({
      ...product,
      name: 'Produto pelo formulário',
      description: 'Texto real do formulário',
      price: '14.50',
      order: '20',
    }))
      if (form.elements.namedItem(name) && !['active', 'featured', 'available'].includes(name))
        form.elements.namedItem(name).value = data;
    form.elements.featured.checked = true;
    form.dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
    await waitFor(() => saved);
    assert(
      state.content.products.some(
        (product) => product.name === 'Produto pelo formulário' && product.featured,
      ),
    );
    saved = false;
    slideEditor(container, 'new', () => (saved = true));
    form = container.querySelector('form');
    form.elements.title.value = 'Banner pelo formulário';
    form.elements.description.value = 'Descrição do banner';
    form.elements.image0.value = state.content.media[0].id;
    form.dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
    await waitFor(() => saved);
    assert(state.content.carousel.slides.some((slide) => slide.title === 'Banner pelo formulário'));
    saved = false;
    categoryEditor(container, 'new', () => (saved = true));
    form = container.querySelector('form');
    form.elements.name.value = 'Categoria pelo painel';
    container.querySelector('#add-subcategory').click();
    container.querySelector('[name="subName"]').value = 'Novos sabores';
    form.dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
    await waitFor(() => saved);
    assert(state.content.categories.some((category) => category.name === 'Categoria pelo painel'));
    saved = false;
    historyEditor(container, () => (saved = true));
    form = container.querySelector('form');
    form.elements.title.value = 'Nossa história atualizada';
    container.querySelector('#add-paragraph').click();
    const paragraphs = form.querySelectorAll('[name="paragraph"]');
    paragraphs[paragraphs.length - 1].value = 'Novo parágrafo';
    form.dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
    await waitFor(() => saved);
    assert(state.content.history.paragraphs.includes('Novo parágrafo'));
    saved = false;
    settingsEditor(container, 'home', () => (saved = true));
    form = container.querySelector('form');
    form.elements.home_featuredTitle.value = 'Destaques pelo painel';
    form.dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
    await waitFor(() => saved);
    assert.equal(state.content.settings.home.featuredTitle, 'Destaques pelo painel');
    saved = false;
    settingsEditor(container, 'settings', () => (saved = true));
    form = container.querySelector('form');
    form.elements.contact_whatsapp.value = '5511888888888';
    form.dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
    await waitFor(() => saved);
    assert.equal(state.content.settings.contact.whatsapp, '5511888888888');
    productList(container, () => {});
    const search = container.querySelector('#product-search');
    search.value = 'Produto pelo formulário';
    search.dispatchEvent(new dom.window.Event('input'));
    assert.equal(container.querySelectorAll('tbody tr').length, 1);
    mediaPage(container, () => {});
    assert.equal(container.querySelectorAll('.media-item').length, 13);
    assert(container.textContent.includes('Carrossel:'));
  } finally {
    global.fetch = nativeFetch;
    dom?.window.close();
    delete global.document;
    delete global.confirm;
    delete global.Option;
    delete global.Event;
    await f.cleanup();
  }
});
