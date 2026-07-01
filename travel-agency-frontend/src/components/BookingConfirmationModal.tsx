import React from 'react';

interface BookingConfirmationModalProps {
  freeCancelation: string; // ISO date e.g. "2025-01-05"
  details: string;
  onClose: () => void;
}

function formatLongDate(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

const BookingConfirmationModal: React.FC<BookingConfirmationModalProps> = ({
  freeCancelation,
  details,
  onClose,
}) => {
  // Split at "successfully." to form two paragraphs
  const splitIndex = details.indexOf('successfully.');
  const mainText =
    splitIndex !== -1 ? details.slice(0, splitIndex + 'successfully.'.length) : details;
  const uploadText =
    splitIndex !== -1 ? details.slice(splitIndex + 'successfully.'.length).trim() : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white shadow-xl flex flex-col"
        style={{ width: 544, maxWidth: 'calc(100vw - 32px)', minHeight: 296, borderRadius: 12, padding: 24, gap: 32 }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Booking confirmation</h2>
          <button
            onClick={onClose}
            className="text-gray-800 hover:text-gray-900 transition-colors"
            aria-label="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Content ── */}
        <div className="flex flex-col" style={{ gap: 16 }}>
          {/* Free cancellation notice */}
          <div className="rounded-lg px-4 py-3 text-sm text-gray-700" style={{ backgroundColor: '#fefde8', border: '1px solid #f0e68c' }}>
            Free cancellation is possible until {formatLongDate(freeCancelation)}.
          </div>

          {/* Confirmation text */}
          <p className="text-sm text-gray-800 leading-relaxed">{mainText}</p>
          {uploadText && (
            <p className="text-sm text-gray-800 leading-relaxed">{uploadText}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmationModal;
