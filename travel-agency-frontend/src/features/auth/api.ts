import { AUTH_CONFIG } from './constants';
import type { ErrorResponse, SignInResponse } from './types';

export async function signInRequest(email: string, password: string) {
  const response = await fetch(`${AUTH_CONFIG.apiBaseUrl}/auth/sign-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email.trim(),
      password,
    }),
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as ErrorResponse;
    return {
      ok: false as const,
      message: errorBody.message,
    };
  }

  const data = (await response.json()) as SignInResponse;
  return {
    ok: true as const,
    data,
  };
}
