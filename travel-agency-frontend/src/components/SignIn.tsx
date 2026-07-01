import { useEffect, useState } from 'react';
import SignInFormPanel from './signin/SignInFormPanel';
import SignInHeroPanel from './signin/SignInHeroPanel';
import { useSignInForm } from '../features/auth/useSignInForm';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { env } from '../config/env';
import './signin/SignIn.css';

function SignIn() {
  const { handleLogin, auth } = useAuth();
  const { setRoute } = useRouter();
  const [showRegistrationToast, setShowRegistrationToast] = useState(false);
  const [showEmailChangeToast, setShowEmailChangeToast] = useState(false);
  const [showPasswordResetToast, setShowPasswordResetToast] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);

  // Handle ?error= param from OAuth2 failure redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    if (error) {
      setOauthError(decodeURIComponent(error));
      window.history.replaceState({}, '', '?view=login');
    }
  }, []);

  // Auto-hide OAuth error after 6 seconds
  useEffect(() => {
    if (!oauthError) return;
    const timer = setTimeout(() => setOauthError(null), 6000);
    return () => clearTimeout(timer);
  }, [oauthError]);

  const handleGoogleLogin = () => {
    window.location.href = `${env.apiBaseUrl}/oauth2/authorization/google`;
  };

  // Check if user just registered and show success toast
  useEffect(() => {
    const registrationSuccess = sessionStorage.getItem('registrationSuccess');
    const emailChangeSuccess = sessionStorage.getItem('emailChangeSuccess');
    const passwordResetSuccess = sessionStorage.getItem('passwordResetSuccess');
    
    if (registrationSuccess === 'true') {
      setShowRegistrationToast(true);
      sessionStorage.removeItem('registrationSuccess');
    }
    
    if (emailChangeSuccess === 'true') {
      setShowEmailChangeToast(true);
      sessionStorage.removeItem('emailChangeSuccess');
    }

    if (passwordResetSuccess === 'true') {
      setShowPasswordResetToast(true);
      sessionStorage.removeItem('passwordResetSuccess');
    }
  }, []);

  // Auto-hide toast after 3 seconds when it becomes visible
  useEffect(() => {
    if (showRegistrationToast || showPasswordResetToast) {
      const timer = setTimeout(() => {
        setShowRegistrationToast(false);
        setShowPasswordResetToast(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showRegistrationToast, showPasswordResetToast]);

  // Auto-hide email change toast
  useEffect(() => {
    if (showEmailChangeToast) {
      const timer = setTimeout(() => {
        setShowEmailChangeToast(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showEmailChangeToast]);

  const {
    email,
    password,
    showPassword,
    isLocked,
    isSubmitting,
    errors,
    setEmail,
    setPassword,
    setShowPassword,
    handleSubmit,
  } = useSignInForm(() => {
    handleLogin();
    
    // Get the updated auth from localStorage to check the role
    const storedAuth = localStorage.getItem('travelAuth');
    if (storedAuth) {
      const authData = JSON.parse(storedAuth);
      // Redirect based on role
      if (authData.role === 'TRAVEL_AGENT') {
        setRoute({ view: 'agent', tourId: '' });
      } else if (authData.role === 'ADMIN') {
        setRoute({ view: 'admin', tourId: '' });
      } else {
        setRoute({ view: 'all', tourId: '' });
      }
    } else {
      // Fallback to all view
      setRoute({ view: 'all', tourId: '' });
    }
  });

  return (
    <div className="signin-page-shell">
      {/* ── OAuth2 error toast ── */}
      {oauthError && (
        <div
          className="fixed z-[9999] flex items-start gap-3"
          style={{ top: 24, right: 24, width: 406, borderRadius: 4, padding: 12, backgroundColor: '#FFF0F0', border: '1px solid #c34d4d' }}
        >
          <svg className="flex-shrink-0 mt-0.5" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="10" fill="#c34d4d"/>
            <path d="M7 7l6 6M13 7l-6 6" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          <div className="flex-1">
            <p className="text-sm font-bold text-[#c34d4d]">Sign-in failed</p>
            <p className="text-sm text-[#0B3857]">{oauthError}</p>
          </div>
          <button onClick={() => setOauthError(null)} className="text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Success toast from registration ── */}
      {(showRegistrationToast || showPasswordResetToast) && (
        <div
          className="fixed z-[9999] flex items-start gap-3"
          style={{ top: 24, right: 24, width: 406, borderRadius: 4, padding: 12, backgroundColor: '#EDFFEE', border: '1px solid #118819' }}
        >
          <svg className="flex-shrink-0 mt-0.5" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="10" fill="#118819"/>
            <path d="M5.5 10.5l3 3 6-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="flex-1">
            <p className="text-sm font-bold text-[#118819]">{showPasswordResetToast ? 'Success' : 'Congratulations'}</p>
            <p className="text-sm text-[#0B3857]">
              {showPasswordResetToast
                ? 'Your password has been successfully changed.'
                : 'Your account has been created successfully. Please sign in with your details.'}
            </p>
          </div>
          <button
            onClick={() => {
              setShowRegistrationToast(false);
              setShowPasswordResetToast(false);
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Success toast from email change ── */}
      {showEmailChangeToast && (
        <div
          className="fixed z-[9999] flex items-start gap-3"
          style={{ top: 24, right: 24, width: 406, borderRadius: 4, padding: 12, backgroundColor: '#EDFFEE', border: '1px solid #118819' }}
        >
          <svg className="flex-shrink-0 mt-0.5" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="10" fill="#118819"/>
            <path d="M5.5 10.5l3 3 6-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="flex-1">
            <p className="text-sm font-bold text-[#118819]">Success</p>
            <p className="text-sm text-[#0B3857]">Your email has been changed successfully.</p>
          </div>
          <button onClick={() => setShowEmailChangeToast(false)} className="text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <main className="signin-layout">
        <SignInFormPanel
          email={email}
          password={password}
          showPassword={showPassword}
          isLocked={isLocked}
          isSubmitting={isSubmitting}
          errors={errors}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onToggleShowPassword={() => setShowPassword((prev) => !prev)}
          onSubmit={handleSubmit}
          onNavigateToForgotPassword={() => setRoute({ view: 'forgot-password', tourId: '' })}
          onNavigateToRegister={() => setRoute({ view: 'signup', tourId: '' })}
          onGoogleLogin={handleGoogleLogin}
        />
        <SignInHeroPanel />
      </main>
    </div>
  );
}

export default SignIn;
