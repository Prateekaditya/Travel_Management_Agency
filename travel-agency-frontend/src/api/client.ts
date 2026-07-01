// Use the env-var when provided (e.g. for production), otherwise fall back to
// the relative path so the Vite dev-server proxy can forward requests.
export const BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api/v1';

// ── Token storage ─────────────────────────────────────────────────────────────
// Store the JWT in memory (not localStorage) to reduce XSS attack surface.
let authToken: string | null = null;

export function setAuthToken(token: string | null): void {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

// ── Base fetch wrapper ────────────────────────────────────────────────────────
interface RequestOptions {
  method?: string;
  body?: unknown;
  token?: string; // override the global token for a specific call
  signal?: AbortSignal; // allows callers to cancel the request
}

export async function apiRequest<T>(
  path: string,
  { method = 'GET', body, token, signal }: RequestOptions = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const resolvedToken = token ?? authToken;
  
  if (resolvedToken) {
    headers['Authorization'] = `Bearer ${resolvedToken}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  if (!response.ok) {
    let message = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const text = await response.text();
      if (text) {
        const backendError = JSON.parse(text);
        if (backendError?.message) message = backendError.message;
        else if (backendError?.error) message = backendError.error;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  // 204 No Content — nothing to parse
  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return response.json() as Promise<T>;
}
