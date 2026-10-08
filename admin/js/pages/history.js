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
  bindRows,
  rowButtons,
  preview,
  saveActions,
} from '../components/forms.js';
function paragraphRow(text = '') {
  return `<div class="repeat-row">${field('paragraph', 'Parágrafo', text, { type: 'textarea' })}${rowButtons}</div>`;
}
function eventRow(event = { id: crypto.randomUUID() }) {
  return `<div class="repeat-row" data-event="${escape(event.id)}"><div class="form-grid">${field('year', 'Ano / período', event.year)}${field('eventTitle', 'Título', event.title)}</div>${field('eventDescription', 'Descrição', event.description, { type: 'textarea' })}${rowButtons}</div>`;
}
function historyData(form) {
  return {
    title: value(form, 'title'),
    subtitle: value(form, 'subtitle'),
    eyebrow: value(form, 'eyebrow'),
    foundersImageId: value(form, 'foundersImageId') || null,
    paragraphs: [...form.querySelectorAll('[name="paragraph"]')].map((input) => input.value),
    timeline: [...form.querySelectorAll('[data-event]')].map((row, index) => ({
      id: row.dataset.event,
      year: row.querySelector('[name="year"]').value,
      title: row.querySelector('[name="eventTitle"]').value,
      description: row.querySelector('[name="eventDescription"]').value,
      order: index + 1,
    })),
    ctaTitle: value(form, 'ctaTitle'),
    ctaText: value(form, 'ctaText'),
    ctaButton: value(form, 'ctaButton'),
  };
}
export function historyEditor(container, refresh) {
  const history = state.content.history;
  container.innerHTML = `<h1>Nossa História</h1><form class="panel"><div class="form-grid">${field('title', 'Título da página', history.title)}${field('subtitle', 'Subtítulo', history.subtitle)}${field('eyebrow', 'Chamada', history.eyebrow)}</div>${imageField('foundersImageId', 'Foto das fundadoras', history.foundersImageId, 'institutional', true)}<h2>Parágrafos</h2><div id="paragraphs">${history.paragraphs.map(paragraphRow).join('')}</div><button id="add-paragraph" type="button" class="secondary">+ Novo parágrafo</button><h2>Linha do tempo</h2><div id="timeline">${[
    ...history.timeline,
  ]
    .sort((a, b) => a.order - b.order)
    .map(eventRow)
    .join(
      '',
    )}</div><button id="add-event" type="button" class="secondary">+ Novo acontecimento</button><fieldset><legend>Chamada final</legend>${field('ctaTitle', 'Título', history.ctaTitle)}${field('ctaText', 'Texto', history.ctaText, { required: false })}${field('ctaButton', 'Botão', history.ctaButton)}</fieldset>${saveActions}</form>`;
  const form = container.querySelector('form');
  bindImageFields(form);
  bindRows(container.querySelector('#paragraphs'));
  bindRows(container.querySelector('#timeline'));
  container.querySelector('#add-paragraph').onclick = () =>
    container.querySelector('#paragraphs').insertAdjacentHTML('beforeend', paragraphRow());
  container.querySelector('#add-event').onclick = () =>
    container.querySelector('#timeline').insertAdjacentHTML('beforeend', eventRow());
  form.querySelector('[data-preview]').onclick = () => {
    const history = historyData(form);
    preview(
      `<h2>${escape(history.title)}</h2><p>${escape(history.subtitle)}</p>${history.paragraphs.map((text) => `<p>${escape(text)}</p>`).join('')}${history.timeline.map((event) => `<h3>${escape(event.year)} — ${escape(event.title)}</h3><p>${escape(event.description)}</p>`).join('')}`,
    );
  };
  form.onsubmit = (event) => {
    event.preventDefault();
    busy(form.querySelector('[type="submit"]'), async () => {
      await saveImageAlt(form, 'foundersImageId');
      await request('/api/admin/history', { method: 'PUT', body: historyData(form) });
      await loadContent();
      notify('História publicada.');
      refresh();
    });
  };
}
