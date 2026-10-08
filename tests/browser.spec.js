import { test, expect } from '@playwright/test';
import { fixture } from './helpers.js';
let application;
test.beforeAll(async () => {
  application = await fixture();
});
test.afterAll(async () => {
  await application.cleanup();
});
test('site público: páginas, modal, carrinho e ausência de erros de JavaScript', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(application.origin);
  await expect(page.locator('.slide')).toHaveCount(3);
  await page.locator('[data-add]').first().click();
  await page.locator('#fab').click();
  await expect(page.locator('.crow')).toHaveCount(1);
  await page.locator('.crow [data-p]').click();
  await expect(page.locator('.crow .qty span')).toHaveText('2');
  await page.reload();
  await expect(page.locator('.crow .qty span')).toHaveText('2');
  await page.goto(application.origin + '/#/cardapio');
  await page.getByRole('searchbox').fill('latte');
  await expect(page.locator('#list .card')).toHaveCount(1);
  await page.locator('#list [data-open]').first().click();
  await expect(page.locator('#modal')).toHaveClass('on');
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.goto(application.origin + '/#/historia');
  await expect(page.getByRole('heading', { name: 'Nossa História', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test('painel: login, criação, prévia e logout', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(application.origin + '/admin');
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.getByLabel('Usuário', { exact: true }).fill('test-admin');
  await page.getByLabel('Senha', { exact: true }).fill('senha-de-teste-123456');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Um carinho com a Bonki' })).toBeVisible();
  await page.getByRole('link', { name: '+ Cadastrar produto' }).click();
  await page.getByLabel('Nome', { exact: true }).fill('Produto criado no navegador');
  await page.getByLabel('Descrição', { exact: true }).fill('Cookie cadastrado pela equipe.');
  await page.getByLabel('Preço em reais').fill('14.90');
  await page.getByLabel('Subcategoria', { exact: true }).selectOption({ index: 1 });
  await page.getByLabel('Imagem principal', { exact: true }).selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Pré-visualizar' }).click();
  await expect(page.locator('#preview')).toBeVisible();
  await page.getByRole('button', { name: 'Fechar prévia' }).click();
  await page.getByRole('button', { name: 'Salvar e publicar' }).click();
  await expect(page.locator('#notice')).toContainText('Produto salvo');
  await page.getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  expect(errors).toEqual([]);
});
test('celular: largura e menu público', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(application.origin);
  await expect(page.locator('.slide.on')).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
  ).toBeTruthy();
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await expect(page.locator('body')).toHaveClass(/open/);
  await page.locator('#nav').getByRole('link', { name: 'Cardápio', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Escolha seu sabor' })).toBeVisible();
});

test('painel no navegador: upload, novo slide, história e WhatsApp publicados', async ({
  page,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(application.origin + '/admin/login');
  await page.getByLabel('Usuário', { exact: true }).fill('test-admin');
  await page.getByLabel('Senha', { exact: true }).fill('senha-de-teste-123456');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Um carinho com a Bonki' })).toBeVisible();
  await page.getByRole('link', { name: 'Biblioteca de imagens', exact: true }).click();
  const mediaBefore = await (
    await page.request.get(application.origin + '/api/admin/media')
  ).json();
  const file = mediaBefore.data[0];
  await page.locator('[name="newMediaAlt"]').fill('Fotografia enviada pelo navegador');
  await page
    .locator('[data-file]')
    .setInputFiles(application.config.uploadsDir + file.path.replace('/uploads', ''));
  await page.getByRole('button', { name: 'Enviar fotografia', exact: true }).click();
  await expect(page.locator('#notice')).toContainText('Fotografia enviada');
  const uploadedID = await page.locator('[name="newMedia"]').inputValue();
  const mediaAfter = await (await page.request.get(application.origin + '/api/admin/media')).json();
  expect(mediaAfter.data.length).toBe(mediaBefore.data.length + 1);
  await page.getByRole('link', { name: 'Carrossel', exact: true }).click();
  await page.getByRole('link', { name: '+ Novo slide' }).click();
  await page.getByLabel('Título', { exact: true }).fill('Slide publicado pelo navegador');
  await page.getByLabel('Descrição', { exact: true }).fill('Nossa próxima fornada');
  await page.getByLabel('Fotografia principal', { exact: true }).selectOption(uploadedID);
  await page.getByLabel('Posição', { exact: true }).fill('0');
  await page.getByRole('button', { name: 'Salvar e publicar' }).click();
  await expect(page.locator('#notice')).toContainText('Slide salvo');
  const carousel = await (await page.request.get(application.origin + '/api/carousel')).json();
  expect(carousel.data.slides[0].title).toBe('Slide publicado pelo navegador');
  await page.getByRole('link', { name: 'Nossa História', exact: true }).click();
  await page.getByLabel('Título da página', { exact: true }).fill('Nossa história pelo navegador');
  await page.getByRole('button', { name: 'Salvar e publicar' }).click();
  await expect(page.locator('#notice')).toContainText('História publicada');
  await page.getByRole('link', { name: 'Configurações do site', exact: true }).click();
  await page
    .getByLabel('WhatsApp (somente dígitos, com DDI e DDD)', { exact: true })
    .fill('5511777777777');
  await page.getByRole('button', { name: 'Salvar e publicar' }).click();
  await expect(page.locator('#notice')).toContainText('Configurações publicadas');
  const settings = await (await page.request.get(application.origin + '/api/settings')).json();
  expect(settings.data.contact.whatsapp).toBe('5511777777777');
  expect(errors).toEqual([]);
});
