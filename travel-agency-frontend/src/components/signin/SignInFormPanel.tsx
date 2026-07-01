import type { FormEvent } from 'react';
import type { SignInErrors } from '../../features/auth/types';

type SignInFormPanelProps = {
  email: string;
  password: string;
  showPassword: boolean;
  isLocked: boolean;
  isSubmitting: boolean;
  errors: SignInErrors;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onToggleShowPassword: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onNavigateToForgotPassword?: () => void;
  onNavigateToRegister?: () => void;
  onGoogleLogin?: () => void;
};

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        className="signin-eye-icon"
        viewBox="0 0 24 24"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
  }

  return (
    <svg
      className="signin-eye-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-4.4" />
      <path d="M9.4 5.2A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a17.2 17.2 0 0 1-4.1 4.8" />
      <path d="M6.2 6.2A17.7 17.7 0 0 0 2 12s3.5 7 10 7a10.8 10.8 0 0 0 2.1-.2" />
    </svg>
  );
}

function SignInFormPanel({
  email,
  password,
  showPassword,
  isLocked,
  isSubmitting,
  errors,
  onEmailChange,
  onPasswordChange,
  onToggleShowPassword,
  onSubmit,
  onNavigateToForgotPassword,
  onNavigateToRegister,
  onGoogleLogin,
}: SignInFormPanelProps) {
  return (
    <section className="signin-card signin-form-card">
      <form className="signin-form" onSubmit={onSubmit} noValidate>
        <header className="signin-form-header">
          <p className="signin-eyebrow">WELCOME BACK</p>
          <h1>Sign in to your account</h1>
        </header>

        <div className="signin-fields">
          {errors.lock ? (
            <div className="signin-lock-error">{errors.lock}</div>
          ) : null}

          <div className="signin-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="johnsondoe@nomail.com"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              disabled={isLocked || isSubmitting}
              style={errors.email ? { borderColor: '#c34d4d' } : undefined}
            />
            <p className={errors.email ? 'signin-helper-text signin-helper-text-error' : 'signin-helper-text'}>
              {errors.email || 'e.g. username@domain.com'}
            </p>
          </div>

          <div className="signin-field">
            <label htmlFor="password">Password</label>
            <div className="signin-input-with-action">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                onPaste={(e) => e.preventDefault()}
                disabled={isLocked || isSubmitting}
                style={errors.password ? { borderColor: '#c34d4d' } : undefined}
              />
              <button
                type="button"
                className="signin-input-action"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={onToggleShowPassword}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
            {errors.password ? (
              <p className="signin-helper-text signin-helper-text-error">{errors.password}</p>
            ) : null}
          </div>
        </div>

        <div className="signin-form-actions">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onNavigateToForgotPassword?.();
            }}
            className="signin-forgot-link"
          >
            Forgot password?
          </a>

          <button className="signin-submit-button" type="submit" disabled={isLocked || isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </button>

          <p className="signin-register-copy">
            Don&apos;t have an account?{' '}
            {onNavigateToRegister ? (
              <button
                type="button"
                onClick={onNavigateToRegister}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#027eac', textDecoration: 'underline', textUnderlineOffset: '2px', font: 'inherit' }}
              >
                Create an account
              </button>
            ) : (
              <a href="/register">Create an account</a>
            )}
          </p>

          {onGoogleLogin && (
            <>
              <div className="signin-divider">
                <span className="signin-divider-text">or continue with</span>
              </div>
              <button type="button" className="signin-google-button" onClick={onGoogleLogin}>
                <svg className="signin-google-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>
            </>
          )}
        </div>
      </form>
    </section>
  );
}

export default SignInFormPanel;
