import { state, request, loadContent } from '../services/api.js';
import {
  escape,
  field,
  imageField,
  value,
  bindImageFields,
  saveImageAlt,
  notify,
  busy,
  preview,
  saveActions,
  bindRows,
  rowButtons,
} from '../components/forms.js';
// Labels are interface text. Editable content lives exclusively in the repository.
const groups = {
  brand: {
    title: 'Identidade',
    fields: {
      name: 'Nome da marca',
      logoText: 'Texto do logotipo',
      logoSubtitle: 'Complemento do logotipo',
      slogan: 'Slogan',
      sidebarText: 'Mensagem na navegação',
    },
  },
  contact: {
    title: 'Contato',
    fields: {
      whatsapp: 'WhatsApp (somente dígitos, com DDI e DDD)',
      instagram: 'Instagram (sem @)',
      email: 'E-mail',
    },
  },
  home: {
    title: 'Conteúdo da página inicial',
    fields: {
      featuredEyebrow: 'Chamada dos destaques',
      featuredTitle: 'Título dos destaques',
      featuredDescription: 'Descrição dos destaques',
      featuredButton: 'Botão para o cardápio',
      aboutEyebrow: 'Chamada institucional',
      aboutTitle: 'Título institucional',
      aboutText: 'Texto institucional',
      aboutButton: 'Botão para a história',
      ctaTitle: 'Título da chamada final',
      ctaText: 'Texto da chamada final',
      ctaButton: 'Botão para o WhatsApp',
    },
  },
  footer: {
    title: 'Rodapé',
    fields: { text: 'Texto de direitos reservados', year: 'Ano do rodapé' },
  },
  messages: {
    title: 'WhatsApp',
    fields: {
      general: 'Mensagem de contato',
      greeting: 'Saudação do rodapé',
      order: 'Mensagem de pedido',
      heroButton: 'Botão WhatsApp dos slides',
      product: 'Modelo de mensagem para um produto',
      cart: 'Modelo de mensagem para o carrinho',
    },
  },
  seo: {
    title: 'Apresentação nos buscadores',
    fields: { title: 'Título principal do site', description: 'Descrição do site' },
  },
};
function noticeRow(text = '') {
  return `<div class="repeat-row">${field('notice', 'Aviso', text, { type: 'textarea' })}${rowButtons}</div>`;
}
export function settingsEditor(container, mode, refresh) {
  const settings = state.content.settings,
    chosen = mode === 'home' ? ['home'] : ['brand', 'contact', 'footer', 'messages', 'seo'];
  const groupHTML = chosen
    .map(
      (key) =>
        `<fieldset><legend>${escape(groups[key].title)}</legend>${Object.entries(groups[key].fields)
          .map(([name, label]) =>
            field(key + '_' + name, label, settings[key][name], {
              type:
                name.endsWith('Text') ||
                ['sidebarText', 'product', 'cart', 'description'].includes(name)
                  ? 'textarea'
                  : 'text',
              required: !['email', 'instagram', 'slogan'].includes(name),
            }),
          )
          .join(
            '',
          )}${key === 'home' ? imageField('aboutImageId', 'Fotografia institucional', settings.home.aboutImageId, 'institutional', true) : ''}</fieldset>`,
    )
    .join('');
  container.innerHTML = `<h1>${mode === 'home' ? 'Página inicial' : 'Configurações do site'}</h1><form class="panel">${groupHTML}${mode !== 'home' ? `<fieldset><legend>Avisos de pagamento e entrega</legend><div id="notices">${settings.notices.map(noticeRow).join('')}</div><button id="add-notice" type="button" class="secondary">+ Adicionar aviso</button></fieldset><p class="help">Modelos de mensagem: use {produto} e {quantidade} no produto; {itens}, {quantidade} e {total} no carrinho. O sistema substitui esses campos ao gerar a mensagem.</p>` : ''}${saveActions}</form>`;
  const form = container.querySelector('form');
  if (mode === 'home') bindImageFields(form);
  else {
    bindRows(container.querySelector('#notices'));
    container.querySelector('#add-notice').onclick = () =>
      container.querySelector('#notices').insertAdjacentHTML('beforeend', noticeRow());
  }
  function settingsData() {
    const updated = structuredClone(state.content.settings);
    for (const key of chosen)
      for (const name of Object.keys(groups[key].fields))
        updated[key][name] = value(form, key + '_' + name);
    if (mode === 'home') updated.home.aboutImageId = value(form, 'aboutImageId') || null;
    else
      updated.notices = [...form.querySelectorAll('[name="notice"]')].map((input) => input.value);
    return updated;
  }
  form.querySelector('[data-preview]').onclick = () => {
    const updated = settingsData();
    preview(
      mode === 'home'
        ? `<h2>${escape(updated.home.featuredTitle)}</h2><p>${escape(updated.home.featuredDescription)}</p><h2>${escape(updated.home.aboutTitle)}</h2><p>${escape(updated.home.aboutText)}</p><h2>${escape(updated.home.ctaTitle)}</h2><p>${escape(updated.home.ctaText)}</p>`
        : `<h2>${escape(updated.brand.name)}</h2><p>${escape(updated.brand.slogan)}</p><p>WhatsApp: ${escape(updated.contact.whatsapp)}</p>${updated.notices.map((notice) => `<p>${escape(notice)}</p>`).join('')}`,
    );
  };
  form.onsubmit = (event) => {
    event.preventDefault();
    busy(form.querySelector('[type="submit"]'), async () => {
      if (mode === 'home') await saveImageAlt(form, 'aboutImageId');
      await request('/api/admin/settings', { method: 'PUT', body: settingsData() });
      await loadContent();
      notify('Configurações publicadas.');
      refresh();
    });
  };
}
