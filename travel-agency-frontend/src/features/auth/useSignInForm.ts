import { useState, type FormEvent } from 'react';
import { signInRequest } from './api';
import { AUTH_CONFIG, AUTH_MESSAGES } from './constants';
import { persistAuthSession } from './storage';
import type { SignInErrors } from './types';

export function useSignInForm(onSuccess?: () => void) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<SignInErrors>({});

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isLocked) {
      setErrors({
        email: AUTH_MESSAGES.invalidCredentials,
        password: AUTH_MESSAGES.invalidCredentials,
        lock: AUTH_MESSAGES.lock,
      });
      return;
    }

    const nextErrors: SignInErrors = {};

    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      nextErrors.email = AUTH_MESSAGES.requiredEmail;
    } else if (!EMAIL_REGEX.test(email.trim())) {
      nextErrors.email = AUTH_MESSAGES.invalidEmail;
    }

    if (!password.trim()) {
      nextErrors.password = AUTH_MESSAGES.requiredPassword;
    }

    if (nextErrors.email || nextErrors.password) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await signInRequest(email, password);

      if (!result.ok) {
        const nextAttempts = failedAttempts + 1;
        const shouldLock = nextAttempts >= AUTH_CONFIG.maxFailedAttempts;

        setFailedAttempts(nextAttempts);
        setIsLocked(shouldLock);
        setErrors({
          email: result.message || AUTH_MESSAGES.invalidCredentials,
          password: result.message || AUTH_MESSAGES.invalidCredentials,
          lock: shouldLock ? AUTH_MESSAGES.lock : undefined,
        });
        return;
      }

      persistAuthSession(result.data);
      onSuccess?.();
      setFailedAttempts(0);
      setIsLocked(false);
      setErrors({});
    } catch {
      const nextAttempts = failedAttempts + 1;
      const shouldLock = nextAttempts >= AUTH_CONFIG.maxFailedAttempts;

      setFailedAttempts(nextAttempts);
      setIsLocked(shouldLock);
      setErrors({
        email: AUTH_MESSAGES.genericFailure,
        password: AUTH_MESSAGES.genericFailure,
        lock: shouldLock ? AUTH_MESSAGES.lock : undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    email,
    password,
    showPassword,
    failedAttempts,
    isLocked,
    isSubmitting,
    errors,
    setEmail,
    setPassword,
    setShowPassword,
    handleSubmit,
  };
}
