function template(text, values) {
  return text.replace(
    /\{(produto|quantidade|itens|total)\}/g,
    (match, key) => values[key] ?? match,
  );
}
const msgOne = (product, quantity = 1) =>
  template(SETTINGS.messages.product, { produto: product.name, quantidade: quantity });
function msgCart() {
  const items = cart
    .map(
      (item) =>
        `${item.qty}x ${byId(item.id).name} - ${money((Math.round(byId(item.id).price * 100) * item.qty) / 100)}`,
    )
    .join('\n');
  return template(SETTINGS.messages.cart, {
    itens: items,
    quantidade: count(),
    total: money(total()),
  });
}
const waBtn = (text, label, cssClass = 'bw', extra = '') =>
  `<a class="btn ${cssClass} ${extra}" href="${escapeHTML(waLink(text))}" target="_blank" rel="noopener">${WA}${escapeHTML(label)}</a>`;
function productWa(product, quantity = 1, label = 'Pedir', id = '') {
  return `<a ${id ? `id="${id}"` : ''} class="btn bw ${id ? '' : 'sm'}" data-order="${escapeHTML(product.id)}" data-qty="${quantity}" href="${escapeHTML(waLink(msgOne(product, quantity)))}" target="_blank" rel="noopener">${WA}${escapeHTML(label)}</a>`;
}
