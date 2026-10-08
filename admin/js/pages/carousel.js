import { state, request, loadContent } from '../services/api.js';
import {
  escape,
  field,
  checkbox,
  select,
  imageField,
  value,
  checked,
  bindImageFields,
  saveImageAlt,
  preview,
  notify,
  busy,
  saveActions,
} from '../components/forms.js';
function slideData(form) {
  return {
    title: value(form, 'title'),
    description: value(form, 'description'),
    layout: value(form, 'layout'),
    imageIds: ['image0', 'image1', 'image2'].map((name) => value(form, name)).filter(Boolean),
    button: { text: value(form, 'buttonText'), url: value(form, 'buttonURL') },
    active: checked(form, 'active'),
    order: Number(value(form, 'order')),
  };
}
export function slideEditor(container, id, saved) {
  const source = state.content.carousel.slides.find((slide) => slide.id === id);
  if (id !== 'new' && !source) throw new Error('Slide não encontrado.');
  const slide = source || {
    layout: 'single',
    imageIds: [],
    button: { text: 'Ver cardápio', url: '#/cardapio' },
    active: true,
    order: state.content.carousel.slides.length + 1,
  };
  container.innerHTML = `<h1>${source ? 'Editar slide' : 'Novo slide'}</h1><form class="panel">${field('title', 'Título', slide.title)}${field('description', 'Descrição', slide.description, { type: 'textarea', required: false })}<div class="form-grid">${field('buttonText', 'Texto do botão', slide.button.text)}${field('buttonURL', 'Destino do botão', slide.button.url)}${select(
    'layout',
    'Apresentação',
    [
      { id: 'single', name: 'Uma imagem' },
      { id: 'stack', name: 'Imagens empilhadas' },
    ],
    slide.layout,
  )}${field('order', 'Posição', slide.order, { type: 'number' })}</div><p class="help">Destinos: #/, #/cardapio, #/historia, #/carrinho ou URL HTTPS. Imagens empilhadas aceitam até três fotografias.</p>${imageField('image0', 'Fotografia principal', slide.imageIds[0], 'carousel')}${imageField('image1', 'Segunda fotografia (opcional)', slide.imageIds[1], 'carousel', true)}${imageField('image2', 'Terceira fotografia (opcional)', slide.imageIds[2], 'carousel', true)}${checkbox('active', 'Slide ativo', slide.active)}${saveActions}<a href="#/carousel">Voltar ao carrossel</a></form>`;
  const form = container.querySelector('form');
  bindImageFields(form);
  function updateLayout() {
    const stacked = value(form, 'layout') === 'stack';
    for (const name of ['image1', 'image2'])
      form.elements.namedItem(name).closest('.media-field').hidden = !stacked;
  }
  form.elements.layout.onchange = updateLayout;
  updateLayout();
  form.querySelector('[data-preview]').onclick = () => {
    const slide = slideData(form);
    const ids = slide.layout === 'single' ? slide.imageIds.slice(0, 1) : slide.imageIds;
    preview(
      `<h2>Prévia do slide</h2><article class="preview-slide"><h2>${escape(slide.title)}</h2><p>${escape(slide.description)}</p>${ids
        .map((id) => {
          const image = state.content.media.find((image) => image.id === id);
          return `<img src="${escape(image.path)}" alt="${escape(image.alt)}">`;
        })
        .join('')}<p><span class="button">${escape(slide.button.text)}</span></p></article>`,
    );
  };
  form.onsubmit = (event) => {
    event.preventDefault();
    busy(form.querySelector('[type="submit"]'), async () => {
      const slide = slideData(form);
      if (slide.layout === 'single') slide.imageIds = slide.imageIds.slice(0, 1);
      for (const name of ['image0', 'image1', 'image2'])
        if (value(form, name)) await saveImageAlt(form, name);
      await request('/api/admin/carousel' + (source ? '/' + source.id : ''), {
        method: source ? 'PUT' : 'POST',
        body: slide,
      });
      await loadContent();
      notify('Slide salvo e publicado.');
      saved();
    });
  };
}
export function carouselList(container, refresh) {
  const carousel = state.content.carousel,
    settings = carousel.settings;
  container.innerHTML = `<h1>Carrossel</h1><p>Altere os destaques da primeira seção do site.</p><a class="button" href="#/carousel/new">+ Novo slide</a><div class="table-wrap"><table><thead><tr><th>Imagem</th><th>Título</th><th>Posição</th><th>Status</th><th>Ações</th></tr></thead><tbody>${[
    ...carousel.slides,
  ]
    .sort((a, b) => a.order - b.order)
    .map((slide) => {
      const image = state.content.media.find((image) => image.id === slide.imageIds[0]);
      return `<tr><td><img class="thumb" src="${escape(image.path)}" alt="${escape(image.alt)}"></td><td>${escape(slide.title)}</td><td>${slide.order}</td><td>${slide.active ? 'Ativo' : 'Oculto'}</td><td><div class="actions"><a class="button secondary" href="#/carousel/${escape(slide.id)}">Editar / posição</a><button class="danger" data-delete="${escape(slide.id)}">Excluir</button></div></td></tr>`;
    })
    .join(
      '',
    )}</tbody></table></div><form class="panel" id="carousel-settings"><h2>Comportamento</h2><div class="form-grid">${field('interval', 'Intervalo entre slides (ms)', settings.interval, { type: 'number', min: 2000 })}${field('transition', 'Duração da transição (ms)', settings.transition, { type: 'number' })}</div>${checkbox('autoplay', 'Avanço automático', settings.autoplay)}${checkbox('showIndicators', 'Exibir indicadores', settings.showIndicators)}${checkbox('showArrows', 'Exibir setas', settings.showArrows)}<button>Salvar comportamento</button></form>`;
  container.querySelectorAll('[data-delete]').forEach(
    (button) =>
      (button.onclick = () => {
        if (!confirm('Excluir este slide?')) return;
        busy(button, async () => {
          await request('/api/admin/carousel/' + button.dataset.delete, { method: 'DELETE' });
          await loadContent();
          notify('Slide excluído.');
          refresh();
        });
      }),
  );
  container.querySelector('form').onsubmit = (event) => {
    event.preventDefault();
    const form = event.target;
    busy(form.querySelector('button'), async () => {
      await request('/api/admin/carousel-settings', {
        method: 'PUT',
        body: {
          interval: Number(value(form, 'interval')),
          transition: Number(value(form, 'transition')),
          autoplay: checked(form, 'autoplay'),
          showIndicators: checked(form, 'showIndicators'),
          showArrows: checked(form, 'showArrows'),
        },
      });
      await loadContent();
      notify('Carrossel atualizado.');
      refresh();
    });
  };
}
