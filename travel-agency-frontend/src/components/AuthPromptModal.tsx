import React from 'react';
import ReactDOM from 'react-dom';
import TrollyLogo from './TrollyLogo';

interface AuthPromptModalProps {
  onClose: () => void;
  onSignIn: () => void;
  onCreateAccount: () => void;
}

const AuthPromptModal: React.FC<AuthPromptModalProps> = ({
  onClose,
  onSignIn,
  onCreateAccount,
}) => {
  return ReactDOM.createPortal(
    /* Backdrop */
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50 px-4"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      {/* Modal card — 544px wide, padding 24px, gap 32px, radius 12px */}
      <div
        className="relative bg-white shadow-xl flex flex-col"
        style={{ width: 544, borderRadius: 12, padding: 24, gap: 32 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrollyLogo width={20} height={28} />
            <span className="text-lg font-bold text-[#1a6b8c]">
              Travel Agency
            </span>
          </div>

          {/* Close button */}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
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
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body text */}
        <p className="font-semibold text-base m-0" style={{ color: '#0B3857' }}>
          To book a tour please sign in or create an account
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onSignIn}
            className="w-full py-3 rounded-lg bg-[#1a6b8c] text-white font-semibold text-base hover:bg-[#155a77] transition-colors"
          >
            Sign in
          </button>
          <button
            onClick={onCreateAccount}
            className="w-full py-3 rounded-lg border-2 border-[#1a6b8c] text-[#1a6b8c] font-semibold text-base bg-white hover:bg-[#eaf4f8] transition-colors"
          >
            Create an account
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AuthPromptModal;
