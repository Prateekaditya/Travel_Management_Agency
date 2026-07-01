export const AUTH_MESSAGES = {
  requiredEmail:
    'Email address is required. Please enter your email to continue',
  invalidEmail:
    'Please enter a valid email address (e.g. username@domain.com).',
  requiredPassword:
    'Password is required. Please enter your password to continue.',
  invalidCredentials:
    'Incorrect email or password. Try again or create an account.',
  lock:
    'Your account is temporarily locked due to multiple failed login attempts. Please try again later.',
  genericFailure: 'Authentication failed. Please try again.',
} as const;

export const AUTH_CONFIG = {
  maxFailedAttempts: 3,
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api/v1',
} as const;
