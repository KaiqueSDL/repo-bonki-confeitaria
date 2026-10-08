import { state, request, loadContent } from '../services/api.js';
import {
  escape,
  field,
  select,
  imageField,
  bindImageFields,
  value,
  preview,
  notify,
  busy,
} from '../components/forms.js';
export function mediaPage(container, refresh) {
  container.innerHTML = `<h1>Biblioteca de imagens</h1><p>As imagens podem ser reutilizadas em produtos, slides e seções. Somente arquivos sem referências podem ser excluídos.</p><div class="panel"><h2>Enviar fotografia</h2>${select(
    'uploadBucket',
    'Organizar em',
    [
      { id: 'products', name: 'Produtos' },
      { id: 'carousel', name: 'Carrossel' },
      { id: 'institutional', name: 'Institucional' },
    ],
    'products',
  )}${imageField('newMedia', 'Imagem da biblioteca', '', 'products', true)}<button class="secondary" id="refresh-media">Atualizar biblioteca</button></div><div class="media-grid">${state.content.media.map((image) => `<article class="media-item"><img src="${escape(image.path)}" alt="${escape(image.alt)}" loading="lazy"><h2>${escape(image.originalName)}</h2><small>${Math.ceil(image.size / 1024)} KB · ${escape(image.mime)}<br>${escape(new Date(image.createdAt).toLocaleString('pt-BR'))}</small><form data-media-id="${escape(image.id)}">${field('alt', 'Texto alternativo', image.alt)}<button>Salvar texto alternativo</button></form><p class="help">${image.uses.length ? image.uses.map((use) => escape(use.section + ': ' + use.name)).join('<br>') : 'Sem referências: pode ser excluída.'}</p><div class="actions"><button class="secondary" data-replace="${escape(image.id)}">Substituir nos conteúdos</button><button class="danger" data-delete="${escape(image.id)}" ${image.uses.length ? 'disabled' : ''}>Excluir</button></div></article>`).join('')}</div>`;
  const uploadPanel = container.querySelector('.panel');
  bindImageFields(uploadPanel);
  uploadPanel.querySelector('[name="uploadBucket"]').onchange = (event) =>
    (uploadPanel.querySelector('[data-media-field]').dataset.bucket = event.target.value);
  container.querySelector('#refresh-media').onclick = () =>
    busy(container.querySelector('#refresh-media'), async () => {
      await loadContent();
      refresh();
    });
  container.querySelectorAll('[data-media-id]').forEach(
    (form) =>
      (form.onsubmit = (event) => {
        event.preventDefault();
        busy(form.querySelector('button'), async () => {
          await request('/api/admin/media/' + form.dataset.mediaId, {
            method: 'PUT',
            body: { alt: form.elements.alt.value },
          });
          await loadContent();
          notify('Texto alternativo atualizado.');
          refresh();
        });
      }),
  );
  container.querySelectorAll('[data-delete]').forEach(
    (button) =>
      (button.onclick = () => {
        if (!confirm('Excluir esta fotografia sem referências?')) return;
        busy(button, async () => {
          await request('/api/admin/media/' + button.dataset.delete, { method: 'DELETE' });
          await loadContent();
          notify('Imagem excluída e arquivada em backup.');
          refresh();
        });
      }),
  );
  container.querySelectorAll('[data-replace]').forEach(
    (button) =>
      (button.onclick = () => {
        const image = state.content.media.find((image) => image.id === button.dataset.replace);
        preview(
          `<h2>Substituir fotografia</h2><p>A nova fotografia substituirá todas as ${image.uses.length} referências. A imagem anterior continuará na biblioteca.</p><form id="replace-media">${imageField('replacementId', 'Nova fotografia', null, 'products')}<button type="submit">Aplicar em todos os conteúdos</button></form>`,
        );
        const form = document.querySelector('#replace-media');
        bindImageFields(form);
        form.onsubmit = (event) => {
          event.preventDefault();
          busy(form.querySelector('[type="submit"]'), async () => {
            await request('/api/admin/media/' + image.id + '/replace', {
              method: 'PUT',
              body: { replacementId: value(form, 'replacementId') },
            });
            await loadContent();
            document.querySelector('#preview').close();
            notify('Fotografia substituída em todos os conteúdos.');
            refresh();
          });
        };
      }),
  );
}
