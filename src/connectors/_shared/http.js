// Minimal fetch wrapper shared by every connector and service:
// builds the URL + query string, sends JSON (or FormData / raw Blob bytes), enforces a timeout,
// and throws on non-2xx so `withFallback` can switch to a mock.
async function request(url, { method = 'GET', query, body, headers = {}, timeoutMs = 15000 } = {}) {
  const target = new URL(url, window.location.origin);
  Object.entries(query || {}).forEach(([key, value]) => target.searchParams.set(key, value));

  const isForm = body instanceof FormData;
  const isBlob = body instanceof Blob; // raw bytes (e.g. a photo), sent with the blob's own type
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(target, {
      method,
      signal: controller.signal,
      headers: { ...(body && !isForm && !isBlob && { 'Content-Type': 'application/json' }), ...(isBlob && body.type && { 'Content-Type': body.type }), ...headers },
      body: body && !isForm && !isBlob ? JSON.stringify(body) : body,
    });
    if (!response.ok) throw new Error(`${method} ${target.pathname} -> ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

export const http = {
  get: (url, options) => request(url, options),
  post: (url, body, options) => request(url, { ...options, method: 'POST', body }),
};
