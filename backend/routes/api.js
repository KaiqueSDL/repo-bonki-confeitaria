import { Router } from 'express';
import multer from 'multer';
import { controllers } from '../controllers/content.js';
import { AppError } from '../middleware/errors.js';

export function apiRoutes({ config, authentication, repository, content, media }) {
  const router = Router(),
    c = controllers(repository, content, media);
  router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('Origin') !== config.origin)
      return next(new AppError(403, 'Origem da requisição não autorizada.'));
    next();
  });
  router.post('/auth/login', async (req, res) => {
    const { id, session } = await authentication.login(
      req.body.username,
      req.body.password,
      req.ip,
    );
    authentication.cookie(res, id);
    res.json({ username: session.username, csrf: session.csrf });
  });
  router.get('/auth/session', authentication.require.bind(authentication), (req, res) =>
    res.json({ username: req.session.username, csrf: req.session.csrf }),
  );
  router.post(
    '/auth/logout',
    authentication.require.bind(authentication),
    authentication.csrf.bind(authentication),
    (req, res) => {
      authentication.sessions.delete(req.session.id);
      authentication.cookie(res, '', true);
      res.json({ ok: true });
    },
  );
  router.get('/content', c.public);
  router.get('/products/:id', (req, res, next) => {
    req.params.document = 'products';
    return c.document(req, res).catch(next);
  });
  for (const document of ['products', 'categories', 'carousel', 'settings', 'history'])
    router.get(`/${document}`, (req, res, next) => {
      req.params.document = document;
      return c.document(req, res).catch(next);
    });
  router.use(
    '/admin',
    authentication.require.bind(authentication),
    authentication.csrf.bind(authentication),
  );
  router.get('/admin/content', c.admin);
  for (const collection of ['products', 'categories', 'carousel']) {
    router.post(`/admin/${collection}`, (req, res, next) => {
      req.params.collection = collection;
      return c.mutate(req, res).catch(next);
    });
    for (const method of ['put', 'delete'])
      router[method](`/admin/${collection}/:id`, (req, res, next) => {
        req.params.collection = collection;
        return c.mutate(req, res).catch(next);
      });
  }
  for (const document of ['settings', 'history', 'carousel-settings'])
    router.put(`/admin/${document}`, (req, res, next) => {
      req.params.document = document;
      return c.replace(req, res).catch(next);
    });
  router.get('/admin/media', c.mediaList);
  router.post(
    '/admin/media/upload',
    multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024, files: 1, fields: 3, parts: 4 },
    }).single('image'),
    c.upload,
  );
  router.put('/admin/media/:id', c.mediaUpdate);
  router.put('/admin/media/:id/replace', c.mediaReplace);
  router.delete('/admin/media/:id', c.mediaDelete);
  router.use((req, res, next) => next(new AppError(404, 'Endpoint não encontrado.')));
  return router;
}
