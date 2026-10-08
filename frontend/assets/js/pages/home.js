function homeSlide(slide, index) {
  const external = slide.button.url.startsWith('https:');
  return `<div class="slide ${index === 0 ? 'on' : ''}"><div><h1 class="disp">${escapeHTML(slide.title)}</h1><p>${escapeHTML(slide.description)}</p><div class="acts"><a class="btn b1" href="${escapeHTML(slide.button.url)}" ${external ? 'target="_blank" rel="noopener"' : ''}>${escapeHTML(slide.button.text)}</a>${waBtn(SETTINGS.messages.order, SETTINGS.messages.heroButton)}</div></div><div class="vis ${slide.layout === 'stack' ? 'stack' : ''}">${slide.images.map((image) => `<img src="${escapeHTML(image.path)}" alt="${escapeHTML(image.alt)}">`).join('')}</div></div>`;
}
function pHome() {
  const home = SETTINGS.home,
    slides = CAROUSEL.slides;
  const featured = PRODUCTS.filter((product) => product.featured);
  const hero = slides.length
    ? `<section class="hero" aria-roledescription="carrossel" aria-label="Destaques">${slides.map(homeSlide).join('')}<div class="arch"></div>${CAROUSEL.settings.showArrows && slides.length > 1 ? `<button class="arrow l" aria-label="Slide anterior">${ic('left')}</button><button class="arrow r" aria-label="Próximo slide">${ic('right')}</button>` : ''}${CAROUSEL.settings.showIndicators ? '<div class="dots"></div>' : ''}</section>`
    : '';
  return `${hero}<section class="wrap sec"><div class="eyebrow">${escapeHTML(home.featuredEyebrow)}</div><h2>${escapeHTML(home.featuredTitle)}</h2><p class="inline-style-04">${escapeHTML(home.featuredDescription)}</p><div class="grid">${featured.map(card).join('')}</div><p class="inline-style-08"><a class="btn bo" href="#/cardapio">${escapeHTML(home.featuredButton)}</a></p></section>
  <section class="wrap sec"><div class="about fade">${home.aboutImage ? `<div class="pic"><img src="${escapeHTML(home.aboutImage.path)}" alt="${escapeHTML(home.aboutImage.alt)}" loading="lazy"></div>` : ''}<div><div class="eyebrow">${escapeHTML(home.aboutEyebrow)}</div><h2>${escapeHTML(home.aboutTitle)}</h2><p>${escapeHTML(home.aboutText)}</p><a class="btn b2" href="#/historia">${escapeHTML(home.aboutButton)}</a></div></div></section>
  <section class="wrap inline-style-09"><div class="cta fade"><h2>${escapeHTML(home.ctaTitle)}</h2><p>${escapeHTML(home.ctaText)}</p>${waBtn(SETTINGS.messages.order, home.ctaButton)}</div></section>`;
}
