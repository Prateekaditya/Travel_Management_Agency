import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { C, NUNITO } from '../constants/theme';
import vectorLogo from '../../../assets/logo/Vector.png';
import { useRouter } from '../../../context/RouterContext';

interface SignInModalProps {
  onClose: () => void;
}

const SignInModal: React.FC<SignInModalProps> = ({ onClose }) => {
  const { setRoute } = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(11, 56, 87, 0.4)' }}
      onMouseDown={onClose}
    >
      <div
        className="relative bg-white rounded-2xl"
        style={{ width: '100%', maxWidth: 480, padding: '32px 32px 28px', boxShadow: '0 8px 40px rgba(2,126,172,0.18)', margin: '0 16px' }}
        onMouseDown={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
        >
          <X size={20} color="#677883" strokeWidth={2} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2" style={{ marginBottom: 24 }}>
          <img src={vectorLogo} alt="logo" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          <span style={{ fontFamily: NUNITO, fontWeight: 800, fontSize: 22, color: C.primary }}>
            Travel Agency
          </span>
        </div>

        {/* Message */}
        <p style={{ fontFamily: NUNITO, fontWeight: 700, fontSize: 18, color: '#0B3857', margin: '0 0 24px', lineHeight: '26px' }}>
          To book a tour please sign in or create an account
        </p>

        {/* Buttons */}
        <div className="flex flex-col" style={{ gap: 12 }}>
          <button
            onClick={() => { onClose(); setRoute({ view: 'login', tourId: '' }); }}
            className="w-full transition-opacity hover:opacity-90"
            style={{ fontFamily: NUNITO, fontWeight: 700, fontSize: 16, height: 52, background: C.primary, color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer' }}
          >
            Sign in
          </button>
          <button
            onClick={() => { onClose(); setRoute({ view: 'signup', tourId: '' }); }}
            className="w-full transition-colors hover:bg-[#E7F9FF]"
            style={{ fontFamily: NUNITO, fontWeight: 700, fontSize: 16, height: 52, background: '#fff', color: C.primary, border: `1.5px solid ${C.primary}`, borderRadius: 10, cursor: 'pointer' }}
          >
            Create an account
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignInModal;
