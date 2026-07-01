import { FormEvent, useEffect, useMemo, useState } from 'react';
import { forgotPassword, resetPassword, verifyResetCode } from '../api/auth';
import { useRouter } from '../context/RouterContext';
import SignInHeroPanel from '../components/signin/SignInHeroPanel';
import './ForgotPasswordPage.css';

type Step = 'request' | 'verify' | 'reset';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_REGEX = /^\d{6}$/;
const CODE_RESEND_COOLDOWN_SECONDS = 60;

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg
        className="forgot-password-eye-icon"
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
      className="forgot-password-eye-icon"
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

function formatSeconds(seconds: number) {
  const clamped = Math.max(0, seconds);
  return `${clamped}`.padStart(2, '0');
}

export default function ForgotPasswordPage() {
  const { setRoute } = useRouter();
  const [step, setStep] = useState<Step>('request');

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [requestInfo, setRequestInfo] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);

  const [verificationCode, setVerificationCode] = useState('');
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verifyInfo, setVerifyInfo] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;

    const intervalId = window.setInterval(() => {
      setCooldownSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(intervalId);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [cooldownSeconds]);

  const passwordRules = useMemo(() => {
    const value = newPassword;
    return [
      { label: 'At least one uppercase letter required', valid: /[A-Z]/.test(value) },
      { label: 'At least one lowercase letter required', valid: /[a-z]/.test(value) },
      { label: 'At least one number required', valid: /\d/.test(value) },
      { label: 'At least one special character required', valid: /[^A-Za-z0-9]/.test(value) },
      { label: 'Password must be 8-16 characters long', valid: value.length >= 8 && value.length <= 16 },
      {
        label: 'Confirm password must match new password',
        valid: confirmPassword.length > 0 && confirmPassword === value,
      },
    ];
  }, [newPassword, confirmPassword]);

  const isPasswordValid = passwordRules.slice(0, 5).every((rule) => rule.valid);
  const doesPasswordMatch = confirmPassword.length > 0 && confirmPassword === newPassword;

  const canSubmitRequest = EMAIL_REGEX.test(email.trim()) && !isSubmitting;
  const canSubmitVerification = CODE_REGEX.test(verificationCode.trim()) && !isSubmitting;
  const canSubmitReset = isPasswordValid && doesPasswordMatch && !isSubmitting;

  async function handleForgotPasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const sanitizedEmail = email.trim();
    if (!EMAIL_REGEX.test(sanitizedEmail)) {
      setEmailError('Please enter a valid email address (e.g. username@domain.com).');
      return;
    }

    setIsSubmitting(true);
    setEmailError(null);
    setRequestError(null);
    setRequestInfo(null);

    try {
      const response = await forgotPassword({ email: sanitizedEmail });
      setRequestInfo(
        response.message || 'If this email is registered, a verification code has been sent.'
      );
      setStep('verify');
      setCooldownSeconds(CODE_RESEND_COOLDOWN_SECONDS);
      setVerificationCode('');
      setVerificationError(null);
      setVerifyInfo('');
    } catch (error) {
      const fallback = 'Unable to process your request right now. Please try again.';
      setRequestError(error instanceof Error ? error.message : fallback);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVerifyCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!CODE_REGEX.test(verificationCode.trim())) {
      setVerificationError('Please enter the 6-digit verification code.');
      return;
    }

    setIsSubmitting(true);
    setVerificationError(null);
    setVerifyInfo(null);

    try {
      const response = await verifyResetCode({
        email: email.trim(),
        verificationCode: verificationCode.trim(),
      });
      setVerifyInfo(response.message || 'Verification code validated successfully.');
      setStep('reset');
      setResetError(null);
    } catch (error) {
      const fallback = 'Invalid or expired verification code.';
      setVerificationError(error instanceof Error ? error.message : fallback);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendCode() {
    if (cooldownSeconds > 0 || isSubmitting) return;

    setIsSubmitting(true);
    setRequestError(null);
    setRequestInfo(null);
    setVerificationError(null);

    try {
      const response = await forgotPassword({ email: email.trim() });
      setRequestInfo(
        response.message || 'If this email is registered, a verification code has been sent.'
      );
      setCooldownSeconds(CODE_RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      const fallback = 'Unable to resend the verification code right now. Please try again.';
      setVerificationError(error instanceof Error ? error.message : fallback);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResetPasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmitReset) {
      setResetError('Please complete all password requirements before continuing.');
      return;
    }

    setIsSubmitting(true);
    setResetError(null);

    try {
      await resetPassword({
        email: email.trim(),
        newPassword,
      });

      sessionStorage.setItem('passwordResetSuccess', 'true');
      setRoute({ view: 'login', tourId: '' });
    } catch (error) {
      const fallback = 'Unable to reset password. Please try again.';
      setResetError(error instanceof Error ? error.message : fallback);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="forgot-password-page-shell">
      <main className="forgot-password-layout">
        <section className="signin-card forgot-password-form-card">
          {step === 'request' && (
            <form className="forgot-password-form" onSubmit={handleForgotPasswordSubmit} noValidate>
              <header className="forgot-password-form-header">
                <h1>Reset password</h1>
              </header>

              <div className="forgot-password-fields">
                <div className="forgot-password-field">
                  <label htmlFor="forgot-email">Email</label>
                  <input
                    id="forgot-email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    disabled={isSubmitting}
                  />
                  <p className={emailError ? 'forgot-password-helper-text forgot-password-helper-text-error' : 'forgot-password-helper-text'}>
                    {emailError || 'e.g. username@domain.com'}
                  </p>
                </div>
              </div>

              {requestInfo ? <p className="forgot-password-info-banner">{requestInfo}</p> : null}
              {requestError ? <p className="forgot-password-error-banner">{requestError}</p> : null}

              <div className="forgot-password-form-actions">
                <button className="signin-submit-button" type="submit" disabled={!canSubmitRequest}>
                  {isSubmitting ? 'Sending OTP...' : 'Send OTP'}
                </button>

                <p className="forgot-password-back-copy">
                  Don&apos;t have an account?{' '}
                  <button
                    type="button"
                    className="forgot-password-text-link"
                    onClick={() => setRoute({ view: 'signup', tourId: '' })}
                  >
                    Create an account
                  </button>
                </p>
              </div>
            </form>
          )}

          {step === 'verify' && (
            <form className="forgot-password-form" onSubmit={handleVerifyCodeSubmit} noValidate>
              <header className="forgot-password-form-header">
                <h1>Enter verification code</h1>
                <p className="forgot-password-step-copy">
                  The verification code has been sent to your email to {email.trim()}.
                </p>
              </header>

              <div className="forgot-password-fields">
                <div className="forgot-password-field">
                  <label htmlFor="verification-code">Verification code</label>
                  <input
                    id="verification-code"
                    name="verificationCode"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter verification code"
                    value={verificationCode}
                    onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    disabled={isSubmitting}
                  />

                  <p className="forgot-password-helper-text">
                    Not received yet?{' '}
                    {cooldownSeconds > 0 ? (
                      <span>Resend in {formatSeconds(cooldownSeconds)} seconds</span>
                    ) : (
                      <button
                        type="button"
                        className="forgot-password-text-link"
                        onClick={handleResendCode}
                        disabled={isSubmitting}
                      >
                        Resend code
                      </button>
                    )}
                  </p>
                </div>
              </div>

              {requestInfo ? <p className="forgot-password-info-banner">{requestInfo}</p> : null}
              {verifyInfo ? <p className="forgot-password-info-banner">{verifyInfo}</p> : null}
              {verificationError ? <p className="forgot-password-error-banner">{verificationError}</p> : null}

              <div className="forgot-password-form-actions">
                <button className="signin-submit-button" type="submit" disabled={!canSubmitVerification}>
                  {isSubmitting ? 'Verifying...' : 'Continue'}
                </button>
              </div>
            </form>
          )}

          {step === 'reset' && (
            <form className="forgot-password-form" onSubmit={handleResetPasswordSubmit} noValidate>
              <header className="forgot-password-form-header">
                <h1>Reset password</h1>
              </header>

              <div className="forgot-password-fields">
                <div className="forgot-password-field">
                  <label htmlFor="new-password">New password</label>
                  <div className="forgot-password-input-with-action">
                    <input
                      id="new-password"
                      name="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Enter your new password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      onPaste={(e) => e.preventDefault()}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      className="forgot-password-input-action"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowNewPassword((prev) => !prev)}
                    >
                      <EyeIcon open={showNewPassword} />
                    </button>
                  </div>

                  <ul className="forgot-password-requirements" aria-live="polite">
                    {passwordRules.slice(0, 5).map((rule) => (
                      <li
                        key={rule.label}
                        className={rule.valid ? 'forgot-password-requirement is-valid' : 'forgot-password-requirement'}
                      >
                        <span className="forgot-password-requirement-dot" />
                        <span>{rule.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="forgot-password-field">
                  <label htmlFor="confirm-password">Confirm password</label>
                  <div className="forgot-password-input-with-action">
                    <input
                      id="confirm-password"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      onPaste={(e) => e.preventDefault()}
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      className="forgot-password-input-action"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                    >
                      <EyeIcon open={showConfirmPassword} />
                    </button>
                  </div>

                  <ul className="forgot-password-requirements" aria-live="polite">
                    <li
                      className={doesPasswordMatch ? 'forgot-password-requirement is-valid' : 'forgot-password-requirement'}
                    >
                      <span className="forgot-password-requirement-dot" />
                      <span>Confirm password must match new password</span>
                    </li>
                  </ul>
                </div>
              </div>

              {resetError ? <p className="forgot-password-error-banner">{resetError}</p> : null}

              <div className="forgot-password-form-actions">
                <button className="signin-submit-button" type="submit" disabled={!canSubmitReset}>
                  {isSubmitting ? 'Resetting...' : 'Reset'}
                </button>
              </div>
            </form>
          )}
        </section>

        <SignInHeroPanel />
      </main>
    </div>
  );
}
