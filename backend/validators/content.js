import { AppError } from '../middleware/errors.js';
const fail = (message) => {
  throw new AppError(400, message);
};
const object = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('Objeto inválido.');
  return value;
};
function text(value, label, max = 200, empty = false) {
  if (typeof value !== 'string' || value.length > max || (!empty && !value.trim()))
    fail(`Campo inválido: ${label}.`);
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(value))
    fail(`Caracteres inválidos: ${label}.`);
  return value.trim();
}
function bool(value) {
  if (typeof value !== 'boolean') fail('Status deve ser verdadeiro ou falso.');
  return value;
}
function order(value) {
  if (!Number.isInteger(value) || value < 0 || value > 10000) fail('Ordem inválida.');
  return value;
}
function array(value, max = 100) {
  if (!Array.isArray(value) || value.length > max) fail('Lista inválida.');
  return value;
}
export function mediaId(id, data, optional = false) {
  if (optional && (id === null || id === '')) return null;
  if (typeof id !== 'string' || !data.media.some((m) => m.id === id))
    fail('Selecione uma imagem da biblioteca.');
  return id;
}
export function safeURL(url) {
  const value = text(url, 'Destino do botão', 500);
  if (!['#/', '#/cardapio', '#/historia', '#/carrinho'].includes(value)) {
    let parsed;
    try {
      parsed = new URL(value);
    } catch {
      fail('Use uma rota do site ou URL HTTPS.');
    }
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password)
      fail('Destino inválido.');
  }
  return value;
}
export function product(value, data) {
  const v = object(value);
  const category = data.categories.find((c) => c.id === v.categoryId);
  if (!category || !category.subcategories.some((s) => s.id === v.subcategoryId))
    fail('Categoria ou subcategoria inexistente.');
  if (
    typeof v.price !== 'number' ||
    !Number.isFinite(v.price) ||
    v.price < 0 ||
    v.price > 100000 ||
    Math.abs(v.price * 100 - Math.round(v.price * 100)) > 1e-6
  )
    fail('Preço inválido; use até duas casas decimais.');
  return {
    name: text(v.name, 'Nome'),
    description: text(v.description, 'Descrição', 5000),
    flavor: text(v.flavor, 'Sabor', 200, true),
    size: text(v.size, 'Tamanho', 100, true),
    categoryId: category.id,
    subcategoryId: v.subcategoryId,
    imageId: mediaId(v.imageId, data),
    price: v.price,
    currency: 'BRL',
    active: bool(v.active),
    available: bool(v.available),
    featured: bool(v.featured),
    order: order(v.order),
  };
}
export function slide(value, data) {
  const v = object(value);
  const images = array(v.imageIds, 3);
  if (!images.length) fail('O slide precisa de imagem.');
  const layout = v.layout === 'stack' ? 'stack' : 'single';
  if (layout === 'single' && images.length !== 1) fail('O slide simples usa uma imagem.');
  return {
    title: text(v.title, 'Título'),
    description: text(v.description, 'Descrição', 1000, true),
    layout,
    imageIds: images.map((id) => mediaId(id, data)),
    button: { text: text(v.button?.text, 'Botão', 100), url: safeURL(v.button?.url) },
    active: bool(v.active),
    order: order(v.order),
  };
}
export function category(value, previous) {
  const v = object(value);
  const ids = new Set();
  const subcategories = array(v.subcategories, 50).map((s) => {
    const id = text(s.id, 'ID', 100);
    if (!/^[a-zA-Z0-9-]+$/.test(id) || ids.has(id))
      fail('ID de subcategoria inválido ou duplicado.');
    ids.add(id);
    return {
      id,
      name: text(s.name, 'Subcategoria'),
      active: bool(s.active),
      order: order(s.order),
    };
  });
  if (!subcategories.length) fail('Cadastre ao menos uma subcategoria.');
  if (new Set(subcategories.map((s) => s.name.toLowerCase())).size !== subcategories.length)
    fail('Nomes de subcategorias duplicados.');
  return {
    name: text(v.name, 'Categoria'),
    active: bool(v.active),
    order: order(v.order),
    subcategories,
  };
}
export function carouselSettings(v) {
  object(v);
  if (
    !Number.isInteger(v.interval) ||
    v.interval < 2000 ||
    v.interval > 60000 ||
    !Number.isInteger(v.transition) ||
    v.transition < 0 ||
    v.transition > 3000
  )
    fail('Intervalo ou transição inválidos.');
  return {
    autoplay: bool(v.autoplay),
    interval: v.interval,
    transition: v.transition,
    showIndicators: bool(v.showIndicators),
    showArrows: bool(v.showArrows),
  };
}
export function history(v, data) {
  object(v);
  const ids = new Set();
  return {
    title: text(v.title, 'Título'),
    subtitle: text(v.subtitle, 'Subtítulo'),
    eyebrow: text(v.eyebrow, 'Chamada'),
    foundersImageId: mediaId(v.foundersImageId, data, true),
    paragraphs: array(v.paragraphs, 50).map((p) => text(p, 'Parágrafo', 5000)),
    timeline: array(v.timeline, 100).map((e) => {
      const id = text(e.id, 'ID', 100);
      if (ids.has(id)) fail('Evento duplicado.');
      ids.add(id);
      return {
        id,
        year: text(e.year, 'Ano', 30),
        title: text(e.title, 'Título'),
        description: text(e.description, 'Descrição', 2000),
        order: order(e.order),
      };
    }),
    ctaTitle: text(v.ctaTitle, 'Chamada final', 500),
    ctaText: text(v.ctaText, 'Texto final', 1000, true),
    ctaButton: text(v.ctaButton, 'Botão', 100),
  };
}
export function settings(v, data) {
  object(v);
  // Allow only fields from the seed schema, so secrets cannot enter the public document.
  const out = {};
  for (const group of ['brand', 'contact', 'home', 'footer', 'messages', 'seo']) {
    object(v[group]);
    out[group] = {};
    for (const key of Object.keys(data.settings[group])) {
      if (key === 'aboutImageId') out[group][key] = mediaId(v[group][key], data, true);
      else
        out[group][key] = text(
          v[group][key],
          `${group}.${key}`,
          group === 'messages' || key.endsWith('Text') || key === 'sidebarText' ? 5000 : 1000,
          ['email', 'instagram', 'slogan'].includes(key),
        );
    }
  }
  if (!/^\d{10,15}$/.test(out.contact.whatsapp))
    fail('WhatsApp: informe DDI, DDD e número, somente dígitos.');
  if (out.contact.instagram && !/^[\w.]{1,30}$/.test(out.contact.instagram))
    fail('Instagram inválido.');
  if (out.contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out.contact.email))
    fail('E-mail inválido.');
  out.notices = array(v.notices, 30).map((n) => text(n, 'Aviso', 1000));
  return out;
}
export function altText(v) {
  return text(v, 'Texto alternativo', 300);
}
