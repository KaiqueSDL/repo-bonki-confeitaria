// Bonki Confeitaria — assets/js/router.js

function render() {
  if (!ready) return;
  clearInterval(timer);
  const r = (location.hash || '#/').replace('#', '');
  const app = $('#app');
  const pages = { '/': pHome, '/historia': pHist, '/cardapio': pMenu, '/carrinho': pCart };
  app.innerHTML = `<div class="page">${(pages[r] || pHome)()}${footer()}</div>`;
  document.title =
    ({ '/historia': 'Nossa História', '/cardapio': 'Cardápio', '/carrinho': 'Carrinho' }[r] ||
      'Cookies Artesanais') +
    ' | ' +
    CONFIG.nome;
  document.body.classList.remove('open');
  $('#menuBtn').setAttribute('aria-expanded', 'false');
  renderBadges();
  observe();
  if (r === '/cardapio') filt();
  if (!pages[r] || r === '/') carousel();
}
addEventListener('hashchange', () => {
  render();
  scrollTo(0, 0);
});
