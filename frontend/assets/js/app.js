document.addEventListener('click', (event) => {
  const target = event.target;
  const addButton = target.closest('[data-add]');
  const productButton = target.closest('[data-open]');
  const categoryButton = target.closest('[data-cat]');
  const subcategoryButton = target.closest('[data-sub]');
  const deleteButton = target.closest('[data-del]');
  const quantityButton = target.closest('.crow [data-p],.crow [data-m]');
  const orderButton = target.closest('[data-order]');
  if (orderButton)
    return void finalizeOrder(event, orderButton.dataset.order, Number(orderButton.dataset.qty));
  if (target.closest('#checkout')) return void finalizeOrder(event);
  if (addButton) add(addButton.dataset.add);
  else if (productButton) openModal(productButton.dataset.open);
  else if (categoryButton) {
    menuFilters.cat = categoryButton.dataset.cat;
    menuFilters.sub = 'Todos';
    $$('#cats .chip').forEach((chip) => chip.classList.toggle('on', chip === categoryButton));
    filt();
  } else if (subcategoryButton) {
    menuFilters.sub = subcategoryButton.dataset.sub;
    filt();
  } else if (deleteButton) del(deleteButton.dataset.del);
  else if (quantityButton) {
    const id = quantityButton.closest('[data-q]').dataset.q;
    const item = cart.find((item) => item.id === id);
    if (item) setQty(id, item.qty + (quantityButton.hasAttribute('data-p') ? 1 : -1));
  } else if (target.closest('#menuBtn')) {
    const open = document.body.classList.toggle('open');
    $('#menuBtn').setAttribute('aria-expanded', open);
  } else if (target.id === 'scrim' || target.closest('#nav a')) {
    document.body.classList.remove('open');
    $('#menuBtn').setAttribute('aria-expanded', 'false');
  }
});
document.addEventListener('input', (event) => {
  if (event.target.id === 'q') {
    menuFilters.q = event.target.value;
    filt();
  }
});
async function initialize() {
  $('#app').textContent = 'Carregando a Bonki…';
  try {
    await refreshContent();
    render();
  } catch (error) {
    $('#app').innerHTML =
      `<section class="wrap"><p role="alert">${escapeHTML(error.message)}</p><button class="btn b1" id="retry">Tentar novamente</button></section>`;
    $('#retry').onclick = initialize;
  }
}
initialize();

// Refresh when a visitor returns to the tab; checkout always refreshes too.
let syncing = false;
async function synchronizeContent() {
  if (!ready || syncing || document.hidden) return;
  syncing = true;
  const previous = contentRevision;
  try {
    await refreshContent();
    if (previous !== contentRevision) {
      closeModal();
      render();
    }
  } catch {
    // Keep the current page usable offline. Checkout reports connectivity failures.
  } finally {
    syncing = false;
  }
}
addEventListener('focus', synchronizeContent);
document.addEventListener('visibilitychange', synchronizeContent);
