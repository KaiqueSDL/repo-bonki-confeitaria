let menuFilters = { cat: 'Todos', sub: 'Todos', q: '' };
function pMenu() {
  if (
    menuFilters.cat !== 'Todos' &&
    !CATEGORIES.some((category) => category.id === menuFilters.cat)
  ) {
    menuFilters.cat = 'Todos';
    menuFilters.sub = 'Todos';
  }
  return `<section class="wrap sec"><div class="eyebrow">Cardápio</div><h2>Escolha seu sabor</h2><div class="bar"><label class="search">${ic('search')}<input id="q" type="search" placeholder="Busque um produto..." aria-label="Buscar produto" value="${escapeHTML(menuFilters.q)}"></label></div><div class="chips" id="cats" role="group" aria-label="Categorias"><button class="chip ${menuFilters.cat === 'Todos' ? 'on' : ''}" data-cat="Todos">Todos</button>${CATEGORIES.map((category) => `<button class="chip ${menuFilters.cat === category.id ? 'on' : ''}" data-cat="${escapeHTML(category.id)}">${escapeHTML(category.name)}</button>`).join('')}</div><div class="chips" id="subs"></div><div class="crumb" id="crumb"></div><div class="grid" id="list"></div><div class="note">${CONFIG.avisos.map((notice) => '• ' + escapeHTML(notice)).join('<br>')}</div></section>`;
}
function filt() {
  const category = CATEGORIES.find((category) => category.id === menuFilters.cat);
  const subcategories = category?.subcategories || [];
  if (menuFilters.sub !== 'Todos' && !subcategories.some((sub) => sub.id === menuFilters.sub))
    menuFilters.sub = 'Todos';
  $('#subs').innerHTML = subcategories.length
    ? `<button class="chip ${menuFilters.sub === 'Todos' ? 'on' : ''}" data-sub="Todos">Todos</button>${subcategories.map((sub) => `<button class="chip ${sub.id === menuFilters.sub ? 'on' : ''}" data-sub="${escapeHTML(sub.id)}">${escapeHTML(sub.name)}</button>`).join('')}`
    : '';
  const normalize = (text) =>
    text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  const products = PRODUCTS.filter(
    (product) =>
      (menuFilters.cat === 'Todos' || product.categoryId === menuFilters.cat) &&
      (menuFilters.sub === 'Todos' || product.subcategoryId === menuFilters.sub) &&
      normalize(product.name + ' ' + product.flavor + ' ' + product.description).includes(
        normalize(menuFilters.q),
      ),
  );
  $('#crumb').textContent =
    ['Cardápio', category?.name, subcategories.find((sub) => sub.id === menuFilters.sub)?.name]
      .filter(Boolean)
      .join(' → ') + ` (${products.length})`;
  $('#list').innerHTML = products.length
    ? products.map(card).join('')
    : '<div class="empty inline-style-15"><div class="big">🍪</div><p>Nenhum produto encontrado. Tente outra busca.</p></div>';
  observe();
}
