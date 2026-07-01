// ── Frontend display type (used by BookingCard / MyToursPage) ─────────────────
// Matches BookingResponseDTO exactly — backend now returns this full shape.
export type BookingState = 'BOOKED' | 'CONFIRMED' | 'STARTED' | 'FINISHED' | 'CANCELED';

export interface TravelAgent {
  name: string | null;      // null until a travel agent is assigned
  email: string | null;
  phone: string | null;
  messenger: string | null;
}

export interface TourDetails {
  date: string;       // "Jul 1, 2026 (7 days)"
  mealPlan: string;   // "Breakfast (BB)"
  guests: string;     // "John Doe (2 adults)"
  totalPrice: string; // "$1400"
  documents: string;  // "1 items"
}

export interface Booking {
  id: string;
  tourId?: string;           // present in API response — used by EditBookingModal
  state: BookingState;
  changeRequestStatus?: 'PENDING' | 'APPROVED';
  pendingChanges?: {
    date: string;
    duration: string;
    mealPlan: string;
    guests: { adult: number; children: number };
    personalDetails?: Array<{ firstName: string; lastName: string }>;
  };
  changeRequestedBy?: string;
  changeRequestedAt?: string;
  tourImageUrl: string | null;
  name: string;
  destination: string;
  tourDetails: TourDetails;
  travelAgent: TravelAgent;
  canceledBy: string | null;
  cancelReason: string | null;
  freeCancelation?: string; // ISO date — not in GET /bookings response, kept for CancelModal
  feedbackRating?: number;
  feedbackComment?: string;
  feedbackFlagged?: boolean;
  personalDetails?: Array<{ firstName: string; lastName: string }>;
  documents?: BackendBookingDocument[]; // existing uploaded documents with labels
}

// ── Normalise state: "CANCELLED" → "CANCELED" ────────────────────────────────
export function normaliseState(state: string): BookingState {
  return (state === 'CANCELLED' ? 'CANCELED' : state) as BookingState;
}

// ── NEW backend format: wrapped response ──────────────────────────────────────
// After backend update: GET /bookings returns { "bookings": [BookingResponseDTO] }
export interface BookingsListResponse {
  bookings: Array<Omit<Booking, 'state'> & { state: string; freeCancelation?: string | null }>;
}

// ── OLD backend format: plain array of raw DTOs ───────────────────────────────
// Current backend returns a plain BackendBooking[] array.
export interface BackendBookingDocument {
  id: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
  documentLabel?: string; // e.g. "Passport Avinaba Das", "Payment confirmation"
  /** Pre-signed S3 URL returned by the backend — use this for direct viewing */
  fileUrl?: string;
  url?: string;
  documentUrl?: string;
}

export interface BackendBooking {
  id: string;
  tourId: string;
  userId: string;
  date: string;           // "2026-07-01"
  duration: string;       // "7 nights"
  mealPlan: string;       // "BB" | "HB" | "FB" | "AI"
  state: string;          // "BOOKED", "CANCELLED" (double L)
  freeCancelation: string | null; // ISO date e.g. "2026-06-21"
  guests: { adult: number; children: number };
  personalDetails: Array<{ firstName: string; lastName: string }>;
  documents: BackendBookingDocument[];
  feedbackRating?: number;
  feedbackComment?: string;
  feedbackFlagged?: boolean;
  changeRequestStatus?: 'PENDING' | 'APPROVED';
  pendingChanges?: {
    date: string;
    duration: string;
    mealPlan: string;
    guests: { adult: number; children: number };
    personalDetails?: Array<{ firstName: string; lastName: string }>;
  };
}

// ── Dummy travel agents pool ─────────────────────────────────────────────────
const DUMMY_TRAVEL_AGENTS: TravelAgent[] = [
  {
    name: 'Tyrone Boyer',
    email: 'tyroneboyer@gmail.com',
    phone: '480-221-1885',
    messenger: 'https://m.me/tyroneboyer',
  },
  {
    name: 'Sarah Mitchell',
    email: 'sarah.mitchell@travelagency.com',
    phone: '555-123-4567',
    messenger: 'https://m.me/sarahmitchell',
  },
  {
    name: 'Marcus Johnson',
    email: 'mjohnson@travelexpert.com',
    phone: '555-987-6543',
    messenger: 'https://m.me/marcusjohnson',
  },
  {
    name: 'Emily Chen',
    email: 'emily.chen@worldtours.com',
    phone: '555-456-7890',
    messenger: 'https://m.me/emilychen',
  },
  {
    name: 'David Rodriguez',
    email: 'd.rodriguez@voyageplus.com',
    phone: '555-789-0123',
    messenger: 'https://m.me/davidrodriguez',
  },
];

export function getRandomTravelAgent(): TravelAgent {
  return DUMMY_TRAVEL_AGENTS[Math.floor(Math.random() * DUMMY_TRAVEL_AGENTS.length)];
}

export function mapBackendBooking(b: BackendBooking): Booking {
  const state = normaliseState(b.state);

  const guestLabel =
    b.personalDetails.length > 0
      ? `${b.personalDetails[0].firstName} ${b.personalDetails[0].lastName} (${b.guests.adult} adult${b.guests.adult !== 1 ? 's' : ''}${b.guests.children > 0 ? `, ${b.guests.children} child${b.guests.children !== 1 ? 'ren' : ''}` : ''})`
      : `${b.guests.adult} adult${b.guests.adult !== 1 ? 's' : ''}`;

  return {
    id: b.id,
    state,
    tourImageUrl: null,
    name: b.tourId,
    destination: '',
    tourDetails: {
      date: `${b.date} (${b.duration})`,
      mealPlan: mealPlanLabel(b.mealPlan),
      guests: guestLabel,
      totalPrice: '',
      documents: `${b.documents?.length ?? 0} items`,
    },
    travelAgent: getRandomTravelAgent(),
    canceledBy: null,
    cancelReason: null,
    freeCancelation: b.freeCancelation ?? undefined,
    feedbackRating: b.feedbackRating,
    feedbackComment: b.feedbackComment,
    feedbackFlagged: b.feedbackFlagged,
    personalDetails: b.personalDetails,
    documents: b.documents ?? [],
    changeRequestStatus: b.changeRequestStatus,
    pendingChanges: b.pendingChanges,
  };
}

function mealPlanLabel(code: string): string {
  switch (code) {
    case 'BB': return 'Breakfast (BB)';
    case 'HB': return 'Half-board (HB)';
    case 'FB': return 'Full-board (FB)';
    case 'AI': return 'All inclusive (AI)';
    default:   return code;
  }
}
