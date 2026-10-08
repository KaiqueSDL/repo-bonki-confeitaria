let CONFIG = {},
  PRODUCTS = [],
  CATEGORIES = [],
  CAROUSEL = {},
  HISTORY = {},
  SETTINGS = {};
let ready = false;
let contentRevision = 0;

async function refreshContent() {
  const response = await fetch('/api/content', { cache: 'no-store' });
  if (!response.ok) throw new Error('Não foi possível carregar o catálogo. Tente novamente.');
  const data = await response.json();
  contentRevision = data.revision;
  SETTINGS = data.settings;
  HISTORY = data.history;
  CAROUSEL = data.carousel;
  CATEGORIES = data.categories;
  // Adapter preserves the existing renderer contracts.
  CONFIG = {
    nome: SETTINGS.brand.name,
    whatsapp: SETTINGS.contact.whatsapp,
    instagram: SETTINGS.contact.instagram,
    email: SETTINGS.contact.email,
    avisos: SETTINGS.notices,
  };
  PRODUCTS = data.products.map((product) => ({
    ...product,
    image: product.image?.path || '',
    imageAlt: product.image?.alt || product.name,
  }));
  document
    .querySelectorAll('[data-brand]')
    .forEach((element) => (element.textContent = SETTINGS.brand.logoText));
  document
    .querySelectorAll('[data-subtitle]')
    .forEach((element) => (element.textContent = SETTINGS.brand.logoSubtitle));
  document.querySelector('.sidefoot').textContent = SETTINGS.brand.sidebarText;
  document.querySelector('meta[name="description"]').content = SETTINGS.seo.description;
  document.querySelector('meta[property="og:title"]').content = SETTINGS.seo.title;
  document.querySelector('meta[property="og:description"]').content = SETTINGS.seo.description;
  ready = true;
}
