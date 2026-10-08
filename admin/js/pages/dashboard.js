import { state } from '../services/api.js';
export function dashboard(container) {
  const content = state.content;
  const stats = [
    ['Produtos cadastrados', content.products.length],
    ['Produtos ativos', content.products.filter((product) => product.active).length],
    ['Indisponíveis', content.products.filter((product) => !product.available).length],
    ['Em destaque', content.products.filter((product) => product.featured).length],
    ['Slides cadastrados', content.carousel.slides.length],
    ['Fotografias', content.media.length],
  ];
  container.innerHTML = `<h1>Um carinho com a Bonki</h1><p>Seu catálogo e conteúdo, em um só lugar.</p><div class="stats">${stats.map(([label, count]) => `<article class="panel stat">${label}<strong>${count}</strong></article>`).join('')}</div><div class="panel"><h2>O que vamos atualizar?</h2><div class="actions"><a class="button" href="#/products/new">+ Cadastrar produto</a><a class="button secondary" href="#/carousel">Alterar banners</a><a class="button secondary" href="#/media">Enviar fotografias</a></div><p class="help">Salvar publica imediatamente. Cada alteração gera uma cópia de segurança. O site direciona pedidos ao WhatsApp; este painel não registra vendas ou faturamento.</p></div>`;
}
