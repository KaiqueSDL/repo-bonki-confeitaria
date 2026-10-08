import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { AppError } from '../middleware/errors.js';
import { altText, mediaId } from '../validators/content.js';
import { usages } from './content.js';

export class MediaService {
  constructor(config, repository) {
    this.config = config;
    this.repository = repository;
  }
  async upload(file, bucket, alt, version) {
    if (!file) throw new AppError(400, 'Envie uma imagem.');
    if (!['products', 'carousel', 'institutional'].includes(bucket))
      throw new AppError(400, 'Pasta de mídia inválida.');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype))
      throw new AppError(400, 'Aceitamos JPEG, PNG e WebP.');
    let buffer, metadata;
    try {
      const source = sharp(file.buffer, { limitInputPixels: 24_000_000, animated: false });
      metadata = await source.metadata();
      if (
        !['jpeg', 'png', 'webp'].includes(metadata.format) ||
        (metadata.pages || 1) > 1 ||
        file.mimetype !== `image/${metadata.format}`
      )
        throw new Error('Tipo inválido.');
      buffer = await source
        .rotate()
        .resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 88 })
        .toBuffer();
    } catch {
      throw new AppError(400, 'Arquivo inválido ou imagem maior que 24 megapixels.');
    }
    const id = randomUUID(),
      filename = `${id}.webp`,
      target = path.join(this.config.uploadsDir, bucket, filename);
    const record = {
      id,
      filename,
      originalName: path.basename(file.originalname).slice(0, 200),
      path: `/uploads/${bucket}/${filename}`,
      mime: 'image/webp',
      size: buffer.length,
      width: metadata.width,
      height: metadata.height,
      alt: altText(alt),
      createdAt: new Date().toISOString(),
    };
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, buffer, { flag: 'wx' });
    try {
      return await this.repository.transaction(version, (data) => {
        data.media.push(record);
        return record;
      });
    } catch (error) {
      await fs.rm(target, { force: true });
      throw error;
    }
  }
  async update(id, value, version) {
    return this.repository.transaction(version, (data) => {
      const m = data.media.find((m) => m.id === id);
      if (!m) throw new AppError(404, 'Imagem não encontrada.');
      m.alt = altText(value);
      return m;
    });
  }
  async replace(id, replacementId, version) {
    return this.repository.transaction(version, (data) => {
      mediaId(id, data);
      mediaId(replacementId, data);
      if (id === replacementId) throw new AppError(400, 'Selecione outra imagem.');
      for (const product of data.products) {
        if (product.imageId === id) product.imageId = replacementId;
      }
      for (const slide of data.carousel.slides) {
        slide.imageIds = slide.imageIds.map((imageId) =>
          imageId === id ? replacementId : imageId,
        );
      }
      if (data.history.foundersImageId === id) data.history.foundersImageId = replacementId;
      if (data.settings.home.aboutImageId === id) data.settings.home.aboutImageId = replacementId;
      return { id, replacementId };
    });
  }
  async delete(id, version) {
    // Keep recoverable bytes privately; public file is unlinked only after commit.
    let target;
    const result = await this.repository.transaction(version, async (data) => {
      const m = data.media.find((m) => m.id === id);
      if (!m) throw new AppError(404, 'Imagem não encontrada.');
      if (usages(data, id).length)
        throw new AppError(409, 'Imagem em uso. Substitua todas as referências antes de excluir.');
      target = path.join(this.config.uploadsDir, ...m.path.replace('/uploads/', '').split('/'));
      const trash = path.join(this.config.privateDir, 'media-trash', m.filename);
      await fs.mkdir(path.dirname(trash), { recursive: true });
      await fs.copyFile(target, trash);
      data.media = data.media.filter((m) => m.id !== id);
      return { id };
    });
    // Even if unlink fails, static media routing consults the registry.
    await fs
      .rm(target, { force: true })
      .catch((error) => console.error('Limpeza de mídia:', error.message));
    return result;
  }
}
