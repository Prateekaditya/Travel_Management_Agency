import React, { useRef, useEffect } from 'react'
import logo from '../assets/figma/Logo.svg'
import userIcon from '../assets/figma/user.svg'
import type { Route } from '../types'

interface NavbarProps {
  currentView: string
  isLoggedIn: boolean
  userName?: string
  userEmail?: string
  userRole?: string
  onNavigate: (route: Route) => void
  onToggleAuth: () => void
  showAuthMenu: boolean
  onLogout: () => void
  initials: string
}

export default function Navbar({
  currentView,
  isLoggedIn,
  userName,
  userEmail,
  userRole,
  onNavigate,
  onToggleAuth,
  showAuthMenu,
  onLogout,
  initials,
}: NavbarProps) {
  const accountWrapRef = useRef<HTMLDivElement>(null);
  const showAuthMenuRef = useRef(showAuthMenu);
  useEffect(() => { showAuthMenuRef.current = showAuthMenu; }, [showAuthMenu]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (accountWrapRef.current && !accountWrapRef.current.contains(e.target as Node) && showAuthMenuRef.current) {
        onToggleAuth();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onToggleAuth]);

  const isTravelAgent = userRole === 'TRAVEL_AGENT';
  const isAdmin = userRole === 'ADMIN';

  return (
    <header className="site-header">
      <div className="site-nav-wrap">
        <div className="brand-wrap" onClick={() => { if (showAuthMenuRef.current) onToggleAuth(); onNavigate({ view: isAdmin ? 'admin' : 'all', tourId: '' }); }}>
          <img src={logo} alt="Travel Agency" className="brand-logo" />
        </div>

        <nav className="main-nav">
          {isAdmin ? (
            // Admin nav — Reports & Feedback only
            <>
              <button
                type="button"
                className={`nav-btn${currentView === 'admin' ? ' active' : ''}`}
                onClick={() => { if (showAuthMenuRef.current) onToggleAuth(); onNavigate({ view: 'admin', tourId: '' }); }}
              >
                Reports
              </button>
              <button
                type="button"
                className={`nav-btn${currentView === 'feedback' ? ' active' : ''}`}
                onClick={() => { if (showAuthMenuRef.current) onToggleAuth(); onNavigate({ view: 'feedback', tourId: '' }); }}
              >
                Feedback
              </button>
            </>
          ) : (
            // Customer / Travel Agent nav
            <>
              <button
                type="button"
                className={`nav-btn${currentView === 'all' || currentView === 'details' ? ' active' : ''}`}
                onClick={() => { if (showAuthMenuRef.current) onToggleAuth(); onNavigate({ view: 'all', tourId: '' }); }}
              >
                All tours
              </button>
              {isLoggedIn && !isTravelAgent && (
                <button
                  type="button"
                  className={`nav-btn${currentView === 'my' ? ' active' : ''}`}
                  onClick={() => { if (showAuthMenuRef.current) onToggleAuth(); onNavigate({ view: 'my', tourId: '' }); }}
                >
                  My tours
                </button>
              )}
              {isLoggedIn && isTravelAgent && (
                <button
                  type="button"
                  className={`nav-btn${currentView === 'my' || currentView === 'agent' ? ' active' : ''}`}
                  onClick={() => { if (showAuthMenuRef.current) onToggleAuth(); onNavigate({ view: 'my', tourId: '' }); }}
                >
                  Bookings
                </button>
              )}
            </>
          )}
        </nav>

        <div className="account-wrap" ref={accountWrapRef}>
          {isLoggedIn ? (
            <div className="user-profile">
              {(isTravelAgent || isAdmin) ? (
                // Travel Agent View - Icon + Label + Dropdown
                <>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '8px',
                    padding: '0 12px'
                  }}>
                    <button
                      type="button"
                      className="icon-btn"
                      onClick={onToggleAuth}
                      aria-label="Account menu"
                      aria-expanded={showAuthMenu}
                      style={{ padding: 0, background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18 20C18 18.4087 17.3679 16.8826 16.2426 15.7574C15.1174 14.6321 13.5913 14 12 14C10.4087 14 8.88258 14.6321 7.75736 15.7574C6.63214 16.8826 6 18.4087 6 20" stroke="#0B3857" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 14C14.2091 14 16 12.2091 16 10C16 7.79086 14.2091 6 12 6C9.79086 6 8 7.79086 8 10C8 12.2091 9.79086 14 12 14Z" stroke="#0B3857" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#0B3857" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <span style={{
                      fontFamily: 'Nunito, sans-serif',
                      fontWeight: 600,
                      fontSize: '16px',
                      color: '#0B3857',
                      whiteSpace: 'nowrap'
                    }}>
                      {isAdmin ? 'Admin' : 'Travel agent'}
                    </span>
                  </div>

                  {showAuthMenu && (
                    <div className="auth-menu">
                      <div style={{ padding: '16px 16px 14px' }}>
                        {userName && (
                          <strong style={{ display: 'block', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 15, color: '#0B3857', marginBottom: 2 }}>
                            {userName}
                          </strong>
                        )}
                        <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: 14, color: '#6B7280', margin: 0 }}>{userEmail}</p>
                      </div>
                      <div style={{ height: 1, background: '#D3E1ED', margin: '0 16px' }} />
                      <div style={{ padding: '8px 0' }}>
                        <button
                          type="button"
                          onClick={() => { onNavigate({ view: 'profile', tourId: '' }); onToggleAuth(); }}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 14, color: '#0B3857' }}
                          onMouseOver={e => (e.currentTarget.style.background = '#E7F9FF')}
                          onMouseOut={e => (e.currentTarget.style.background = 'none')}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0B3857" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                          </svg>
                          My Profile
                        </button>
                        <button
                          type="button"
                          onClick={onLogout}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 14, color: '#0B3857' }}
                          onMouseOver={e => (e.currentTarget.style.background = '#E7F9FF')}
                          onMouseOut={e => (e.currentTarget.style.background = 'none')}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0B3857" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                          </svg>
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                // Regular User View - With dropdown menu
                <>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={onToggleAuth}
                    aria-label="Account menu"
                    aria-expanded={showAuthMenu}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18 20C18 18.4087 17.3679 16.8826 16.2426 15.7574C15.1174 14.6321 13.5913 14 12 14C10.4087 14 8.88258 14.6321 7.75736 15.7574C6.63214 16.8826 6 18.4087 6 20" stroke="#0B3857" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 14C14.2091 14 16 12.2091 16 10C16 7.79086 14.2091 6 12 6C9.79086 6 8 7.79086 8 10C8 12.2091 9.79086 14 12 14Z" stroke="#0B3857" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#0B3857" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  {showAuthMenu && (
                    <div className="auth-menu">
                      <div style={{ padding: '16px 16px 14px' }}>
                        {userName && (
                          <strong style={{ display: 'block', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 15, color: '#0B3857', marginBottom: 2 }}>
                            {userName}
                          </strong>
                        )}
                        <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: 14, color: '#6B7280', margin: 0 }}>{userEmail}</p>
                      </div>
                      <div style={{ height: 1, background: '#D3E1ED', margin: '0 16px' }} />
                      <div style={{ padding: '8px 0' }}>
                        <button
                          type="button"
                          onClick={() => { onNavigate({ view: 'profile', tourId: '' }); onToggleAuth(); }}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 14, color: '#0B3857' }}
                          onMouseOver={e => (e.currentTarget.style.background = '#E7F9FF')}
                          onMouseOut={e => (e.currentTarget.style.background = 'none')}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0B3857" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                          </svg>
                          My Profile
                        </button>
                        <button
                          type="button"
                          onClick={onLogout}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px', fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 14, color: '#0B3857' }}
                          onMouseOver={e => (e.currentTarget.style.background = '#E7F9FF')}
                          onMouseOut={e => (e.currentTarget.style.background = 'none')}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0B3857" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                          </svg>
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              className="signin-btn"
              onClick={() => onNavigate({ view: 'login', tourId: '' })}
            >
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  )
}