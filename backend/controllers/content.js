import { publicContent, usages } from '../services/content.js';
import { AppError } from '../middleware/errors.js';
export const revision = (req) => Number((req.get('If-Match') || '').replaceAll('"', '')) || NaN;
export function controllers(repository, content, media) {
  const send = (res, result) =>
    res
      .set('ETag', `"${result.revision}"`)
      .json({ data: result.result, revision: result.revision });
  return {
    async public(req, res) {
      res.json(publicContent(await repository.read()));
    },
    async document(req, res) {
      const data = publicContent(await repository.read());
      if (req.params.id) {
        const item = data.products.find((p) => p.id === req.params.id);
        if (!item) throw new AppError(404, 'Produto não encontrado.');
        return res.json({ data: item, revision: data.revision });
      }
      res.json({ data: data[req.params.document], revision: data.revision });
    },
    async admin(req, res) {
      const data = await repository.read();
      res.json({ ...data, media: data.media.map((m) => ({ ...m, uses: usages(data, m.id) })) });
    },
    async mutate(req, res) {
      send(
        res,
        await content.mutate(
          req.params.collection,
          req.params.id,
          req.method,
          req.body,
          revision(req),
        ),
      );
    },
    async replace(req, res) {
      send(res, await content.replace(req.params.document, req.body, revision(req)));
    },
    async upload(req, res) {
      send(res, await media.upload(req.file, req.body.bucket, req.body.alt, revision(req)));
    },
    async mediaUpdate(req, res) {
      send(res, await media.update(req.params.id, req.body.alt, revision(req)));
    },
    async mediaDelete(req, res) {
      send(res, await media.delete(req.params.id, revision(req)));
    },
    async mediaReplace(req, res) {
      send(res, await media.replace(req.params.id, req.body.replacementId, revision(req)));
    },
    async mediaList(req, res) {
      const data = await repository.read();
      res.json({
        data: data.media.map((m) => ({ ...m, uses: usages(data, m.id) })),
        revision: data.revision,
      });
    },
  };
}
