import { state, request, loadContent } from '../services/api.js';
import {
  escape,
  field,
  checkbox,
  value,
  checked,
  notify,
  busy,
  bindRows,
  rowButtons,
} from '../components/forms.js';
function subcategoryRow(sub = { id: crypto.randomUUID(), active: true }) {
  return `<div class="repeat-row" data-subcategory="${escape(sub.id)}">${field('subName', 'Nome da subcategoria', sub.name)}${checkbox('subActive', 'Subcategoria ativa', sub.active)}${rowButtons}</div>`;
}
export function categoryEditor(container, id, saved) {
  const source = state.content.categories.find((category) => category.id === id);
  if (id !== 'new' && !source) throw new Error('Categoria não encontrada.');
  const category = source || {
    active: true,
    order: state.content.categories.length + 1,
    subcategories: [],
  };
  container.innerHTML = `<h1>${source ? 'Editar categoria' : 'Nova categoria'}</h1><form class="panel">${field('name', 'Nome da categoria', category.name)}${field('order', 'Ordem', category.order, { type: 'number' })}${checkbox('active', 'Categoria ativa', category.active)}<h2>Subcategorias</h2><div id="subcategories">${[
    ...category.subcategories,
  ]
    .sort((a, b) => a.order - b.order)
    .map(subcategoryRow)
    .join(
      '',
    )}</div><button type="button" class="secondary" id="add-subcategory">+ Adicionar subcategoria</button><p class="help">Renomear preserva as associações. Remover uma subcategoria com produtos é bloqueado.</p><div class="actions"><button>Salvar e publicar</button><a href="#/categories">Voltar</a></div></form>`;
  const form = container.querySelector('form'),
    rows = container.querySelector('#subcategories');
  bindRows(rows);
  container.querySelector('#add-subcategory').onclick = () =>
    rows.insertAdjacentHTML('beforeend', subcategoryRow());
  form.onsubmit = (event) => {
    event.preventDefault();
    busy(form.querySelector('[type="submit"],button:not([type])'), async () => {
      const subcategories = [...rows.children].map((row, index) => ({
        id: row.dataset.subcategory,
        name: row.querySelector('[name="subName"]').value,
        active: row.querySelector('[name="subActive"]').checked,
        order: index + 1,
      }));
      await request('/api/admin/categories' + (source ? '/' + source.id : ''), {
        method: source ? 'PUT' : 'POST',
        body: {
          name: value(form, 'name'),
          active: checked(form, 'active'),
          order: Number(value(form, 'order')),
          subcategories,
        },
      });
      await loadContent();
      notify('Categoria salva.');
      saved();
    });
  };
}
export function categoryList(container, refresh) {
  container.innerHTML = `<h1>Categorias</h1><p>Os produtos usam identificadores estáveis, mesmo após renomear categorias.</p><a class="button" href="#/categories/new">+ Nova categoria</a><div class="table-wrap"><table><thead><tr><th>Categoria</th><th>Subcategorias</th><th>Ordem</th><th>Status</th><th>Ações</th></tr></thead><tbody>${[
    ...state.content.categories,
  ]
    .sort((a, b) => a.order - b.order)
    .map(
      (category) =>
        `<tr><td>${escape(category.name)}</td><td>${category.subcategories.map((sub) => escape(sub.name)).join(', ')}</td><td>${category.order}</td><td>${category.active ? 'Ativa' : 'Oculta'}</td><td><div class="actions"><a class="button secondary" href="#/categories/${escape(category.id)}">Editar</a><button class="danger" data-delete="${escape(category.id)}">Excluir</button></div></td></tr>`,
    )
    .join('')}</tbody></table></div>`;
  container.querySelectorAll('[data-delete]').forEach(
    (button) =>
      (button.onclick = () => {
        if (!confirm('Excluir categoria? Categorias com produtos não podem ser excluídas.')) return;
        busy(button, async () => {
          await request('/api/admin/categories/' + button.dataset.delete, { method: 'DELETE' });
          await loadContent();
          notify('Categoria excluída.');
          refresh();
        });
      }),
  );
}
