import React, { useRef, useState, useEffect } from 'react';
import { User, LogOut } from 'lucide-react';
import userIcon from '../../../assets/logo/user.svg';
import { useNavigate, useLocation } from 'react-router-dom';
import vectorLogo from '../../../assets/logo/Vector.png';
import { useAuth } from '../context/AuthContext';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isLoggedIn, user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  const tab = (label: string, path: string) => {
    const active = location.pathname === path;
    return (
      <button
        onClick={() => navigate(path)}
        className="relative px-3 py-4 text-sm transition-colors"
        style={{
          fontFamily: 'Nunito, sans-serif',
          fontWeight: 600,
          color: active ? '#027EAC' : '#677883',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        {label}
        {active && (
          <span
            className="absolute bottom-0 left-0 w-full"
            style={{ height: 2, background: '#027EAC', borderRadius: 1 }}
          />
        )}
      </button>
    );
  };

  // ── Logged-in navbar ──
  if (isLoggedIn) {
    return (
      <nav className="bg-white border-b px-4 sm:px-10 h-14" style={{ borderColor: '#D3E1ED', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
        {/* Left: logo */}
        <div onClick={() => navigate('/')} className="flex items-center gap-2 cursor-pointer flex-shrink-0" style={{ justifySelf: 'start' }}>
          <img src={vectorLogo} alt="logo" style={{ width: 24, height: 24, objectFit: 'contain' }} />
          <span className="hidden sm:inline font-extrabold text-lg" style={{ fontFamily: 'Nunito, sans-serif', color: '#027EAC' }}>
            Travel Agency
          </span>
        </div>

        {/* Center: tabs */}
        <div className="flex items-center gap-1 sm:gap-2" style={{ justifySelf: 'center' }}>
          {tab('All tours', '/')}
          {isLoggedIn && tab('My tours', '/my-tours')}
        </div>

        {/* Right: profile icon + dropdown */}
        <div ref={menuRef} className="relative flex-shrink-0" style={{ justifySelf: 'end' }}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="flex items-center justify-center rounded-full hover:bg-[#E7F9FF] transition-colors"
            style={{ width: 36, height: 36, background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <img src={userIcon} alt="profile" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          </button>

          {menuOpen && (
            <div
              className="absolute right-0 mt-2 bg-white z-50"
              style={{
                minWidth: 220,
                border: '1px solid #D3E1ED',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(11,56,87,0.12)',
              }}
            >
              {/* Name & email */}
              <div style={{ padding: '16px 16px 14px' }}>
                <p style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 15, color: '#0B3857', margin: 0 }}>
                  {user?.name}
                </p>
                <p style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 400, fontSize: 13, color: '#677883', margin: '2px 0 0' }}>
                  {user?.email}
                </p>
              </div>
              {/* Divider */}
              <div style={{ height: 1, background: '#D3E1ED', margin: '0 16px' }} />
              {/* Actions */}
              <div style={{ padding: '8px 0' }}>
                <button
                  onClick={() => { setMenuOpen(false); navigate('/my-profile'); }}
                  className="w-full flex items-center"
                  style={{ gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 14, color: '#0B3857' }}
                  onMouseOver={e => (e.currentTarget.style.background = '#E7F9FF')}
                  onMouseOut={e => (e.currentTarget.style.background = 'none')}
                >
                  <User size={18} color="#0B3857" strokeWidth={1.8} />
                  My Profile
                </button>
                <button
                  onClick={() => { setMenuOpen(false); logout(); navigate('/'); }}
                  className="w-full flex items-center"
                  style={{ gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 14, color: '#0B3857' }}
                  onMouseOver={e => (e.currentTarget.style.background = '#E7F9FF')}
                  onMouseOut={e => (e.currentTarget.style.background = 'none')}
                >
                  <LogOut size={18} color="#0B3857" strokeWidth={1.8} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>
    );
  }

  // ── Logged-out navbar ──
  return (
    <nav className="bg-white border-b px-4 sm:px-10 h-14" style={{ borderColor: '#D3E1ED', display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
      <div onClick={() => navigate('/')} className="flex items-center gap-2 cursor-pointer flex-shrink-0" style={{ justifySelf: 'start' }}>
        <img src={vectorLogo} alt="logo" style={{ width: 24, height: 24, objectFit: 'contain' }} />
        <span className="hidden sm:inline font-extrabold text-lg" style={{ fontFamily: 'Nunito, sans-serif', color: '#027EAC' }}>
          Travel Agency
        </span>
      </div>
      <span className="text-sm font-bold" style={{ fontFamily: 'Nunito, sans-serif', color: '#1a1a1a', justifySelf: 'center' }}>
        All tours
      </span>
      <button
        onClick={() => navigate('/auth/sign-in')}
        className="text-sm font-extrabold border border-[#027EAC] text-[#027EAC] rounded-lg px-3 sm:px-4 py-1.5 hover:bg-[#E7F9FF] flex-shrink-0"
        style={{ fontFamily: 'Nunito, sans-serif', justifySelf: 'end' }}>
        Sign in
      </button>
    </nav>
  );
};

export default Navbar;
