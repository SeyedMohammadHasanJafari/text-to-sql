/**
 * Standard HTTP client for communicating with the Text-to-SQL API.
 * Automatically transmits same-site cookies and unifies error handling.
 */
export async function apiFetch(endpoint, options = {}) {
  const { body, headers = {}, ...customConfig } = options;

  const method = customConfig.method || (body ? 'POST' : 'GET');
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());

  const config = {
    method,
    headers: {
      ...(isMutation && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    credentials: 'include', // ensures session cookies are transmitted
    ...customConfig,
  };

  if (body && typeof body === 'object') {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(endpoint, config);

  if (response.status === 204) {
    return null;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data?.error?.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.code = data?.error?.code || 'UNKNOWN_ERROR';
    error.details = data?.error?.details;
    throw error;
  }

  return data;
}
