import React from 'react';

export interface PendingChanges {
  bookingId: string;
  tourName: string;
  tourDate: string; // formatted display date
  changes: { label: string; from: string; to: string }[];
  apply: () => void;
}

interface ConfirmChangesModalProps {
  pending: PendingChanges;
  onConfirm: () => void;
  onDecline: () => void;
}

const ConfirmChangesModal: React.FC<ConfirmChangesModalProps> = ({ pending, onConfirm, onDecline }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onDecline}
    >
      <div
        className="relative bg-white shadow-xl flex flex-col max-h-[90vh] overflow-y-auto"
        style={{ width: 544, borderRadius: 12, padding: 24, gap: 32 }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#0B3857]">Confirm tour booking changes</h2>
          <button
            onClick={onDecline}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-col" style={{ gap: 16 }}>
          <p className="text-sm text-[#0B3857]">
            Your booking for <strong>{pending.tourName}</strong> on{' '}
            <strong>{pending.tourDate}</strong> has been updated.
          </p>

          {pending.changes.length > 0 && (
            <div className="flex flex-col" style={{ gap: 8 }}>
              <p className="text-sm font-bold text-[#0B3857]">Changes:</p>
              <ul className="flex flex-col" style={{ gap: 6 }}>
                {pending.changes.map((c, i) => (
                  <li key={i} className="text-sm text-[#0B3857] flex gap-1 flex-wrap">
                    <span className="font-medium">{c.label}:</span>
                    <span>{c.from}</span>
                    <span>→</span>
                    <span>{c.to}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-sm text-gray-500">
            All other details of this booking remain the same. Please review the changes and confirm your updated booking, or contact us if you need further assistance.
          </p>
        </div>

        {/* ── Buttons ── */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onDecline}
            className="px-6 py-3 rounded-full border-2 border-[#027EAC] text-[#027EAC] font-semibold text-sm hover:bg-[#E7F9FF] transition-colors"
          >
            Decline changes
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-3 rounded-full font-semibold text-sm text-white transition-colors"
            style={{ backgroundColor: '#027EAC' }}
          >
            Confirm changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmChangesModal;
