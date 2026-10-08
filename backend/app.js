import express from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import { configuration } from './config.js';
import { ContentRepository } from './repositories/content.js';
import { Authentication } from './services/auth.js';
import { ContentService } from './services/content.js';
import { MediaService } from './services/media.js';
import { apiRoutes } from './routes/api.js';
import { errorHandler } from './middleware/errors.js';

export function createApp(overrides = {}) {
  const config = configuration(overrides),
    app = express();
  const repository = new ContentRepository(config),
    authentication = new Authentication(config);
  const content = new ContentService(repository),
    media = new MediaService(config, repository);
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'same-origin',
      'X-Frame-Options': 'SAMEORIGIN',
      'Content-Security-Policy':
        "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' blob:; connect-src 'self'; frame-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self'; form-action 'self'",
    });
    if (config.production) res.set('Strict-Transport-Security', 'max-age=31536000');
    next();
  });
  app.use(express.json({ limit: '256kb', strict: true }));
  app.use('/api', apiRoutes({ config, repository, authentication, content, media }));
  app.get('/admin/login', (req, res) =>
    res.set('Cache-Control', 'no-store').sendFile(path.join(config.root, 'admin/login.html')),
  );
  app.use('/admin/login-assets', express.static(path.join(config.root, 'admin/login-assets')));
  app.use(
    '/admin',
    (req, res, next) => {
      res.set('Cache-Control', 'no-store');
      if (!authentication.identify(req)) return res.redirect('/admin/login');
      next();
    },
    express.static(path.join(config.root, 'admin'), { index: 'index.html', dotfiles: 'deny' }),
  );
  app.use(
    '/uploads',
    async (req, res, next) => {
      const data = await repository.read();
      if (!data.media.some((m) => m.path === req.originalUrl.split('?')[0]))
        return res.sendStatus(404);
      next();
    },
    express.static(config.uploadsDir, {
      dotfiles: 'deny',
      immutable: true,
      maxAge: '1y',
      fallthrough: false,
    }),
  );
  app.use(express.static(path.join(config.root, 'frontend'), { dotfiles: 'deny', maxAge: 0 }));
  app.use((req, res) => res.status(404).send('Página não encontrada.'));
  app.use(errorHandler);
  app.locals.config = config;
  app.locals.repository = repository;
  app.locals.authentication = authentication;
  return app;
}
