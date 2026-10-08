let observer, timer;
function observe() {
  observer?.disconnect();
  observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          observer.unobserve(entry.target);
        }
      }),
    { threshold: 0.1 },
  );
  $$('.fade:not(.in)').forEach((element) => observer.observe(element));
}
function carousel() {
  const slides = $$('.slide');
  if (!slides.length) return;
  let current = 0;
  const dots = $('.dots'),
    hero = $('.hero');
  hero.style.setProperty('--slide-transition', `${CAROUSEL.settings.transition}ms`);
  if (dots)
    dots.innerHTML = slides
      .map((_, index) => `<button aria-label="Slide ${index + 1}"></button>`)
      .join('');
  const go = (index) => {
    current = (index + slides.length) % slides.length;
    slides.forEach((slide, index) => {
      slide.classList.toggle('on', current === index);
      slide.setAttribute('aria-hidden', String(current !== index));
      slide.inert = current !== index;
    });
    if (dots)
      $$('button', dots).forEach((button, index) =>
        button.classList.toggle('on', index === current),
      );
  };
  const start = () => {
    clearInterval(timer);
    if (
      CAROUSEL.settings.autoplay &&
      slides.length > 1 &&
      !matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      timer = setInterval(() => go(current + 1), CAROUSEL.settings.interval);
  };
  go(0);
  start();
  hero.onmouseenter = () => clearInterval(timer);
  hero.onmouseleave = start;
  hero.onfocusin = () => clearInterval(timer);
  hero.onfocusout = start;
  const left = $('.arrow.l'),
    right = $('.arrow.r');
  if (left) left.onclick = () => go(current - 1);
  if (right) right.onclick = () => go(current + 1);
  if (dots) $$('button', dots).forEach((button, index) => (button.onclick = () => go(index)));
  let initialX;
  hero.ontouchstart = (event) => (initialX = event.touches[0].clientX);
  hero.ontouchend = (event) => {
    const delta = event.changedTouches[0].clientX - initialX;
    if (Math.abs(delta) > 50) go(current + (delta < 0 ? 1 : -1));
  };
}
