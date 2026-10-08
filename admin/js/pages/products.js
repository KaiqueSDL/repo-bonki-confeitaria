import { state, request, loadContent } from '../services/api.js';
import {
  escape,
  money,
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

function productData(form) {
  return {
    name: value(form, 'name'),
    description: value(form, 'description'),
    categoryId: value(form, 'categoryId'),
    subcategoryId: value(form, 'subcategoryId'),
    flavor: value(form, 'flavor'),
    size: value(form, 'size'),
    price: Number(value(form, 'price')),
    imageId: value(form, 'imageId'),
    available: checked(form, 'available'),
    featured: checked(form, 'featured'),
    active: checked(form, 'active'),
    order: Number(value(form, 'order')),
  };
}
export function productEditor(container, id, saved) {
  const source = state.content.products.find((product) => product.id === id);
  if (id !== 'new' && !source) throw new Error('Produto não encontrado.');
  const product = source || {
    categoryId: state.content.categories[0]?.id,
    price: 0,
    available: true,
    active: true,
    order: state.content.products.length + 1,
  };
  container.innerHTML = `<h1>${source ? 'Editar produto' : 'Novo produto'}</h1><p>As informações serão atualizadas em todos os lugares do site.</p><form class="panel" id="product-form"><div class="form-grid">${field('name', 'Nome', product.name)}${field('price', 'Preço em reais', product.price, { type: 'number', step: '0.01' })}${select('categoryId', 'Categoria', state.content.categories, product.categoryId)}<div id="subcategory-field"></div>${field('flavor', 'Sabor', product.flavor, { required: false })}${field('size', 'Tamanho ou peso', product.size, { required: false })}${field('order', 'Ordem de exibição', product.order, { type: 'number' })}</div>${field('description', 'Descrição', product.description, { type: 'textarea' })}${imageField('imageId', 'Imagem principal', product.imageId)}${checkbox('available', 'Disponível para pedido', product.available)}${checkbox('featured', 'Exibir nos destaques da página inicial', product.featured)}${checkbox('active', 'Produto ativo no site', product.active)}${saveActions}<a href="#/products">Voltar aos produtos</a></form>`;
  const form = container.querySelector('form');
  const updateSubcategories = () => {
    const category = state.content.categories.find(
      (category) => category.id === value(form, 'categoryId'),
    );
    container.querySelector('#subcategory-field').innerHTML = select(
      'subcategoryId',
      'Subcategoria',
      category?.subcategories || [],
      product.subcategoryId,
    );
  };
  updateSubcategories();
  form.elements.categoryId.onchange = updateSubcategories;
  bindImageFields(form);
  form.querySelector('[data-preview]').onclick = () => {
    const product = productData(form),
      image = state.content.media.find((image) => image.id === product.imageId);
    preview(
      `<h2>Prévia do produto</h2><article class="preview-card">${image ? `<img src="${escape(image.path)}" alt="${escape(image.alt)}">` : ''}<h2>${escape(product.name)}</h2><p>${escape(product.description)}</p><p><strong>${money(product.price)}</strong></p><p>${product.available ? 'Disponível' : 'Indisponível'}</p></article>`,
    );
  };
  form.onsubmit = (event) => {
    event.preventDefault();
    busy(form.querySelector('[type="submit"]'), async () => {
      await saveImageAlt(form, 'imageId');
      await request('/api/admin/products' + (source ? '/' + encodeURIComponent(source.id) : ''), {
        method: source ? 'PUT' : 'POST',
        body: productData(form),
      });
      await loadContent();
      notify('Produto salvo e publicado.');
      saved();
    });
  };
}
export function productList(container, refresh) {
  container.innerHTML = `<h1>Produtos</h1><p>Organize seu catálogo, preços e disponibilidade.</p><div class="toolbar"><input id="product-search" aria-label="Buscar produto" placeholder="Buscar produto"><select id="product-category" aria-label="Filtrar categoria"><option value="">Todas as categorias</option>${state.content.categories.map((category) => `<option value="${escape(category.id)}">${escape(category.name)}</option>`).join('')}</select><select id="product-sort" aria-label="Ordenar"><option value="order">Ordem do site</option><option value="name">Nome</option><option value="price">Preço</option></select><a class="button" href="#/products/new">+ Novo produto</a></div><div class="table-wrap"><table><thead><tr><th>Imagem</th><th>Produto</th><th>Categoria</th><th>Preço</th><th>Status</th><th>Ações</th></tr></thead><tbody id="product-list"></tbody></table></div>`;
  function renderRows() {
    const query = container.querySelector('#product-search').value.toLowerCase(),
      categoryId = container.querySelector('#product-category').value,
      sort = container.querySelector('#product-sort').value;
    const products = state.content.products
      .filter(
        (product) =>
          product.name.toLowerCase().includes(query) &&
          (!categoryId || product.categoryId === categoryId),
      )
      .sort((a, b) => (sort === 'name' ? a.name.localeCompare(b.name) : a[sort] - b[sort]));
    container.querySelector('#product-list').innerHTML =
      products
        .map((product) => {
          const image = state.content.media.find((image) => image.id === product.imageId),
            category = state.content.categories.find(
              (category) => category.id === product.categoryId,
            ),
            subcategory = category?.subcategories.find((sub) => sub.id === product.subcategoryId);
          return `<tr><td><img class="thumb" src="${escape(image.path)}" alt="${escape(image.alt)}"></td><td>${escape(product.name)}${product.featured ? '<br><span class="badge">Destaque</span>' : ''}</td><td>${escape(category?.name)}<br><small>${escape(subcategory?.name)}</small></td><td>${money(product.price)}</td><td>${product.active ? 'Ativo' : 'Oculto'}<br>${product.available ? 'Disponível' : 'Indisponível'}</td><td><div class="actions"><a class="button secondary" href="#/products/${escape(product.id)}">Editar</a><button data-action="duplicate" data-id="${escape(product.id)}" class="secondary">Duplicar</button><button data-action="toggle" data-id="${escape(product.id)}" class="secondary">${product.active ? 'Ocultar' : 'Ativar'}</button><button data-action="delete" data-id="${escape(product.id)}" class="danger">Excluir</button></div></td></tr>`;
        })
        .join('') || '<tr><td colspan="6" class="empty">Nenhum produto encontrado.</td></tr>';
  }
  for (const id of ['product-search', 'product-category', 'product-sort'])
    container.querySelector('#' + id).addEventListener('input', renderRows);
  renderRows();
  container.querySelector('#product-list').onclick = (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const product = state.content.products.find((product) => product.id === button.dataset.id);
    if (
      button.dataset.action === 'delete' &&
      !confirm(`Excluir ${product.name}? A imagem continuará na biblioteca.`)
    )
      return;
    busy(button, async () => {
      if (button.dataset.action === 'duplicate')
        await request('/api/admin/products', {
          method: 'POST',
          body: {
            ...product,
            name: product.name + ' (cópia)',
            active: false,
            featured: false,
            order: state.content.products.length + 1,
          },
        });
      else if (button.dataset.action === 'toggle')
        await request('/api/admin/products/' + product.id, {
          method: 'PUT',
          body: { ...product, active: !product.active },
        });
      else await request('/api/admin/products/' + product.id, { method: 'DELETE' });
      await loadContent();
      notify('Catálogo atualizado.');
      refresh();
    });
  };
}
