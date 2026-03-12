'use client';

export const TOKEN_KEY = 'onebusiness_token';
export const REFRESH_TOKEN_KEY = 'onebusiness_refresh_token';
export const USER_KEY = 'onebusiness_user';

type ApiError = {
  success?: boolean;
  error?: string;
  details?: unknown;
};

type ApiRequestInit = Omit<RequestInit, 'headers' | 'body'> & {
  headers?: Record<string, string>;
  body?: unknown;
  negocioId?: number;
  skipAuth?: boolean;
};

function getAccessToken(): string | null {
  return typeof window === 'undefined' ? null : localStorage.getItem(TOKEN_KEY);
}

function getRefreshToken(): string | null {
  return typeof window === 'undefined' ? null : localStorage.getItem(REFRESH_TOKEN_KEY);
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    return null;
  }

  const data = (await response.json()) as { accessToken?: string };
  if (!data.accessToken) return null;

  localStorage.setItem(TOKEN_KEY, data.accessToken);
  return data.accessToken;
}

export async function apiFetch<TResponse>(path: string, init: ApiRequestInit = {}): Promise<TResponse> {
  const headers: Record<string, string> = {
    ...(init.headers ?? {}),
  };

  if (!init.skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  if (typeof init.negocioId === 'number') {
    headers['X-Negocio-Id'] = String(init.negocioId);
  }

  if (init.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  const requestInit: RequestInit = {
    ...init,
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  };

  let response = await fetch(path, requestInit);

  if (response.status === 401 && !init.skipAuth) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers.Authorization = `Bearer ${newToken}`;
      response = await fetch(path, { ...requestInit, headers });
    }
  }

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    const payload = isJson ? ((await response.json()) as ApiError) : undefined;
    const message = payload?.error ?? `Error HTTP ${response.status}`;
    throw new Error(message);
  }

  return (isJson ? ((await response.json()) as TResponse) : ((await response.text()) as unknown as TResponse));
}
