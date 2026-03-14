'use client';

export const TOKEN_KEY = 'onebusiness_token';
export const REFRESH_TOKEN_KEY = 'onebusiness_refresh_token';
export const USER_KEY = 'onebusiness_user';

let inMemoryAccessToken: string | null = null;

export function setApiClientAccessToken(token: string | null): void {
  inMemoryAccessToken = token;
}

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
  return inMemoryAccessToken;
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const cookieResponse = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    if (cookieResponse.ok) {
      const data = (await cookieResponse.json()) as { accessToken?: string };
      if (data.accessToken) {
        inMemoryAccessToken = data.accessToken;
        return data.accessToken;
      }
    }
  } catch {
    // ignore cookie refresh failures and fallback
  }
  inMemoryAccessToken = null;
  return null;
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
