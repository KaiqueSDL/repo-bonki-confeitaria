import { state, request, loadContent } from '../services/api.js';
export const escape = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );
export const money = (value) =>
  Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const value = (form, name) => form.elements.namedItem(name)?.value ?? '';
export const checked = (form, name) => form.elements.namedItem(name)?.checked ?? false;
let fieldSequence = 0;

export function field(
  name,
  label,
  data = '',
  { type = 'text', required = true, max = 5000, step = '1', min = 0 } = {},
) {
  const id = `field-${++fieldSequence}`;
  const title = `<label for="${id}">${escape(label)}</label>`;
  if (type === 'textarea')
    return `<div class="field">${title}<textarea id="${id}" name="${name}" maxlength="${max}" ${required ? 'required' : ''}>${escape(data)}</textarea></div>`;
  return `<div class="field">${title}<input id="${id}" name="${name}" type="${type}" value="${escape(data)}" maxlength="${max}" ${type === 'number' ? `min="${min}" step="${step}"` : ''} ${required ? 'required' : ''}></div>`;
}
export const checkbox = (name, label, data) =>
  `<label class="check"><input name="${name}" type="checkbox" ${data ? 'checked' : ''}>${escape(label)}</label>`;
export function select(name, label, items, selected, empty = false) {
  const id = `field-${++fieldSequence}`;
  const options = items
    .map(
      (item) =>
        `<option value="${escape(item.id)}" ${item.id === selected ? 'selected' : ''}>${escape(item.name)}</option>`,
    )
    .join('');
  return `<div class="field"><label for="${id}">${escape(label)}</label><select id="${id}" name="${name}" ${empty ? '' : 'required'}>${empty ? '<option value="">Sem imagem</option>' : '<option value="">Selecione…</option>'}${options}</select></div>`;
}

export function imageField(name, label, selected, bucket = 'products', optional = false) {
  const image = state.content.media.find((image) => image.id === selected);
  return `<div class="media-field" data-media-field data-bucket="${bucket}">${select(
    name,
    label,
    state.content.media.map((image) => ({ id: image.id, name: image.originalName })),
    selected,
    optional,
  )}<img data-thumbnail src="${escape(image?.path || '/assets/images/favicon.svg')}" alt="Prévia da imagem selecionada">${field(name + 'Alt', 'Texto alternativo da imagem', image?.alt || '', { required: false })}<label class="field"><span>Enviar uma nova fotografia (JPEG, PNG ou WebP, até 8 MB)</span><input data-file type="file" accept="image/jpeg,image/png,image/webp"></label><button type="button" data-upload class="secondary">Enviar fotografia</button><p class="help">A fotografia enviada fica na biblioteca. Salve o formulário para publicar a alteração.</p></div>`;
}
export function notify(message, error = false) {
  const notice = document.querySelector('#notice');
  notice.textContent = message;
  notice.className = 'on' + (error ? ' error' : '');
}
export function preview(html) {
  document.querySelector('#preview-content').innerHTML = html;
  document.querySelector('#preview').showModal();
}
export async function busy(button, operation) {
  button.disabled = true;
  try {
    await operation();
  } catch (error) {
    notify(error.message, true);
  } finally {
    button.disabled = false;
  }
}
export function bindImageFields(container) {
  container.querySelectorAll('[data-media-field]').forEach((group) => {
    const selector = group.querySelector('select'),
      alt = group.querySelector('input[name$="Alt"]');
    selector.addEventListener('change', () => {
      const image = state.content.media.find((image) => image.id === selector.value);
      group.querySelector('[data-thumbnail]').src = image?.path || '/assets/images/favicon.svg';
      alt.value = image?.alt || '';
    });
    group.querySelector('[data-upload]').onclick = (event) =>
      busy(event.target, async () => {
        const file = group.querySelector('[data-file]').files[0];
        if (!file) throw new Error('Selecione uma fotografia.');
        const form = new FormData();
        form.append('image', file);
        form.append('bucket', group.dataset.bucket);
        form.append('alt', alt.value.trim() || file.name);
        const response = await request('/api/admin/media/upload', { method: 'POST', body: form });
        await loadContent();
        selector.add(new Option(response.data.originalName, response.data.id));
        selector.value = response.data.id;
        selector.dispatchEvent(new Event('change'));
        group.querySelector('[data-file]').value = '';
        notify('Fotografia enviada. Salve o formulário para publicar.');
      });
  });
}
export async function saveImageAlt(form, name) {
  const id = value(form, name),
    alt = value(form, name + 'Alt').trim();
  const image = state.content.media.find((image) => image.id === id);
  if (image && alt && alt !== image.alt)
    await request(`/api/admin/media/${encodeURIComponent(id)}`, { method: 'PUT', body: { alt } });
}
export function bindRows(container) {
  container.addEventListener('click', (event) => {
    const remove = event.target.closest('[data-row-remove]');
    const up = event.target.closest('[data-row-up]');
    const down = event.target.closest('[data-row-down]');
    const row = (remove || up || down)?.closest('.repeat-row');
    if (remove) row.remove();
    if (up && row.previousElementSibling)
      row.parentNode.insertBefore(row, row.previousElementSibling);
    if (down && row.nextElementSibling) row.parentNode.insertBefore(row.nextElementSibling, row);
  });
}
export const rowButtons =
  '<div class="actions"><button type="button" class="secondary" data-row-up aria-label="Mover para cima">↑</button><button type="button" class="secondary" data-row-down aria-label="Mover para baixo">↓</button><button type="button" class="danger" data-row-remove>Remover</button></div>';
export const saveActions =
  '<div class="actions"><button type="submit">Salvar e publicar</button><button type="button" class="secondary" data-preview>Pré-visualizar</button></div>';
