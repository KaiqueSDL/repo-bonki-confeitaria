
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Diretório raiz do projeto
export const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

export function configuration(overrides = {}) {
  // Porta definida pela hospedagem ou ambiente local
  const port = Number(process.env.PORT || 3000);

  // Identifica o ambiente de produção
  const production = process.env.NODE_ENV === 'production';

  // Endereço público do site
  const origin = (
    process.env.APP_ORIGIN ||
    `http://localhost:${port}`
  ).replace(/\/+$/, '');

  // Diretórios de armazenamento
  const dataDir = path.resolve(
    process.env.DATA_DIR || path.join(projectRoot, 'data')
  );

  const uploadsDir = path.resolve(
    process.env.UPLOADS_DIR || path.join(projectRoot, 'uploads')
  );

  const privateDir = path.resolve(
    process.env.PRIVATE_DIR || path.join(projectRoot, 'private')
  );

  return {
    root: projectRoot,
    dataDir,
    uploadsDir,
    privateDir,
    origin,
    production,
    port,
    ...overrides
  };
}
