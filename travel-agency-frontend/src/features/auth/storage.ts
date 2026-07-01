import { AUTH_STORAGE_KEY } from '../../constants';
import type { SignInResponse } from './types';

export function persistAuthSession(data: SignInResponse) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
    idToken: data.idToken,
    email: data.email,
    role: data.role,
    userName: data.userName,
    userId: data.userId,
  }));
}
