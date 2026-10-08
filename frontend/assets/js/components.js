const card = (
  product,
) => `<article class="card fade"><button class="ph" data-open="${escapeHTML(product.id)}" aria-label="Detalhes de ${escapeHTML(product.name)}"><img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.imageAlt)}" loading="lazy"></button><div class="bd">
  <span class="tag">${escapeHTML(product.category)} · ${escapeHTML(product.subcategory)}</span><h3><button data-open="${escapeHTML(product.id)}">${escapeHTML(product.name)}</button></h3>
  <p>${escapeHTML(product.description.length > 96 ? product.description.slice(0, 93) + '…' : product.description)}</p><div class="price">${money(product.price)}</div>
  <div class="row">${product.available ? `<button class="btn b1 sm" data-add="${escapeHTML(product.id)}">${ic('plus')} Adicionar</button>${productWa(product)}` : '<span class="unavailable">Indisponível</span>'}</div></div></article>`;

function qtySel(quantity, id) {
  return `<div class="qty" data-q="${escapeHTML(id)}"><button data-m aria-label="Diminuir">−</button><span aria-live="polite">${quantity}</span><button data-p aria-label="Aumentar">+</button></div>`;
}
let modalTrigger;
function openModal(id) {
  const product = byId(id);
  if (!product) return;
  let quantity = 1;
  const modal = $('#modal');
  modalTrigger = document.activeElement;
  modal.innerHTML = `<div class="mb"><button class="x" aria-label="Fechar">✕</button><div class="im"><img src="${escapeHTML(product.image)}" alt="${escapeHTML(product.imageAlt)}"></div><div class="tx"><span class="tag">${escapeHTML(product.category)} · ${escapeHTML(product.subcategory)}</span><h2>${escapeHTML(product.name)}</h2><div class="facts"><span>${escapeHTML(product.flavor)}</span><span>${escapeHTML(product.size)}</span><span>${product.available ? 'Disponível' : 'Indisponível'}</span></div><p class="inline-style-04">${escapeHTML(product.description)}</p><div class="price inline-style-01">${money(product.price)}</div>${product.available ? `${qtySel(1, product.id)}<button class="btn b1" id="mAdd">${ic('cart')} Adicionar ao carrinho</button>${productWa(product, 1, 'Solicitar pelo WhatsApp', 'mWa')}` : '<p>Este produto está indisponível no momento.</p>'}</div></div>`;
  modal.classList.add('on');
  $('.x', modal).focus();
  document.body.classList.add('modal-open');
  if (!product.available) return;
  const update = () => {
    $('.qty span', modal).textContent = quantity;
    $('#mWa').dataset.qty = quantity;
    $('#mWa').href = waLink(msgOne(product, quantity));
  };
  $('[data-p]', modal).onclick = () => {
    quantity = Math.min(99, quantity + 1);
    update();
  };
  $('[data-m]', modal).onclick = () => {
    quantity = Math.max(1, quantity - 1);
    update();
  };
  $('#mAdd').onclick = () => {
    add(id, quantity);
    closeModal();
  };
}
function closeModal() {
  $('#modal').classList.remove('on');
  document.body.classList.remove('modal-open');
  modalTrigger?.focus();
}
$('#modal').addEventListener('click', (event) => {
  if (event.target.id === 'modal' || event.target.closest('.x')) closeModal();
});
addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeModal();
    document.body.classList.remove('open');
    $('#menuBtn').setAttribute('aria-expanded', 'false');
  }
  if (event.key === 'Tab' && $('#modal').classList.contains('on')) {
    const controls = $$('button,a[href]', $('#modal'));
    const first = controls[0],
      last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
});
