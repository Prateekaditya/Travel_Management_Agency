import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Navbar } from './components'
import SignIn from './components/SignIn'
import { AuthProvider, useAuth } from './context/AuthContext'
import { BookingProvider } from './context/BookingContext'
import { RouterProvider, useRouter } from './context/RouterContext'
import { initials } from './utils/formatters'
import TourDetailPage from './pages/TourDetailPage'
import { RegistrationPage } from './pages/RegistrationPage'
import ToursPage from './features/tours/index'
import MyToursPage from './pages/MyToursPage'
import TravelAgentPage from './pages/TravelAgentPage'
import TravelAgentBookingsPage from './pages/TravelAgentBookingsPage'
import AdminPage from './pages/AdminPage'
import ProfilePage from './pages/ProfilePage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import AdminFeedbackPage from './pages/AdminFeedbackPage'
import { Booking } from './types/booking'
import { getBookings, approveBookingChanges, declineBookingChanges } from './api/bookings'
import ConfirmChangesModal from './components/ConfirmChangesModal'
import { confirmEmailChange } from './api/users'
import { AUTH_STORAGE_KEY } from './constants'

function AppShell() {
  const { isLoggedIn, handleLogout, showAuthMenu, setShowAuthMenu, auth, updateUserEmail, handleLogin } = useAuth()
  const { route, setRoute } = useRouter()

  // Global pending-changes watcher for CUSTOMER role
  const [pendingBooking, setPendingBooking] = useState<Booking | null>(null);
  const pendingBookingIdRef = useRef<string | null>(null);
  const [toast, setToast] = useState<{ message: string; key: number } | null>(null);
  const emailConfirmCalledRef = useRef(false);
  const oauthCallbackCalledRef = useRef(false);

  const showToast = (message: string) => {
    setToast({ message, key: Date.now() });
    setTimeout(() => setToast(null), 4000);
  };

  const checkPendingChanges = useCallback(async () => {
    if (!auth?.userId || !auth?.idToken || auth?.role === 'TRAVEL_AGENT') return;
    try {
      const bookings = await getBookings(auth.userId);
      const pending = bookings.find(b => b.changeRequestStatus === 'PENDING');
      // Only show if it's a NEW pending booking (not one we're already showing)
      if (pending && pending.id !== pendingBookingIdRef.current) {
        pendingBookingIdRef.current = pending.id;
        setPendingBooking(pending);
      } else if (!pending) {
        pendingBookingIdRef.current = null;
        setPendingBooking(null);
      }
    } catch { /* silently ignore polling errors */ }
  }, [auth?.userId, auth?.idToken, auth?.role]);

  useEffect(() => {
    if (!isLoggedIn || auth?.role === 'TRAVEL_AGENT') {
      setPendingBooking(null);
      return;
    }
    checkPendingChanges();
    const interval = setInterval(checkPendingChanges, 5000);
    return () => clearInterval(interval);
  }, [isLoggedIn, auth?.role, checkPendingChanges]);

  // OAuth2 social login callback handler — detects ?token= from backend redirect
  useEffect(() => {
    if (oauthCallbackCalledRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) return;
    oauthCallbackCalledRef.current = true;
    const role = params.get('role') ?? '';
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
      idToken: token,
      refreshToken: params.get('refreshToken') ?? '',
      userId: params.get('userId') ?? '',
      role,
      email: params.get('email') ?? '',
      userName: decodeURIComponent(params.get('userName') ?? ''),
    }));
    handleLogin();
    window.history.replaceState({}, '', window.location.pathname);
    if (role === 'TRAVEL_AGENT') setRoute({ view: 'agent', tourId: '' });
    else if (role === 'ADMIN') setRoute({ view: 'admin', tourId: '' });
    else setRoute({ view: 'all', tourId: '' });
  }, [handleLogin, setRoute]);

  // Email confirmation handler - detects confirmToken + userId + newEmail in URL
  useEffect(() => {
    if (emailConfirmCalledRef.current) return;
    
    // Handle potentially malformed URLs with double '?' (e.g. ?view=login?confirmToken=...)
    const rawSearch = window.location.search || '';
    const fixedSearch = rawSearch.includes('?') 
      ? '?' + rawSearch.slice(1).replace(/\?/g, '&')
      : rawSearch;
    const urlParams = new URLSearchParams(fixedSearch);
    const confirmToken = urlParams.get('confirmToken');
    const userId = urlParams.get('userId');
    const newEmail = urlParams.get('newEmail');

    if (confirmToken && userId) {
      emailConfirmCalledRef.current = true;
      
      confirmEmailChange(userId, { confirmationToken: confirmToken })
        .then(() => {
          // Clear URL parameters
          window.history.replaceState({}, '', window.location.pathname);
          // Update email in auth state if provided
          if (newEmail) updateUserEmail(newEmail);
          // Redirect to profile page
          setRoute({ view: 'profile', tourId: '' });
          // Show success toast
          showToast('Email confirmed successfully! Your email has been updated.');
        })
        .catch((err) => {
          // Clear URL parameters even on error
          window.history.replaceState({}, '', window.location.pathname);
          showToast('Email confirmation failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
        });
    }
  }, [setRoute, updateUserEmail]);

  const handleApprove = async () => {
    if (!pendingBooking) return;
    // Keep the ref set so the polling guard prevents re-showing while the
    // backend processes the approval (clears automatically once backend returns
    // a non-PENDING status in checkPendingChanges).
    setPendingBooking(null);
    try {
      await approveBookingChanges(pendingBooking.id);
      showToast('Booking changes confirmed successfully.');
    } catch { /* ignore */ }
  };

  const handleDecline = async () => {
    if (!pendingBooking) return;
    // Same as above — keep the ref so polling won't re-surface the same modal.
    setPendingBooking(null);
    try {
      await declineBookingChanges(pendingBooking.id);
      showToast('Booking changes declined successfully.');
    } catch { /* ignore */ }
  };

  const buildPendingChanges = (booking: Booking) => {
    if (!booking.pendingChanges) return null;
    const changes: { label: string; from: string; to: string }[] = [];
    
    // Extract current date and duration from tourDetails (format: "Jul 1, 2026 (7 days)")
    const dateMatch = booking.tourDetails.date.match(/^(.+?)\s*\((.+?)\)$/);
    const currentDateDisplay = dateMatch ? dateMatch[1].trim() : booking.tourDetails.date;
    const currentDuration = dateMatch ? dateMatch[2].trim() : '';
    
    // Normalize dates to ISO format for accurate comparison
    const normalizeToISO = (d: string) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d; // already ISO
      const parsed = new Date(d);
      if (isNaN(parsed.getTime())) return d;
      // Use local date parts to avoid UTC timezone shift
      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const day = String(parsed.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    
    const currentDateISO = normalizeToISO(currentDateDisplay);
    const pendingDateISO = booking.pendingChanges.date ? normalizeToISO(booking.pendingChanges.date) : currentDateISO;
    
    // Compare dates only if they're actually different (compare ISO dates)
    // Don't add if the pending date is empty or same as current
    if (booking.pendingChanges.date && currentDateISO !== pendingDateISO) {
      changes.push({ label: 'Tour date', from: currentDateDisplay, to: booking.pendingChanges.date });
    }
    
    // Compare durations only if they differ
    if (booking.pendingChanges.duration && currentDuration !== booking.pendingChanges.duration) {
      changes.push({ label: 'Duration', from: currentDuration, to: booking.pendingChanges.duration });
    }
    
    // Compare meal plans
    if (booking.tourDetails.mealPlan !== booking.pendingChanges.mealPlan) {
      changes.push({ label: 'Meal plan', from: booking.tourDetails.mealPlan, to: booking.pendingChanges.mealPlan });
    }
    
    // Extract current customer name from tourDetails.guests (format: "John Doe (2 adults, 1 child)")
    const currentNameMatch = booking.tourDetails.guests.match(/^(.+?)\s*\(/);
    const currentCustomerName = currentNameMatch ? currentNameMatch[1].trim() : booking.tourDetails.guests.split('(')[0].trim();
    
    // Check if guest name has changed
    // Try pendingChanges.personalDetails first, fall back to top-level booking.personalDetails
    const pendingPersonal = booking.pendingChanges.personalDetails ?? booking.personalDetails;
    if (pendingPersonal && pendingPersonal.length > 0) {
      const newCustomerName = `${pendingPersonal[0].firstName} ${pendingPersonal[0].lastName}`;
      if (currentCustomerName !== newCustomerName) {
        changes.push({ label: 'Customer name', from: currentCustomerName, to: newCustomerName });
      }
    }
    
    // Extract current guest count from tourDetails.guests (format: "John Doe (2 adults, 1 child)")
    const currentGuestMatch = booking.tourDetails.guests.match(/\((.+?)\)$/);
    const currentGuestsStr = currentGuestMatch ? currentGuestMatch[1] : '';
    
    // Format new guest count
    const newAdults = booking.pendingChanges.guests.adult;
    const newChildren = booking.pendingChanges.guests.children;
    const newGuestsStr = newChildren > 0 
      ? `${newAdults} adult${newAdults !== 1 ? 's' : ''}, ${newChildren} child${newChildren !== 1 ? 'ren' : ''}`
      : `${newAdults} adult${newAdults !== 1 ? 's' : ''}`;
    
    // Only add guest count change if the count actually changed
    if (currentGuestsStr && currentGuestsStr !== newGuestsStr) {
      changes.push({ label: 'Number of guests', from: currentGuestsStr, to: newGuestsStr });
    }

    return {
      bookingId: booking.id,
      tourName: booking.name,
      tourDate: booking.pendingChanges.date,
      changes,
      apply: handleApprove
    };
  };

  // Redirect away from protected routes when logged out
  React.useEffect(() => {
    if (!isLoggedIn && (route.view === 'my' || route.view === 'agent' || route.view === 'admin' || route.view === 'feedback')) {
      setRoute({ view: 'all', tourId: '' })
    }
  }, [isLoggedIn, route.view, setRoute])

  function handleLogoutAndRedirect() {
    handleLogout()
    setRoute({ view: 'all', tourId: '' })
  }

  let content: React.ReactNode

  if (route.view === 'all') {
    content = <ToursPage userRole={auth?.role} userId={auth?.userId} />
  } else if (route.view === 'details') {
    content = <TourDetailPage />
  } else if (route.view === 'login') {
    content = <SignIn />
  } else if (route.view === 'signup') {
    content = <RegistrationPage />
  } else if (route.view === 'forgot-password') {
    content = <ForgotPasswordPage />
  } else if (route.view === 'my') {
    if (isLoggedIn) {
      content = auth?.role === 'TRAVEL_AGENT' ? <TravelAgentBookingsPage /> : <MyToursPage />
    } else {
      content = <ToursPage userRole={auth?.role} userId={auth?.userId} />
    }
  } else if (route.view === 'agent') {
    content = isLoggedIn ? <TravelAgentBookingsPage /> : <ToursPage />
  } else if (route.view === 'admin') {
    content = isLoggedIn ? <AdminPage /> : <ToursPage />
  } else if (route.view === 'profile') {
    content = isLoggedIn ? <ProfilePage /> : <ToursPage userRole={auth?.role} userId={auth?.userId} />
  } else if (route.view === 'feedback') {
    content = isLoggedIn ? <AdminFeedbackPage /> : <ToursPage />
  }

  const showNavbar = route.view !== 'login' && route.view !== 'signup' && route.view !== 'forgot-password' && route.view !== 'admin' && route.view !== 'feedback'

  return (
    <div className="travel-page">
      {showNavbar && (
        <Navbar
          currentView={route.view}
          isLoggedIn={isLoggedIn}
          userName={auth?.userName}
          userEmail={auth?.email}
          userRole={auth?.role}
          onNavigate={setRoute}
          onToggleAuth={() => setShowAuthMenu(!showAuthMenu)}
          showAuthMenu={showAuthMenu}
          onLogout={handleLogoutAndRedirect}
          initials={initials(auth?.userName || auth?.email)}
        />
      )}

      {content}

      {/* Global pending-changes overlay — appears on ANY page for customers */}
      {pendingBooking && buildPendingChanges(pendingBooking) && (
        <ConfirmChangesModal
          pending={buildPendingChanges(pendingBooking)!}
          onConfirm={handleApprove}
          onDecline={handleDecline}
        />
      )}

      {/* Global success toast for customer change responses */}
      {toast && (
        <div
          key={toast.key}
          className="fixed z-[10000] flex items-start gap-3"
          style={{ top: 88, right: 24, width: 380, borderRadius: 6, padding: 14, backgroundColor: '#EDFFEE', border: '1px solid #118819', boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}
        >
          <svg className="flex-shrink-0 mt-0.5" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="10" fill="#118819"/>
            <path d="M5.5 10.5l3 3 6-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="flex-1">
            <p className="text-sm font-bold text-[#118819]" style={{ fontFamily: 'Nunito, sans-serif' }}>Success</p>
            <p className="text-sm text-[#0B3857]" style={{ fontFamily: 'Nunito, sans-serif' }}>{toast.message}</p>
          </div>
          <button onClick={() => setToast(null)} className="text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}


export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <BookingProvider>
          <AppShell />
        </BookingProvider>
      </AuthProvider>
    </RouterProvider>
  )
}
