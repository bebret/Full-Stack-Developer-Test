const BASE_URL = '/api';

function toQuery(params = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      payload?.error ?? `Permintaan ke API gagal (HTTP ${response.status}).`,
    );
    error.status = response.status;
    error.code = payload?.code ?? null;
    error.requestId = payload?.requestId ?? response.headers.get('X-Request-Id');
    error.details = payload?.details ?? null;
    error.errors = payload?.errors ?? [];
    throw error;
  }

  return payload;
}

export const api = {
  health: () => request('/health'),
  statuses: () => request('/statuses'),
  summary: (params) => request(`/transactions/summary${toQuery(params)}`),
  grouped: (params) => request(`/transactions/grouped${toQuery(params)}`),
  list: (params) => request(`/transactions${toQuery(params)}`),
  detail: (id) => request(`/transactions/${id}`),
  create: (body) => request('/transactions', { method: 'POST', body: JSON.stringify(body) }),
  update: (id, body) =>
    request(`/transactions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id) => request(`/transactions/${id}`, { method: 'DELETE' }),
};
