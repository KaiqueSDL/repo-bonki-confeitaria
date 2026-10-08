import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { atomicJSON } from '../repositories/content.js';
import { AppError } from '../middleware/errors.js';

const derive = promisify(scrypt);
const parameters = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
export async function passwordHash(password) {
  const salt = randomBytes(32).toString('hex');
  const hash = (await derive(password, salt, 64, parameters)).toString('hex');
  return { algorithm: 'scrypt', salt, hash };
}
export async function createAdministrator(config, username, password) {
  if (
    !/^[a-zA-Z0-9@._-]{3,100}$/.test(username) ||
    typeof password !== 'string' ||
    password.length < 3 ||
    password.length > 128
  )
    throw new Error('Usuário inválido ou senha com menos de 12 caracteres.');
  await atomicJSON(path.join(config.privateDir, 'auth.json'), {
    username,
    ...(await passwordHash(password)),
  });
}
export class Authentication {
  constructor(config) {
    this.config = config;
    this.sessions = new Map();
    this.attempts = new Map();
  }
  async login(username, password, ip) {
    const now = Date.now();
    for (const [key, item] of this.attempts) if (item.until < now) this.attempts.delete(key);
    let attempt = this.attempts.get(ip);
    if (!attempt) {
      attempt = { count: 0, until: now + 15 * 60 * 1000 };
      this.attempts.set(ip, attempt);
    }
    if (attempt.count >= 8) throw new AppError(429, 'Muitas tentativas. Aguarde 15 minutos.');
    attempt.count++;
    if (typeof username !== 'string' || typeof password !== 'string' || password.length > 128)
      throw new AppError(401, 'Credenciais inválidas.');
    let account;
    try {
      account = JSON.parse(
        await fs.readFile(path.join(this.config.privateDir, 'auth.json'), 'utf8'),
      );
    } catch (error) {
      if (error.code === 'ENOENT')
        throw new AppError(
          503,
          'Administrador ainda não configurado. Execute npm run setup:admin.',
        );
      throw error;
    }
    const key = await derive(password, account.salt, 64, parameters);
    if (!timingSafeEqual(key, Buffer.from(account.hash, 'hex')) || username !== account.username)
      throw new AppError(401, 'Credenciais inválidas.');
    // Successful logins also remain rate limited to bound scrypt resource use.
    for (const [id, s] of this.sessions) if (s.expires < now) this.sessions.delete(id);
    const id = randomBytes(32).toString('hex');
    const session = {
      username: account.username,
      csrf: randomBytes(32).toString('hex'),
      expires: now + 8 * 60 * 60 * 1000,
    };
    this.sessions.set(id, session);
    return { id, session };
  }
  identify(req) {
    const id = (req.headers.cookie || '')
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('bonki_session='))
      ?.slice(14);
    const session = id && this.sessions.get(id);
    if (!session || session.expires < Date.now()) {
      if (id) this.sessions.delete(id);
      return null;
    }
    return { id, ...session };
  }
  cookie(res, id, clear = false) {
    res.cookie('bonki_session', id, {
      httpOnly: true,
      secure: this.config.production,
      sameSite: 'strict',
      path: '/',
      maxAge: clear ? 0 : 8 * 60 * 60 * 1000,
    });
  }
  require(req, res, next) {
    const session = this.identify(req);
    if (!session) return next(new AppError(401, 'Faça login para continuar.'));
    req.session = session;
    next();
  }
  csrf(req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const token = req.headers['x-csrf-token'];
    if (
      typeof token !== 'string' ||
      !/^[a-f0-9]{64}$/.test(token) ||
      !timingSafeEqual(Buffer.from(token), Buffer.from(req.session.csrf))
    )
      return next(new AppError(403, 'Token de sessão inválido. Recarregue o painel.'));
    next();
  }
}
