import React, { useState, useEffect, useRef } from 'react';
import BookingCard from '../components/BookingCard';
import { Booking, BookingState } from '../types/booking';
import { getBookings, cancelBooking, approveBookingChanges, declineBookingChanges } from '../api/bookings';
import { setAuthToken } from '../api/client';
import { useAuth } from '../context/AuthContext';
import CancelBookingModal from '../components/CancelBookingModal';
import EditBookingModal from '../components/EditBookingModal';
import FeedbackModal from '../components/FeedbackModal';
import UploadDocumentsModal from '../components/UploadDocumentsModal';
import { submitTourFeedback, updateTourFeedback } from '../api';

function buildChangeSummary(originalBooking: Booking, updatedBooking: Booking): string[] {
  const changes: string[] = [];

  if (originalBooking.tourDetails.guests !== updatedBooking.tourDetails.guests) {
    changes.push(`Number of touris Implementation Complete!
I've successfully implemented the complete booking edit workflow with backend persistence. Here's what was delivered:
 
🎯 What Was Built
1. Pending Change Request System
When a travel agent edits a booking, changes are stored as PENDING
Customer must approve before changes are applied
All state is backend-driven (no frontend localStorage needed)
2. New API Endpoints ✨
PATCH /api/v1/bookings/{id}/agent-edit - Agent proposes changes
POST /api/v1/bookings/{id}/approve-changes - Customer approves
POST /api/v1/bookings/{id}/decline-changes - Customer declines
3. Enhanced Response DTOs All booking responses now include:
{
  "changeRequestStatus": "PENDING",
  "pendingChanges": {
    "date": "Jul 15, 2026",
    "duration": "10 days",
    "mealPlan": "Full-board (FB)",
    "guests": { "adult": 2, "children": 1 }
  },
  "changeRequestedBy": "agent-id",
  "changeRequestedAt": "2026-05-14T10:30:00Z"
}
 
📚 Documentation Created
CHANGE_REQUEST_WORKFLOW.md - Complete guide with:
API endpoint details
Frontend implementation examples (React)
Testing scenarios
Error handling
IMPLEMENTATION_SUMMARY.md - Executive summary with:
Architecture overview
Workflow diagram
Quick start guide
BOOKING_ENDPOINTS.md - API reference for all booking endpoints
 
✅ Testing
Tests run: 15, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
All tests passing! ✨
 
🚀 How It Works
1. Agent edits booking
   ↓
2. Backend saves as PENDING (original data preserved)
   ↓
3. Customer sees dialog in BOTH browsers (backend-driven!)
   ↓
4. Customer clicks "Confirm" or "Decline"
   ↓
5. Changes applied or reverted
 
🎨 Frontend Integration Example
// Customer sees this dialog automatically
const booking = await getBookings();

if (booking.changeRequestStatus === 'PENDING') {
  showDialog({
    current: booking.tourDetails,
    proposed: booking.pendingChanges,
    onApprove: () => approveChanges(booking.id),
    onDecline: () => declineChanges(booking.id)
  });
}
 
🔑 Key Features
✅ Backend-driven state - Dialog appears in all sessions (agent browser, customer browser, incognito)
✅ Data integrity - Original booking preserved until approval
✅ Audit trail - Tracks who requested changes and when
✅ Security - JWT authentication on all endpoints
✅ Zero breaking changes - All existing APIs still work
 
📖 Tell Your Frontend Team
"Read CHANGE_REQUEST_WORKFLOW.md - it has everything you need including React code examples!"
The backend is 100% ready for frontend integration. Just implement the dialog UI and start calling the new endpoints! 🎉 Implementation Complete!
I've successfully implemented the complete booking edit workflow with backend persistence. Here's what was delivered:
 
🎯 What Was Built
1. Pending Change Request System
When a travel agent edits a booking, changes are stored as PENDING
Customer must approve before changes are applied
All state is backend-driven (no frontend localStorage needed)
2. New API Endpoints ✨
PATCH /api/v1/bookings/{id}/agent-edit - Agent proposes changes
POST /api/v1/bookings/{id}/approve-changes - Customer approves
POST /api/v1/bookings/{id}/decline-changes - Customer declines
3. Enhanced Response DTOs All booking responses now include:
{
  "changeRequestStatus": "PENDING",
  "pendingChanges": {
    "date": "Jul 15, 2026",
    "duration": "10 days",
    "mealPlan": "Full-board (FB)",
    "guests": { "adult": 2, "children": 1 }
  },
  "changeRequestedBy": "agent-id",
  "changeRequestedAt": "2026-05-14T10:30:00Z"
}
 
📚 Documentation Created
CHANGE_REQUEST_WORKFLOW.md - Complete guide with:
API endpoint details
Frontend implementation examples (React)
Testing scenarios
Error handling
IMPLEMENTATION_SUMMARY.md - Executive summary with:
Architecture overview
Workflow diagram
Quick start guide
BOOKING_ENDPOINTS.md - API reference for all booking endpoints
 
✅ Testing
Tests run: 15, Failures: 0, Errors: 0, Skipped: 0
BUILD SUCCESS
All tests passing! ✨
 
🚀 How It Works
1. Agent edits booking
   ↓
2. Backend saves as PENDING (original data preserved)
   ↓
3. Customer sees dialog in BOTH browsers (backend-driven!)
   ↓
4. Customer clicks "Confirm" or "Decline"
   ↓
5. Changes applied or reverted
 
🎨 Frontend Integration Example
// Customer sees this dialog automatically
const booking = await getBookings();

if (booking.changeRequestStatus === 'PENDING') {
  showDialog({
    current: booking.tourDetails,
    proposed: booking.pendingChanges,
    onApprove: () => approveChanges(booking.id),
    onDecline: () => declineChanges(booking.id)
  });
}
 
🔑 Key Features
✅ Backend-driven state - Dialog appears in all sessions (agent browser, customer browser, incognito)
✅ Data integrity - Original booking preserved until approval
✅ Audit trail - Tracks who requested changes and when
✅ Security - JWT authentication on all endpoints
✅ Zero breaking changes - All existing APIs still work
 
📖 Tell Your Frontend Team
"Read CHANGE_REQUEST_WORKFLOW.md - it has everything you need including React code examples!"
The backend is 100% ready for frontend integration. Just implement the dialog UI and start calling the new endpoints! 🎉ts: ${originalBooking.tourDetails.guests} → ${updatedBooking.tourDetails.guests}.`);
  }

  if (originalBooking.tourDetails.mealPlan !== updatedBooking.tourDetails.mealPlan) {
    changes.push(`Meal plan: ${originalBooking.tourDetails.mealPlan} → ${updatedBooking.tourDetails.mealPlan}.`);
  }

  if (originalBooking.tourDetails.date !== updatedBooking.tourDetails.date) {
    changes.push(`Start date: ${originalBooking.tourDetails.date} → ${updatedBooking.tourDetails.date}.`);
  }

  return changes.length > 0 ? changes : ['Booking details were updated.'];
}

function buildPendingChangeSummary(booking: Booking): string[] {
  if (!booking.pendingChanges) {
    return ['Booking details were updated.'];
  }

  const changes: string[] = [];

  // Extract current date and duration from tourDetails (format: "May 30, 2026 (5 days)")
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
  if (booking.pendingChanges.date && currentDateISO !== pendingDateISO) {
    changes.push(`Start date: ${currentDateDisplay} → ${booking.pendingChanges.date} (${booking.pendingChanges.duration}).`);
  }
  
  // Compare durations only if they differ
  if (booking.pendingChanges.duration && currentDuration !== booking.pendingChanges.duration) {
    changes.push(`Duration: ${currentDuration} → ${booking.pendingChanges.duration}.`);
  }

  // Compare meal plans
  if (booking.tourDetails.mealPlan !== booking.pendingChanges.mealPlan) {
    changes.push(`Meal plan: ${booking.tourDetails.mealPlan} → ${booking.pendingChanges.mealPlan}.`);
  }

  // Extract current customer name from tourDetails.guests (format: "Prateek Aditya (1 adult)")
  const currentNameMatch = booking.tourDetails.guests.match(/^(.+?)\s*\(/);
  const currentCustomerName = currentNameMatch ? currentNameMatch[1].trim() : booking.tourDetails.guests.split('(')[0].trim();
  
  // Check if guest name has changed
  // Try pendingChanges.personalDetails first, fall back to top-level booking.personalDetails
  const pendingPersonal = booking.pendingChanges.personalDetails ?? booking.personalDetails;
  if (pendingPersonal && pendingPersonal.length > 0) {
    const newCustomerName = `${pendingPersonal[0].firstName} ${pendingPersonal[0].lastName}`;
    if (currentCustomerName !== newCustomerName) {
      changes.push(`Customer name: ${currentCustomerName} → ${newCustomerName}.`);
    }
  }

  // Extract current guest count from tourDetails.guests
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
    changes.push(`Number of guests: ${currentGuestsStr} → ${newGuestsStr}.`);
  }

  return changes.length > 0 ? changes : ['Booking details were updated.'];
}

// ── Mock data matching OpenAPI BookedTourListResponseDTO ──────────────────────
const MOCK_BOOKINGS: Booking[] = [
  {
    id: '1',
    state: 'BOOKED',
    tourImageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=128&h=128&fit=crop',
    name: 'Tropical Caribe',
    destination: 'Punta Cana, Dominic Republic',
    tourDetails: {
      date: 'Jan 15, 2025 (7 days)',
      mealPlan: 'Breakfast (BB)',
      guests: 'Johnson Doe (1 adult)',
      totalPrice: '$1400',
      documents: '0 items',
    },
    travelAgent: {
      name: 'Tyrone Boyer',
      email: 'tyroneboyer@gmail.com',
      phone: '480-221-1885',
      messenger: '#',
    },
    canceledBy: null,
    cancelReason: null,
    freeCancelation: '2026-06-01',
  },
  {
    id: '2',
    state: 'CONFIRMED',
    changeRequestStatus: 'PENDING',
    tourImageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=128&h=128&fit=crop',
    name: 'Jungle Villa',
    destination: 'Bali, Indonesia',
    tourDetails: {
      date: 'Feb 20, 2025 (10 days)',
      mealPlan: 'Half-board (HB)',
      guests: 'Johnson Doe (2 adults)',
      totalPrice: '$2800',
      documents: '2 items',
    },
    travelAgent: {
      name: 'Tyrone Boyer',
      email: 'tyroneboyer@gmail.com',
      phone: '480-221-1885',
      messenger: '#',
    },
    canceledBy: null,
    cancelReason: null,
    freeCancelation: '2025-02-01',
  },
  {
    id: '3',
    state: 'STARTED',
    tourImageUrl: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=128&h=128&fit=crop',
    name: 'Tropical Caribe',
    destination: 'Punta Cana, Dominic Republic',
    tourDetails: {
      date: 'Jan 15, 2025 (7 days)',
      mealPlan: 'Breakfast (BB)',
      guests: 'Johnson Doe (1 adult)',
      totalPrice: '$1400',
      documents: '2 items',
    },
    travelAgent: {
      name: 'Tyrone Boyer',
      email: 'tyroneboyer@gmail.com',
      phone: '480-221-1885',
      messenger: '#',
    },
    canceledBy: null,
    cancelReason: null,
  },
  {
    id: '4',
    state: 'FINISHED',
    tourImageUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=128&h=128&fit=crop',
    name: 'Tropical Caribe',
    destination: 'Punta Cana, Dominic Republic',
    tourDetails: {
      date: 'Feb 25, 2023 (12 days)',
      mealPlan: 'Breakfast (BB)',
      guests: 'Johnson Doe (1 adult)',
      totalPrice: '$1400',
      documents: '2 items',
    },
    travelAgent: {
      name: 'Tyrone Boyer',
      email: 'tyroneboyer@gmail.com',
      phone: '480-221-1885',
      messenger: '#',
    },
    canceledBy: null,
    cancelReason: null,
  },
  {
    id: '5',
    state: 'CANCELED',
    tourImageUrl: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=128&h=128&fit=crop',
    name: 'Riverside Resort',
    destination: 'Ao Nang, Thailand',
    tourDetails: {
      date: 'Jan 4, 2026 (7 days)',
      mealPlan: 'Breakfast (BB)',
      guests: 'Johnson Doe (1 adult)',
      totalPrice: '$1400',
      documents: '2 items',
    },
    travelAgent: {
      name: 'Tyrone Boyer',
      email: 'tyroneboyer@gmail.com',
      phone: '480-221-1885',
      messenger: '#',
    },
    canceledBy: 'Travel agent',
    cancelReason: 'Hotel emergency',
  },
  {
    id: '6',
    state: 'CANCELED',
    tourImageUrl: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=128&h=128&fit=crop',
    name: 'Riverside Resort',
    destination: 'Ao Nang, Thailand',
    tourDetails: {
      date: 'Jan 4, 2026 (7 days)',
      mealPlan: 'Breakfast (BB)',
      guests: 'Johnson Doe (1 adult)',
      totalPrice: '$1400',
      documents: '2 items',
    },
    travelAgent: {
      name: 'Tyrone Boyer',
      email: 'tyroneboyer@gmail.com',
      phone: '480-221-1885',
      messenger: '#',
    },
    canceledBy: 'Tourist',
    cancelReason: null,
  },
];

interface BookingChangesModalProps {
  bookingName: string;
  bookingDate: string;
  changes: string[];
  onDecline: () => void;
  onConfirm: () => void;
}

const BookingChangesModal: React.FC<BookingChangesModalProps> = ({ bookingName, bookingDate, changes, onDecline, onConfirm }) => {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-40" onClick={onDecline}>
      <div
        className="bg-white rounded-xl shadow-lg w-full max-w-[420px] mx-4 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="text-lg font-bold text-[#0B3857]" style={{ fontFamily: 'Nunito, sans-serif' }}>
            Confirm tour booking changes
          </h2>
          <button onClick={onDecline} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-[#0B3857] leading-6 mb-4" style={{ fontFamily: 'Nunito, sans-serif' }}>
          Your booking for <span className="font-semibold">{bookingName}</span> on <span className="font-semibold">{bookingDate}</span> has been updated by the travel agent.
        </p>

        <div className="mb-4">
          <h3 className="text-sm font-bold text-[#0B3857] mb-2" style={{ fontFamily: 'Nunito, sans-serif' }}>Changes:</h3>
          <ul className="list-disc pl-5 space-y-2 text-sm text-[#0B3857]" style={{ fontFamily: 'Nunito, sans-serif' }}>
            {changes.map((change, index) => (
              <li key={index}>{change}</li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-[#0B3857] leading-6 mb-5" style={{ fontFamily: 'Nunito, sans-serif' }}>
          All other details of this booking remain the same.
          <br />
          Please review the changes and confirm your updated booking, or contact us if you need further assistance.
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onDecline}
            className="px-4 py-2 rounded-lg border border-[#027EAC] text-[#027EAC] bg-white font-semibold text-sm hover:bg-[#E7F9FF] transition-colors"
            style={{ fontFamily: 'Nunito, sans-serif' }}
          >
            Decline changes
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-[#027EAC] text-white font-semibold text-sm hover:bg-[#026a8f] transition-colors"
            style={{ fontFamily: 'Nunito, sans-serif' }}
          >
            Confirm changes
          </button>
        </div>
      </div>
    </div>
  );
};

type FilterTab = 'All tours' | BookingState;

const FILTER_TABS: FilterTab[] = ['All tours', 'BOOKED', 'CONFIRMED', 'STARTED', 'FINISHED', 'CANCELED'];

const TAB_LABELS: Record<FilterTab, string> = {
  'All tours': 'All tours',
  BOOKED: 'Booked',
  CONFIRMED: 'Confirmed',
  STARTED: 'Started',
  FINISHED: 'Finished',
  CANCELED: 'Canceled',
};

interface MyToursPageProps {
  userId?: string;
  token?: string;
  useMockData?: boolean;
}

const MyToursPage: React.FC<MyToursPageProps> = ({ userId: userIdProp, token: tokenProp, useMockData = false }) => {
  // Prefer props, fall back to AuthContext
  const { auth } = useAuth();
  const userId = userIdProp ?? auth?.userId;
  const token  = tokenProp  ?? auth?.idToken;

  const ITEMS_PER_PAGE = 6;

  const [activeTab, setActiveTab] = useState<FilterTab>('All tours');
  const [bookings, setBookings] = useState<Booking[]>(useMockData ? MOCK_BOOKINGS : []);
  const [loading, setLoading] = useState(!useMockData);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [editTarget, setEditTarget] = useState<Booking | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [feedbackTarget, setFeedbackTarget] = useState<Booking | null>(null);
  const [uploadTarget, setUploadTarget] = useState<Booking | null>(null);
  const [pendingChanges, setPendingChanges] = useState<{ booking: Booking; changes: string[] } | null>(null);

  const refreshBookings = async (signal?: AbortSignal) => {
    // pendingChanges dialog is now handled globally in App.tsx — no local check needed

    if (useMockData) {
      setBookings(MOCK_BOOKINGS);
      setLoading(false);
      setFetchError(null);
      return;
    }

    if (!userId) return;

    try {
      const list = await getBookings(userId, signal);
      if (signal?.aborted) return;
      setBookings(list);
      setFetchError(null);
    } catch (err) {
      if (!signal?.aborted) {
        setFetchError(err instanceof Error ? err.message : 'Failed to load bookings');
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    // Ensure the global HTTP client has the current session token before fetching
    if (token) setAuthToken(token);
    setLoading(true);

    const controller = new AbortController();

    refreshBookings(controller.signal);

    const intervalId = window.setInterval(() => {
      refreshBookings();
    }, 15000);

    const handleFocus = () => {
      refreshBookings();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [userId, token, useMockData]);

  const filtered =
    activeTab === 'All tours'
      ? bookings
      : bookings.filter(b => b.state === activeTab);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#E7F9FF' }}>
      <div className="w-full max-w-6xl mx-auto px-6 flex flex-col flex-1">
        {/* ── Filter tabs ── */}
        <div className="pt-4">
          <div className="relative inline-block">
            <div className="flex items-stretch gap-6 pb-2">
              {FILTER_TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setCurrentPage(0); }}
                  className={`relative flex items-center text-sm transition-colors whitespace-nowrap ${
                    activeTab === tab
                      ? 'text-[#0B3857] font-bold'
                      : 'text-[#677883] font-medium hover:text-[#0B3857]'
                  }`}
                >
                  {TAB_LABELS[tab]}
                  {activeTab === tab && (
                    <span className="absolute -bottom-2 left-0 right-0 h-[2px] bg-[#027EAC] rounded-sm z-10" />
                  )}
                </button>
              ))}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#A2AEB9]" />
          </div>
        </div>

        {/* ── Booking grid ── */}
        <main className="py-6 flex flex-col flex-1">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3">
                <div className="flex gap-2">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} className="h-5 w-16 rounded-full" style={{ background: 'linear-gradient(90deg,#D3E1ED 25%,#E7F4FC 50%,#D3E1ED 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-lg flex-shrink-0" style={{ background: 'linear-gradient(90deg,#D3E1ED 25%,#E7F4FC 50%,#D3E1ED 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                  <div className="flex flex-col gap-2 flex-1">
                    <div className="h-3.5 rounded w-3/4" style={{ background: 'linear-gradient(90deg,#D3E1ED 25%,#E7F4FC 50%,#D3E1ED 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                    <div className="h-3 rounded w-1/2" style={{ background: 'linear-gradient(90deg,#D3E1ED 25%,#E7F4FC 50%,#D3E1ED 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="h-3 rounded w-1/2 mb-1" style={{ background: 'linear-gradient(90deg,#D3E1ED 25%,#E7F4FC 50%,#D3E1ED 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                    {Array.from({ length: 5 }).map((_, k) => (
                      <div key={k} className="h-3 rounded w-full" style={{ background: 'linear-gradient(90deg,#D3E1ED 25%,#E7F4FC 50%,#D3E1ED 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                    ))}
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="h-3 rounded w-1/2 mb-1" style={{ background: 'linear-gradient(90deg,#D3E1ED 25%,#E7F4FC 50%,#D3E1ED 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                    {Array.from({ length: 4 }).map((_, k) => (
                      <div key={k} className="h-3 rounded w-full" style={{ background: 'linear-gradient(90deg,#D3E1ED 25%,#E7F4FC 50%,#D3E1ED 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <div className="h-8 w-24 rounded-lg" style={{ background: 'linear-gradient(90deg,#D3E1ED 25%,#E7F4FC 50%,#D3E1ED 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                  <div className="h-8 w-24 rounded-lg" style={{ background: 'linear-gradient(90deg,#D3E1ED 25%,#E7F4FC 50%,#D3E1ED 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                </div>
              </div>
            ))}
          </div>
        ) : fetchError ? (
          <p className="text-red-500 text-sm text-center py-16">{fetchError}</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-16">No bookings found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ animation: 'fadeInUp 0.35s ease both' }}>
            {paginated.map(booking => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onCancel={id => {
                  const b = bookings.find(x => x.id === id);
                  if (b) setCancelTarget(b);
                }}
                onEdit={id => {
                  const b = bookings.find(x => x.id === id);
                  if (b) setEditTarget(b);
                }}
                onUploadDocuments={id => {
                  const b = bookings.find(x => x.id === id);
                  if (b) setUploadTarget(b);
                }}
                onGiveFeedback={id => {
                  const b = bookings.find(x => x.id === id);
                  if (b) setFeedbackTarget(b);
                }}
                onUpdateFeedback={id => {
                  const b = bookings.find(x => x.id === id);
                  if (b) setFeedbackTarget(b);
                }}
              />
            ))}
          </div>
        )}
        {/* Pagination */}
        {totalPages > 1 && (() => {
          const pages: (number | '...')[] = [];
          if (totalPages <= 7) {
            for (let i = 0; i < totalPages; i++) pages.push(i);
          } else {
            pages.push(0);
            if (currentPage <= 3) {
              for (let i = 1; i <= 4; i++) pages.push(i);
              pages.push('...');
              pages.push(totalPages - 1);
            } else if (currentPage >= totalPages - 4) {
              pages.push('...');
              for (let i = totalPages - 5; i < totalPages; i++) pages.push(i);
            } else {
              pages.push('...');
              pages.push(currentPage - 1);
              pages.push(currentPage);
              pages.push(currentPage + 1);
              pages.push('...');
              pages.push(totalPages - 1);
            }
          }

          const btnBase: React.CSSProperties = {
            fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 14, lineHeight: '24px',
            minWidth: 36, height: 36, display: 'inline-flex', alignItems: 'center',
            justifyContent: 'center', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'transparent', color: '#0B3857', padding: '0 6px',
            transition: 'all 0.15s ease', transform: 'scale(1)',
          };
          const activeBtn: React.CSSProperties = { ...btnBase, background: '#027EAC', color: '#fff' };
          const disabledBtn: React.CSSProperties = { ...btnBase, opacity: 0.35, cursor: 'not-allowed' };

          return (
            <div className="flex justify-center items-center gap-1 mt-4">
              <button 
                onClick={() => setCurrentPage(p => p - 1)} 
                disabled={currentPage === 0} 
                style={currentPage === 0 ? disabledBtn : btnBase}
                onMouseDown={(e) => !e.currentTarget.disabled && (e.currentTarget.style.transform = 'scale(0.9)')}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >&lt;</button>
              {pages.map((p, idx) =>
                p === '...' ? (
                  <span key={`dots-${idx}`} style={{ ...btnBase, cursor: 'default' }}>…</span>
                ) : (
                  <button 
                    key={p} 
                    onClick={() => setCurrentPage(p as number)} 
                    style={currentPage === p ? activeBtn : btnBase}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >{(p as number) + 1}</button>
                )
              )}
              <button 
                onClick={() => setCurrentPage(p => p + 1)} 
                disabled={currentPage === totalPages - 1} 
                style={currentPage === totalPages - 1 ? disabledBtn : btnBase}
                onMouseDown={(e) => !e.currentTarget.disabled && (e.currentTarget.style.transform = 'scale(0.9)')}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >&gt;</button>
            </div>
          );
        })()}
      </main>
      </div>

      {/* ── Edit booking modal ── */}
      {editTarget && (
        <EditBookingModal
          booking={editTarget}
          onSave={(updated) => {
            setBookings(prev => prev.map(b => b.id === updated.id ? updated : b));
            setEditTarget(null);
            setShowSuccess(true);
            setSuccessMessage('All changes has been saved successfully.');
            setTimeout(() => setShowSuccess(false), 4000);
          }}
          onClose={() => setEditTarget(null)}
        />
      )}

      {/* ── Success toast ── */}
      {showSuccess && (
        <div
          className="fixed z-50 flex items-start gap-3"
          style={{ top: 88, right: 24, width: 406, borderRadius: 4, padding: 12, backgroundColor: '#EDFFEE', border: '1px solid #118819' }}
        >
          <svg className="flex-shrink-0 mt-0.5" width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="10" fill="#118819"/>
            <path d="M5.5 10.5l3 3 6-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div className="flex-1">
            <p className="text-sm font-bold text-[#118819]">Success</p>
            <p className="text-sm text-[#0B3857]">{successMessage}</p>
          </div>
          <button onClick={() => setShowSuccess(false)} className="text-gray-400 hover:text-gray-600">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Feedback modal ── */}
      {feedbackTarget && (
        <FeedbackModal
          initialRating={feedbackTarget.feedbackRating}
          initialComment={feedbackTarget.feedbackComment}
          isFlagged={feedbackTarget.feedbackFlagged}
          onSubmit={async (rating, comment) => {
            if (token && feedbackTarget.tourId) {
              try {
                const isUpdate = feedbackTarget.feedbackRating != null;
                const res = isUpdate
                  ? await updateTourFeedback(feedbackTarget.tourId, { rating, comment }, token)
                  : await submitTourFeedback(feedbackTarget.tourId, { rating, comment }, token);

                const flagged = res.moderationStatus === 'FLAGGED';
                setBookings(prev =>
                  prev.map(b =>
                    b.id === feedbackTarget.id
                      ? { ...b, feedbackRating: rating, feedbackComment: comment, feedbackFlagged: flagged }
                      : b
                  )
                );
                setFeedbackTarget(null);
                setShowSuccess(true);
                setSuccessMessage(
                  flagged
                    ? 'Your feedback was flagged and is pending admin review.'
                    : 'Your feedback has been published successfully.'
                );
                setTimeout(() => setShowSuccess(false), 4000);
              } catch (err) {
                setFetchError(err instanceof Error ? err.message : 'Failed to submit feedback');
                return;
              }
            }
          }}
          onClose={() => setFeedbackTarget(null)}
        />
      )}

      {/* ── Upload documents modal ── */}
      {uploadTarget && token && (
        <UploadDocumentsModal
          booking={uploadTarget}
          token={token}
          onClose={() => setUploadTarget(null)}
          onSuccess={() => {
            setUploadTarget(null);
            setShowSuccess(true);
            setSuccessMessage('Your document has been uploaded successfully.');
            setTimeout(() => setShowSuccess(false), 4000);
            // Reload bookings so booking.documents[] is fresh for next open
            if (token) {
              getBookings(userId, undefined)
                .then(list => setBookings(list))
                .catch(() => {/* ignore refresh error */});
            }
          }}
        />
      )}

      {/* ── Cancel booking modal ── */}
      {cancelTarget && (
        <CancelBookingModal
          tourName={cancelTarget.name}
          tourDate={cancelTarget.tourDetails.date}
          mealPlan={cancelTarget.tourDetails.mealPlan}
          guests={cancelTarget.tourDetails.guests}
          freeCancelation={cancelTarget.freeCancelation ?? ''}
          onConfirmCancel={async () => {
            try {
              if (!useMockData) {
                await cancelBooking(cancelTarget.id);
              }
              setBookings(prev =>
                prev.map(b =>
                  b.id === cancelTarget.id
                    ? { ...b, state: 'CANCELED', canceledBy: 'Tourist', cancelReason: null }
                    : b
                )
              );
              setCancelTarget(null);
              setShowSuccess(true);
              setSuccessMessage('Booking cancelled successfully.');
              setTimeout(() => setShowSuccess(false), 4000);
            } catch (err) {
              setCancelTarget(null);
              setFetchError(err instanceof Error ? err.message : 'Failed to cancel booking');
            }
          }}
          onKeep={() => setCancelTarget(null)}
        />
      )}

      {/* ── Booking Changes Modal — handled globally in App.tsx ── */}
    </div>
  );
};

export default MyToursPage;
