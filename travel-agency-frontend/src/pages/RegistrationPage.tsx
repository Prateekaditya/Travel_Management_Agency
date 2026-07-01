﻿import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from '../context/RouterContext'
import { initiateRegistration, verifyRegistrationEmail, completeRegistration } from '../api/auth'
import './RegistrationPage.css'

declare const grecaptcha: {
  getResponse(widgetId?: number): string;
  reset(widgetId?: number): void;
  render(container: string | HTMLElement, parameters: { sitekey: string; theme?: string }): number;
  ready(callback: () => void): void;
}

const RECAPTCHA_SITE_KEY = (import.meta.env.VITE_RECAPTCHA_SITE_KEY as string) || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'

const heroImage = '/user-signup-right-card-background-image.png'
const brandLogo = '/Logo.png'

type Step = 'info' | 'verify' | 'credentials'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const NAME_REGEX = /^[a-zA-Z\s'-]*$/
const CODE_REGEX = /^\d{6}$/
const CODE_RESEND_COOLDOWN_SECONDS = 60

const TECHNICAL_MESSAGES = ['Internal server error', 'Request failed:']

function toUserMessage(error: unknown, fallback: string): string {
  const msg = error instanceof Error ? error.message : ''
  if (!msg || TECHNICAL_MESSAGES.some((t) => msg.startsWith(t))) return fallback
  if (msg === 'Email already exists') return 'An account with this email already exists. Please sign in instead.'
  return msg
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg className="registration-eye-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    )
  }
  return (
    <svg className="registration-eye-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-4.4" />
      <path d="M9.4 5.2A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a17.2 17.2 0 0 1-4.1 4.8" />
      <path d="M6.2 6.2A17.7 17.7 0 0 0 2 12s3.5 7 10 7a10.8 10.8 0 0 0 2.1-.2" />
    </svg>
  )
}

function formatSeconds(seconds: number) {
  return `${Math.max(0, seconds)}`.padStart(2, '0')
}

export function RegistrationPage() {
  const { setRoute } = useRouter()
  const [step, setStep] = useState<Step>('info')

  // Step 1: info
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [firstNameError, setFirstNameError] = useState<string | null>(null)
  const [lastNameError, setLastNameError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [infoError, setInfoError] = useState<string | null>(null)

  // reCAPTCHA v2
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null)
  const recaptchaContainerRef = useRef<HTMLDivElement>(null)
  const recaptchaWidgetId = useRef<number | null>(null)

  // Step 2: OTP
  const [verificationCode, setVerificationCode] = useState('')
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const [cooldownSeconds, setCooldownSeconds] = useState(0)

  // Step 3: password
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [credentialsError, setCredentialsError] = useState<string | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Render reCAPTCHA widget when step is 'info' and script is ready
  useEffect(() => {
    if (step !== 'info') return
    const renderWidget = () => {
      if (!recaptchaContainerRef.current) return
      // Only render once per mount
      if (recaptchaWidgetId.current !== null) return
      recaptchaWidgetId.current = grecaptcha.render(recaptchaContainerRef.current, {
        sitekey: RECAPTCHA_SITE_KEY,
      })
    }
    if ((window as any).grecaptcha?.render) {
      ;(window as any).grecaptcha.ready(renderWidget)
    } else {
      // Script not loaded yet — poll until ready
      const interval = setInterval(() => {
        if ((window as any).grecaptcha?.render) {
          clearInterval(interval)
          ;(window as any).grecaptcha.ready(renderWidget)
        }
      }, 100)
      return () => clearInterval(interval)
    }
  }, [step])

  // OTP resend cooldown
  useEffect(() => {
    if (cooldownSeconds <= 0) return
    const id = window.setInterval(() => {
      setCooldownSeconds((s) => {
        if (s <= 1) { window.clearInterval(id); return 0 }
        return s - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [cooldownSeconds])

  // Password rules
  const passwordRules = useMemo(() => [
    { label: 'At least one uppercase letter required', valid: /[A-Z]/.test(password) },
    { label: 'At least one lowercase letter required', valid: /[a-z]/.test(password) },
    { label: 'At least one number required', valid: /\d/.test(password) },
    { label: 'At least one special character required', valid: /[^A-Za-z0-9]/.test(password) },
    { label: 'Password must be 8-16 characters long', valid: password.length >= 8 && password.length <= 16 },
  ], [password])

  const isPasswordValid = passwordRules.every((r) => r.valid)
  const doesPasswordMatch = confirmPassword.length > 0 && confirmPassword === password

  function validateInfo(): boolean {
    let valid = true
    if (!firstName.trim()) {
      setFirstNameError('First name is required.'); valid = false
    } else if (firstName.trim().length > 50) {
      setFirstNameError('First name must be up to 50 characters.'); valid = false
    } else if (!NAME_REGEX.test(firstName.trim())) {
      setFirstNameError('Only Latin letters, hyphens, and apostrophes are allowed.'); valid = false
    } else { setFirstNameError(null) }

    if (!lastName.trim()) {
      setLastNameError('Last name is required.'); valid = false
    } else if (lastName.trim().length > 50) {
      setLastNameError('Last name must be up to 50 characters.'); valid = false
    } else if (!NAME_REGEX.test(lastName.trim())) {
      setLastNameError('Only Latin letters, hyphens, and apostrophes are allowed.'); valid = false
    } else { setLastNameError(null) }

    if (!email.trim()) {
      setEmailError('Email is required.'); valid = false
    } else if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError('Invalid email address. Please ensure it follows the format: username@domain.com'); valid = false
    } else { setEmailError(null) }

    return valid
  }

  async function handleInfoSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validateInfo()) return

    const recaptchaToken = grecaptcha.getResponse(recaptchaWidgetId.current ?? undefined)
    if (!recaptchaToken) {
      setRecaptchaError('Please complete the reCAPTCHA check.')
      return
    }
    setRecaptchaError(null)

    setIsSubmitting(true)
    setInfoError(null)
    try {
      await initiateRegistration({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        recaptchaToken,
      })
      setIsSubmitting(false)
      setStep('verify')
      setCooldownSeconds(CODE_RESEND_COOLDOWN_SECONDS)
      setVerificationCode('')
      setVerificationError(null)
    } catch (error) {
      grecaptcha.reset(recaptchaWidgetId.current ?? undefined)
      setInfoError(toUserMessage(error, 'Unable to send verification code. Please try again later.'))
      setIsSubmitting(false)
    }
  }

  async function handleResendCode() {
    if (cooldownSeconds > 0 || isSubmitting) return
    setIsSubmitting(true)
    setVerificationError(null)
    try {
      const freshToken = grecaptcha.getResponse()
      await initiateRegistration({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        recaptchaToken: freshToken || '',
      })
      setCooldownSeconds(CODE_RESEND_COOLDOWN_SECONDS)
    } catch {
      setStep('info')
      setRecaptchaError('Please complete the reCAPTCHA check to resend the code.')
      grecaptcha.reset()
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleVerifySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!CODE_REGEX.test(verificationCode.trim())) {
      setVerificationError('Please enter the 6-digit verification code.')
      return
    }
    setIsSubmitting(true)
    setVerificationError(null)
    try {
      await verifyRegistrationEmail({ email: email.trim(), verificationCode: verificationCode.trim() })
      setIsSubmitting(false)
      setStep('credentials')
      setCredentialsError(null)
    } catch (error) {
      setVerificationError(toUserMessage(error, 'Invalid or expired verification code.'))
      setIsSubmitting(false)
    }
  }

  async function handleCredentialsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isPasswordValid || !doesPasswordMatch) {
      setCredentialsError('Please complete all password requirements before continuing.')
      return
    }
    setIsSubmitting(true)
    setCredentialsError(null)
    try {
      await completeRegistration({ email: email.trim(), password })
      sessionStorage.setItem('registrationSuccess', 'true')
      setRoute({ view: 'login', tourId: '' })
    } catch (error) {
      setCredentialsError(toUserMessage(error, 'Unable to create account. Please try again later.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="registration-page-shell">
      <main className="registration-layout">
        <section className="registration-card registration-form-card">

          {/* Step 1: Personal info + CAPTCHA */}
          {step === 'info' && (
            <form className="registration-form" onSubmit={handleInfoSubmit} noValidate>
              <header className="registration-form-header">
                <p className="registration-eyebrow">LET&apos;S GET YOU STARTED</p>
                <h1>Create an account</h1>
              </header>

              <div className="registration-fields">
                <div className="registration-name-row">
                  <div className="registration-field">
                    <label htmlFor="firstName">First name</label>
                    <input id="firstName" name="firstName" type="text" placeholder="Johnson" value={firstName}
                      onChange={(e) => { setFirstName(e.target.value); setFirstNameError(null) }} disabled={isSubmitting} />
                    <p className={firstNameError ? 'registration-helper-text registration-helper-text-error' : 'registration-helper-text'}>
                      {firstNameError || 'e.g. Johnson'}
                    </p>
                  </div>
                  <div className="registration-field">
                    <label htmlFor="lastName">Last name</label>
                    <input id="lastName" name="lastName" type="text" placeholder="Doe" value={lastName}
                      onChange={(e) => { setLastName(e.target.value); setLastNameError(null) }} disabled={isSubmitting} />
                    <p className={lastNameError ? 'registration-helper-text registration-helper-text-error' : 'registration-helper-text'}>
                      {lastNameError || 'e.g. Doe'}
                    </p>
                  </div>
                </div>

                <div className="registration-field">
                  <label htmlFor="email">Email</label>
                  <input id="email" name="email" type="email" placeholder="johnsondoe@nomail.com" value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError(null) }} disabled={isSubmitting} />
                  <p className={emailError ? 'registration-helper-text registration-helper-text-error' : 'registration-helper-text'}>
                    {emailError || 'e.g. username@domain.com'}
                  </p>
                </div>

                {/* reCAPTCHA v2 */}
                <div className="registration-field">
                  <div ref={recaptchaContainerRef}></div>
                  {recaptchaError && (
                    <p className="registration-helper-text registration-helper-text-error">{recaptchaError}</p>
                  )}
                </div>
              </div>

              {infoError && <p className="registration-helper-text registration-helper-text-error">{infoError}</p>}

              <div className="registration-form-actions">
                <button className="registration-submit-button" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending code…' : 'Continue'}
                </button>
                <p className="registration-login-copy">
                  Already have an account?{' '}
                  <button type="button" onClick={() => setRoute({ view: 'login', tourId: '' })}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#027eac', textDecoration: 'underline', textUnderlineOffset: '2px', font: 'inherit' }}>
                    Login
                  </button>{' '}
                  instead
                </p>
              </div>
            </form>
          )}

          {/* Step 2: Email OTP */}
          {step === 'verify' && (
            <form className="registration-form" onSubmit={handleVerifySubmit} noValidate>
              <header className="registration-form-header">
                <p className="registration-eyebrow">CHECK YOUR EMAIL</p>
                <h1>Enter verification code</h1>
                <p className="registration-step-copy">
                  A 6-digit code has been sent to <strong>{email.trim()}</strong>.
                </p>
              </header>

              <div className="registration-fields">
                <div className="registration-field">
                  <label htmlFor="verificationCode">Verification code</label>
                  <input id="verificationCode" name="verificationCode" type="text" inputMode="numeric" maxLength={6}
                    placeholder="Enter 6-digit code" value={verificationCode}
                    onChange={(e) => { setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setVerificationError(null) }}
                    disabled={isSubmitting} />
                  <p className="registration-helper-text">
                    Not received yet?{' '}
                    {cooldownSeconds > 0 ? (
                      <span>Resend in {formatSeconds(cooldownSeconds)} seconds</span>
                    ) : (
                      <button type="button" onClick={handleResendCode} disabled={isSubmitting}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#027eac', textDecoration: 'underline', font: 'inherit' }}>
                        Resend code
                      </button>
                    )}
                  </p>
                </div>
              </div>

              {verificationError && <p className="registration-helper-text registration-helper-text-error">{verificationError}</p>}

              <div className="registration-form-actions">
                <button className="registration-submit-button" type="submit"
                  disabled={!CODE_REGEX.test(verificationCode.trim()) || isSubmitting}>
                  {isSubmitting ? 'Verifying…' : 'Continue'}
                </button>
                <p className="registration-login-copy">
                  Wrong email?{' '}
                  <button type="button" onClick={() => setStep('info')}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#027eac', textDecoration: 'underline', textUnderlineOffset: '2px', font: 'inherit' }}>
                    Go back
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* Step 3: Set password */}
          {step === 'credentials' && (
            <form className="registration-form" onSubmit={handleCredentialsSubmit} noValidate>
              <header className="registration-form-header">
                <p className="registration-eyebrow">ALMOST THERE</p>
                <h1>Set your password</h1>
              </header>

              <div className="registration-fields">
                <div className="registration-field">
                  <label htmlFor="password">Password</label>
                  <div className="registration-input-with-action">
                    <input id="password" name="password" type={showPassword ? 'text' : 'password'}
                      placeholder="Enter password" value={password}
                      onChange={(e) => setPassword(e.target.value)} onPaste={(e) => e.preventDefault()} disabled={isSubmitting} />
                    <button type="button" className="registration-input-action"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((p) => !p)}>
                      <EyeIcon open={showPassword} />
                    </button>
                  </div>
                  <ul className="registration-requirements" aria-live="polite">
                    {passwordRules.map((rule) => (
                      <li key={rule.label} className={rule.valid ? 'registration-requirement is-valid' : 'registration-requirement'}>
                        <span className="registration-requirement-dot" />
                        <span>{rule.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="registration-field">
                  <label htmlFor="confirmPassword">Confirm password</label>
                  <div className="registration-input-with-action">
                    <input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="Confirm password" value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)} onPaste={(e) => e.preventDefault()} disabled={isSubmitting} />
                    <button type="button" className="registration-input-action"
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      onClick={() => setShowConfirmPassword((p) => !p)}>
                      <EyeIcon open={showConfirmPassword} />
                    </button>
                  </div>
                  {confirmPassword.length > 0 ? (
                    <ul className="registration-requirements" aria-live="polite">
                      <li className={doesPasswordMatch ? 'registration-requirement is-valid' : 'registration-requirement is-error'}>
                        <span className="registration-requirement-dot" />
                        <span>{doesPasswordMatch ? 'Passwords match' : "Passwords don't match"}</span>
                      </li>
                    </ul>
                  ) : (
                    <p className="registration-helper-text">Confirm password must match your password</p>
                  )}
                </div>
              </div>

              {credentialsError && <p className="registration-helper-text registration-helper-text-error">{credentialsError}</p>}

              <div className="registration-form-actions">
                <button className="registration-submit-button" type="submit"
                  disabled={!isPasswordValid || !doesPasswordMatch || isSubmitting}>
                  {isSubmitting ? 'Creating account…' : 'Create an account'}
                </button>
              </div>
            </form>
          )}

        </section>

        <aside className="registration-card registration-visual-card" aria-label="Travel agency promo">
          <img className="registration-visual-image" src={heroImage} alt="Tropical beach travel destination" />
          <div className="registration-visual-overlay">
            <div className="registration-brand">
              <img className="registration-brand-logo" src={brandLogo} alt="Travel Agency" />
            </div>
            <h2 className="registration-visual-title">Let&apos;s plan your next trip!</h2>
          </div>
        </aside>
      </main>
    </div>
  )
}