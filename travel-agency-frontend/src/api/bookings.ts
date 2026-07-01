import { apiRequest, BASE_URL } from './client';
import {
  Booking,
  BackendBooking,
  BookingsListResponse,
  mapBackendBooking,
  normaliseState,
  getRandomTravelAgent,
} from '../types/booking';

// ── GET /bookings ─────────────────────────────────────────────────────────────
// Handles two backend formats transparently:
//   OLD (current): plain BackendBooking[]  — raw DTOs, needs mapper
//   NEW (post-update): { bookings: BookingResponseDTO[] } — rich display data
export function getBookings(userId?: string, signal?: AbortSignal): Promise<Booking[]> {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
  return apiRequest<unknown>(`/bookings${query}`, { signal }).then(res => {
    if (Array.isArray(res)) {
      return (res as BackendBooking[]).map(mapBackendBooking);
    }
    const { bookings } = res as BookingsListResponse;
    return bookings.map(b => ({
      ...b,
      state: normaliseState(b.state),
      freeCancelation: b.freeCancelation ?? undefined,
      travelAgent: b.travelAgent?.name ? b.travelAgent : getRandomTravelAgent(),
      documents: (b as any).documents ?? [],
    } as Booking));
  });
}

// ── POST /bookings ─────────────────────────────────────────────────────────────
// Backend reads userId from the JWT token — do NOT send userId in the body.
export interface PersonalDetail {
  firstName: string;
  lastName: string;
}

export interface CreateBookingRequest {
  userId: string;
  tourId: string;
  date: string;
  duration: string;
  mealPlan: string;
  guests: { adult: number; children: number };
  personalDetails: PersonalDetail[];
}

export interface CreateBookingResponse {
  freeCancelation: string; // ISO date "2025-01-05"
  details: string;
}

export function createBooking(payload: CreateBookingRequest): Promise<CreateBookingResponse> {
  return apiRequest<CreateBookingResponse>('/bookings', {
    method: 'POST',
    body: payload,
  });
}

// ── DELETE /bookings/{bookingId} ──────────────────────────────────────────────
// Cancels a booking. Backend checks ownership via JWT and enforces the
// 10-day free-cancellation policy. Throws if period has expired.
export interface CancelBookingResponse {
  message: string;
}

export function cancelBooking(bookingId: string): Promise<CancelBookingResponse> {
  return apiRequest<CancelBookingResponse>(`/bookings/${encodeURIComponent(bookingId)}`, {
    method: 'DELETE',
  });
}

// ── PATCH /bookings/{bookingId} ───────────────────────────────────────────────
export interface UpdateBookingRequest {
  date: string;                      // ISO "2025-01-15"
  duration: string;                  // "7 days"
  mealPlan: string;                  // "BB"
  guests: { adult: number; children: number };
  personalDetails: PersonalDetail[];
  changeRequestStatus?: 'PENDING' | 'APPROVED';
}

export function updateBooking(bookingId: string, payload: UpdateBookingRequest): Promise<Booking> {
  return apiRequest<Booking>(`/bookings/${encodeURIComponent(bookingId)}`, {
    method: 'PATCH',
    body: payload,
  });
}

// ── PATCH /bookings/{bookingId}/agent-edit ──────────────────────────────────
// Travel agent proposes edits; backend stores them as PENDING until customer approves.
export function agentEditBooking(bookingId: string, payload: UpdateBookingRequest): Promise<Booking> {
  return apiRequest<Booking>(`/bookings/${encodeURIComponent(bookingId)}/agent-edit`, {
    method: 'PATCH',
    body: payload,
  });
}

// ── POST /bookings/{bookingId}/approve-changes ──────────────────────────────
export function approveBookingChanges(bookingId: string): Promise<Booking> {
  return apiRequest<Booking>(`/bookings/${encodeURIComponent(bookingId)}/approve-changes`, {
    method: 'POST',
  });
}

// ── POST /bookings/{bookingId}/decline-changes ──────────────────────────────
export function declineBookingChanges(bookingId: string): Promise<Booking> {
  return apiRequest<Booking>(`/bookings/${encodeURIComponent(bookingId)}/decline-changes`, {
    method: 'POST',
  });
}

// ── POST /bookings/{bookingId}/documents ──────────────────────────────────────
// Uploads a travel document (PDF / image) to a booking.
// Uses multipart/form-data — cannot go through the JSON apiRequest helper.
export interface UploadDocumentResponse {
  message: string;
  documentId: string;
}

export async function uploadDocument(
  bookingId: string,
  file: File,
  token: string,
  label?: string
): Promise<UploadDocumentResponse> {
  const formData = new FormData();
  formData.append('file', file);
  if (label) formData.append('label', label);

  const response = await fetch(`${BASE_URL}/bookings/${encodeURIComponent(bookingId)}/documents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    let message = `Upload failed: ${response.status} ${response.statusText}`;
    try {
      const err = await response.json();
      // Backend returns { error: "...", details: ["..."] } — NOT { message: "..." }
      if (err?.details?.[0]) message = err.details[0];
      else if (err?.error) message = err.error;
      else if (err?.message) message = err.message;
    } catch { /* ignore */ }
    throw new Error(message);
  }

  return response.json() as Promise<UploadDocumentResponse>;
}

// ── GET /bookings/{bookingId}/documents/{documentId}/download ─────────────────
// Downloads / views an existing document. Fetches bytes and opens a blob URL in a new tab.
export async function viewDocument(
  bookingId: string,
  documentId: string,
  token: string,
): Promise<void> {
  const response = await fetch(
    `${BASE_URL}/bookings/${encodeURIComponent(bookingId)}/documents/${encodeURIComponent(documentId)}/download`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch document: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
  const blob = await response.blob();
  // Force the correct MIME type so browser renders PDFs/images inline
  const viewableBlob = new Blob([blob], { type: contentType.split(';')[0].trim() });
  const url = URL.createObjectURL(viewableBlob);
  const newTab = window.open(url, '_blank');
  if (!newTab) {
    // Fallback: trigger a download link if popup was blocked
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  // revoke after a short delay so the new tab has time to load
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ── PUT /bookings/{bookingId}/documents/{documentId} ──────────────────────────
// Replaces an existing document for a specific slot (update flow).
export async function replaceDocument(
  bookingId: string,
  documentId: string,
  file: File,
  token: string,
  label?: string
): Promise<UploadDocumentResponse> {
  const formData = new FormData();
  formData.append('file', file);
  if (label) formData.append('label', label);

  const response = await fetch(
    `${BASE_URL}/bookings/${encodeURIComponent(bookingId)}/documents/${encodeURIComponent(documentId)}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    let message = `Update failed: ${response.status} ${response.statusText}`;
    try {
      const err = await response.json();
      if (err?.details?.[0]) message = err.details[0];
      else if (err?.error) message = err.error;
      else if (err?.message) message = err.message;
    } catch { /* ignore */ }
    throw new Error(message);
  }

  return response.json() as Promise<UploadDocumentResponse>;
}

