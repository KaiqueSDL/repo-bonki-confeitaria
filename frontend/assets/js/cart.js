let cart = [];
try {
  const stored = JSON.parse(localStorage.getItem('bonki-cart') || '[]');
  if (Array.isArray(stored))
    cart = stored
      .filter(
        (item) => typeof item.id === 'string' && Number.isSafeInteger(item.qty) && item.qty > 0,
      )
      .slice(0, 100)
      .map((item) => ({ ...item, qty: Math.min(item.qty, 99) }));
} catch {}
const save = () => {
  try {
    localStorage.setItem('bonki-cart', JSON.stringify(cart));
  } catch {}
};
const count = () => cart.reduce((sum, item) => sum + item.qty, 0);
const total = () =>
  cart.reduce(
    (sum, item) =>
      sum + (byId(item.id)?.available ? Math.round(byId(item.id).price * 100) * item.qty : 0),
    0,
  ) / 100;
function renderBadges(bump = false) {
  const number = count(),
    current = location.hash || '#/';
  $('#nav').innerHTML = [
    ['#/', 'home', 'Início'],
    ['#/historia', 'book', 'Nossa História'],
    ['#/cardapio', 'menu', 'Cardápio'],
    ['#/carrinho', 'cart', 'Carrinho'],
    [waLink(SETTINGS.messages.general), 'chat', 'Fale Conosco'],
  ]
    .map(
      ([href, icon, label]) =>
        `<a href="${escapeHTML(href)}" ${href.startsWith('http') ? 'target="_blank" rel="noopener"' : ''} class="${href === current ? 'on' : ''}" ${href === current ? 'aria-current="page"' : ''}>${ic(icon)}<span>${label}</span>${icon === 'cart' && number ? `<span class="pill">${number}</span>` : ''}</a>`,
    )
    .join('');
  $('#fab').innerHTML = ic('cart') + (number ? `<span class="pill">${number}</span>` : '');
  if (bump) {
    $('#fab').classList.remove('bump');
    void $('#fab').offsetWidth;
    $('#fab').classList.add('bump');
  }
}
function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('on');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove('on'), 3500);
}
function add(id, quantity = 1) {
  const product = byId(id);
  if (!product?.available) return toast('Produto indisponível.');
  const item = cart.find((item) => item.id === id);
  if (item) item.qty = Math.min(99, item.qty + quantity);
  else cart.push({ id, qty: Math.min(99, Math.max(1, quantity)), name: product.name });
  save();
  renderBadges(true);
  toast('✓ ' + product.name + ' adicionado ao carrinho');
}
function setQty(id, quantity) {
  const item = cart.find((item) => item.id === id);
  if (item) {
    item.qty = Math.min(99, Math.max(1, quantity));
    save();
    render();
  }
}
function del(id) {
  cart = cart.filter((item) => item.id !== id);
  save();
  render();
}
async function finalizeOrder(event, id = null, quantity = 1) {
  event.preventDefault();
  // Open synchronously to respect browser popup restrictions.
  const popup = window.open('about:blank', '_blank');
  if (popup) popup.opener = null;
  try {
    const previous = new Map(PRODUCTS.map((product) => [product.id, product.price]));
    await refreshContent();
    const requested = id ? [{ id, qty: quantity }] : cart;
    if (!requested.length) throw new Error('O carrinho está vazio.');
    const invalid = requested.some((item) => !byId(item.id)?.available);
    const changed = requested.some((item) => previous.get(item.id) !== byId(item.id)?.price);
    if (invalid || changed) {
      popup?.close();
      closeModal();
      if (!id) location.hash = '#/carrinho';
      render();
      toast(
        invalid
          ? 'Alguns itens estão indisponíveis ou foram removidos. Ajuste seu carrinho.'
          : 'Os preços foram atualizados. Confira os valores e finalize novamente.',
      );
      return;
    }
    const url = waLink(id ? msgOne(byId(id), quantity) : msgCart());
    if (popup) popup.location.href = url;
    else window.location.href = url;
  } catch (error) {
    popup?.close();
    toast(error.message);
  }
}
