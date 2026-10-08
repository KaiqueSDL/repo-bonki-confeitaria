export const state = { content: null, session: null };

export async function request(url, { method = 'GET', body } = {}) {
  const headers = {};
  if (method !== 'GET') {
    headers['X-CSRF-Token'] = state.session?.csrf || '';
    headers['If-Match'] = String(state.content?.revision || '');
  }
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }
  const response = await fetch(url, { method, headers, body, cache: 'no-store' });
  const result = await response.json();
  if (response.status === 401) {
    location.href = '/admin/login';
    throw new Error('Sessão encerrada. Entre novamente.');
  }
  if (!response.ok) throw new Error(result.error || 'Não foi possível salvar.');
  if (result.revision && state.content) state.content.revision = result.revision;
  return result;
}
export async function loadContent() {
  state.content = await request('/api/admin/content');
}
