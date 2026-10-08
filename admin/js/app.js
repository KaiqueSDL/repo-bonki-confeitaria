import { state, request, loadContent } from './services/api.js';
import { notify, busy } from './components/forms.js';
import { dashboard } from './pages/dashboard.js';
import { productList, productEditor } from './pages/products.js';
import { carouselList, slideEditor } from './pages/carousel.js';
import { categoryList, categoryEditor } from './pages/categories.js';
import { historyEditor } from './pages/history.js';
import { settingsEditor } from './pages/settings.js';
import { mediaPage } from './pages/media.js';

function renderPage() {
  const [page = 'dashboard', id] = (location.hash || '#/dashboard').replace('#/', '').split('/');
  const container = document.querySelector('#content');
  container.setAttribute('aria-busy', 'false');
  document
    .querySelectorAll('nav a')
    .forEach((link) => link.classList.toggle('on', link.hash === '#/' + page));
  const goBack = () => {
    location.hash = '#/' + page;
  };
  const pages = {
    dashboard: () => dashboard(container),
    products: () =>
      id ? productEditor(container, id, goBack) : productList(container, renderPage),
    carousel: () => (id ? slideEditor(container, id, goBack) : carouselList(container, renderPage)),
    categories: () =>
      id ? categoryEditor(container, id, goBack) : categoryList(container, renderPage),
    history: () => historyEditor(container, renderPage),
    home: () => settingsEditor(container, 'home', renderPage),
    settings: () => settingsEditor(container, 'settings', renderPage),
    media: () => mediaPage(container, renderPage),
  };
  try {
    (pages[page] || pages.dashboard)();
  } catch (error) {
    notify(error.message, true);
  }
}
window.addEventListener('hashchange', () => {
  renderPage();
  window.scrollTo(0, 0);
});
document.querySelector('#close-preview').onclick = () => document.querySelector('#preview').close();
document.querySelector('#logout').onclick = (event) =>
  busy(event.target, async () => {
    await request('/api/auth/logout', { method: 'POST' });
    location.href = '/admin/login';
  });
async function initialize() {
  try {
    state.session = await request('/api/auth/session');
    document.querySelector('#account').textContent = state.session.username;
    await loadContent();
    renderPage();
  } catch (error) {
    notify(error.message, true);
  }
}
initialize();
