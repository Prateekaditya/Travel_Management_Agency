import React from 'react';

interface CancelBookingModalProps {
  tourName: string;
  tourDate: string;       // e.g. "Jan 15, 2025 (7 days)"
  mealPlan: string;       // e.g. "Breakfast (BB)"
  guests: string;         // e.g. "Johnson Doe (1 adult)"
  freeCancelation: string; // ISO date e.g. "2025-01-05"
  onConfirmCancel: () => void;
  onKeep: () => void;
}

function formatLongDate(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Extract the adult/guest count part from a guests string like "Johnson Doe (1 adult)" */
function extractGuestCount(guests: string): string {
  const match = guests.match(/\(([^)]+)\)/);
  return match ? match[1] : guests;
}

const CancelBookingModal: React.FC<CancelBookingModalProps> = ({
  tourName,
  tourDate,
  mealPlan,
  guests,
  freeCancelation,
  onConfirmCancel,
  onKeep,
}) => {
  const guestCount = extractGuestCount(guests);
  const isPeriodOver = freeCancelation
    ? new Date() > new Date(freeCancelation + 'T23:59:59')
    : true;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onKeep}
    >
      <div
        className="relative bg-white shadow-xl flex flex-col"
        style={{ width: 544, maxWidth: 'calc(100vw - 32px)', borderRadius: 12, padding: 24, gap: 32 }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-[#0B3857]">Cancel</h2>
          <button
            onClick={onKeep}
            className="text-gray-800 hover:text-gray-900 transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col" style={{ gap: 16 }}>
          {/* Cancellation notice — red if period is over, yellow if still free */}
          {isPeriodOver ? (
            <div className="rounded-lg px-4 py-3" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
              <p className="text-sm text-red-600">
                Please note, that the free cancelation period for this booking is over, the charges are non-refundable.
              </p>
            </div>
          ) : (
            <div className="rounded-lg px-4 py-3" style={{ backgroundColor: '#FEFCE8', border: '1px solid #FEF08A' }}>
              <p className="text-sm text-[#0B3857]">
                Free cancellation is possible until {formatLongDate(freeCancelation)}.
              </p>
            </div>
          )}

          {/* Confirmation question */}
          <p className="text-base text-[#0B3857] leading-relaxed">
            Are you sure you want to cancel the tour at{' '}
            <strong>{tourName},</strong> starting date{' '}
            <strong>{tourDate}</strong>,{' '}
            <strong>{mealPlan}</strong> for{' '}
            <strong>{guestCount}</strong>?
          </p>
        </div>

        {/* ── Buttons ── */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={() => onConfirmCancel()}
            className="px-6 py-3 rounded-full border-2 border-[#027EAC] text-[#027EAC] font-semibold text-sm hover:bg-[#E7F9FF] transition-colors"
          >
            Cancel the booking
          </button>
          <button
            onClick={onKeep}
            className="px-6 py-3 rounded-full font-semibold text-sm text-white transition-colors"
            style={{ backgroundColor: '#0B3857' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#0a3048')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#0B3857')}
          >
            Keep the booking
          </button>
        </div>
      </div>
    </div>
  );
};

export default CancelBookingModal;
