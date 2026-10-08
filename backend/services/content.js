import { randomUUID } from 'node:crypto';
import { AppError } from '../middleware/errors.js';
import * as validate from '../validators/content.js';

export const sorted = (list) => [...list].sort((a, b) => a.order - b.order);
export function image(data, id) {
  return data.media.find((m) => m.id === id) || null;
}
export function publicContent(data) {
  const categories = sorted(data.categories.filter((c) => c.active)).map((c) => ({
    ...c,
    subcategories: sorted(c.subcategories.filter((s) => s.active)),
  }));
  const products = sorted(
    data.products.filter(
      (p) =>
        p.active &&
        categories.some(
          (c) => c.id === p.categoryId && c.subcategories.some((s) => s.id === p.subcategoryId),
        ),
    ),
  ).map((p) => {
    const category = categories.find((c) => c.id === p.categoryId),
      sub = category.subcategories.find((s) => s.id === p.subcategoryId);
    return { ...p, category: category.name, subcategory: sub.name, image: image(data, p.imageId) };
  });
  return {
    revision: data.revision,
    products,
    categories,
    carousel: {
      settings: data.carousel.settings,
      slides: sorted(data.carousel.slides.filter((s) => s.active)).map((s) => ({
        ...s,
        images: s.imageIds.map((id) => image(data, id)),
      })),
    },
    history: {
      ...data.history,
      foundersImage: image(data, data.history.foundersImageId),
      timeline: sorted(data.history.timeline),
    },
    settings: {
      ...data.settings,
      home: { ...data.settings.home, aboutImage: image(data, data.settings.home.aboutImageId) },
    },
  };
}
export function usages(data, id) {
  const uses = [];
  for (const p of data.products)
    if (p.imageId === id) uses.push({ section: 'Produto', id: p.id, name: p.name });
  for (const s of data.carousel.slides)
    if (s.imageIds.includes(id)) uses.push({ section: 'Carrossel', id: s.id, name: s.title });
  if (data.history.foundersImageId === id)
    uses.push({ section: 'História', name: 'Foto das fundadoras' });
  if (data.settings.home.aboutImageId === id)
    uses.push({ section: 'Início', name: 'Sobre a Bonki' });
  return uses;
}
export class ContentService {
  constructor(repository) {
    this.repository = repository;
  }
  async mutate(collection, id, method, value, version) {
    return this.repository.transaction(version, (data) => {
      const list = collection === 'carousel' ? data.carousel.slides : data[collection];
      const item = id && list.find((i) => i.id === id);
      if (id && !item) throw new AppError(404, 'Registro não encontrado.');
      if (method === 'DELETE') {
        if (collection === 'categories' && data.products.some((p) => p.categoryId === id))
          throw new AppError(
            409,
            'Categoria associada a produtos. Reassocie os produtos antes de excluir.',
          );
        list.splice(list.indexOf(item), 1);
        return { id };
      }
      const clean =
        collection === 'products'
          ? validate.product(value, data)
          : collection === 'carousel'
            ? validate.slide(value, data)
            : validate.category(value, item);
      if (collection === 'categories') {
        if (
          data.categories.some(
            (c) => c.id !== id && c.name.toLowerCase() === clean.name.toLowerCase(),
          )
        )
          throw new AppError(400, 'Já existe uma categoria com esse nome.');
        if (
          item &&
          data.products.some(
            (p) =>
              p.categoryId === id && !clean.subcategories.some((s) => s.id === p.subcategoryId),
          )
        )
          throw new AppError(409, 'Uma subcategoria removida ainda possui produtos.');
      }
      const record = { ...clean, id: id || randomUUID() };
      if (item) list[list.indexOf(item)] = record;
      else list.push(record);
      return record;
    });
  }
  async replace(name, value, version) {
    return this.repository.transaction(version, (data) => {
      if (name === 'history') data.history = validate.history(value, data);
      if (name === 'settings') data.settings = validate.settings(value, data);
      if (name === 'carousel-settings') data.carousel.settings = validate.carouselSettings(value);
      return name === 'carousel-settings' ? data.carousel.settings : data[name];
    });
  }
}
