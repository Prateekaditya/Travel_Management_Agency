import { useEffect, useMemo, useRef, useState } from 'react'
import { getAdminFeedbacks, updateAdminFeedbackVisibility } from '../api'
import logo from '../assets/figma/Logo.svg'
import { useAuth } from '../context/AuthContext'
import { useRouter } from '../context/RouterContext'

type FeedbackVisibilityStatus = 'Published' | 'Hidden'

interface FeedbackItem {
  tourId: string
  userId: string
  tourName: string
  tourCategory: string
  destination: string
  customerName: string
  rating: number
  comment: string
  createdAt: string
  status: FeedbackVisibilityStatus
  flaggedKeywords: string[]
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function formatDate(value: string): string {
  if (!value) return 'Unknown date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function normalizeFlagReason(flagReason: string | null | undefined): string[] {
  if (!flagReason) return []

  const prohibitedKeywordMatch = flagReason.match(/prohibited keyword\s+"([^"]+)"/i)
  if (prohibitedKeywordMatch) {
    return [`Contains the term "${prohibitedKeywordMatch[1]}", so it needs moderator review.`]
  }

  if (/auto-flagged/i.test(flagReason)) {
    return ['This feedback needs moderator review.']
  }

  return [flagReason]
}

export default function AdminFeedbackPage() {
  const { auth, showAuthMenu, setShowAuthMenu, handleLogout } = useAuth()
  const { setRoute } = useRouter()
  const accountWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (accountWrapRef.current && !accountWrapRef.current.contains(e.target as Node) && showAuthMenu) {
        setShowAuthMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showAuthMenu, setShowAuthMenu])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([])
  const [ratingFilter, setRatingFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [locationFilter, setLocationFilter] = useState('ALL')
  const [periodFilter, setPeriodFilter] = useState<'30d' | '90d' | 'all'>('all')

  useEffect(() => {
    let active = true

    async function loadModerationData() {
      setLoading(true)
      setError('')
      try {
        if (!auth?.idToken) throw new Error('You must be signed in as admin.')

        const items = await getAdminFeedbacks({}, auth.idToken)

        if (active) {
          setFeedbackItems(
            items.map(item => ({
              tourId: item.tourId,
              userId: item.userId,
              tourName: item.tourName,
              tourCategory: item.tourType || 'UNKNOWN',
              destination: item.destination || 'Unknown',
              customerName: item.authorName,
              rating: item.rating,
              comment: item.comment,
              createdAt: item.createdAt,
              status: (item.visibility === 'HIDDEN' ? 'Hidden' : 'Published') as FeedbackVisibilityStatus,
              flaggedKeywords: normalizeFlagReason(item.flagReason),
            } satisfies FeedbackItem)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          )
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load feedback moderation data.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadModerationData()
    return () => { active = false }
  }, [auth?.idToken])

  const locationOptions = useMemo(() => {
    const values = Array.from(new Set(feedbackItems.map(item => item.destination).filter(Boolean)))
    return values.sort((a, b) => a.localeCompare(b))
  }, [feedbackItems])

  const categoryOptions = useMemo(() => {
    const values = Array.from(new Set(feedbackItems.map(item => item.tourCategory).filter(Boolean)))
    return values.sort((a, b) => a.localeCompare(b))
  }, [feedbackItems])

  const filteredFeedback = useMemo(() => {
    return feedbackItems.filter(item => {
      if (ratingFilter !== 'ALL' && Math.round(item.rating).toString() !== ratingFilter) return false
      if (categoryFilter !== 'ALL' && item.tourCategory !== categoryFilter) return false
      if (locationFilter !== 'ALL' && item.destination !== locationFilter) return false
      if (periodFilter !== 'all') {
        const threshold = periodFilter === '30d' ? 30 : 90
        const reviewDate = new Date(item.createdAt)
        const minDate = new Date()
        minDate.setDate(minDate.getDate() - threshold)
        if (!Number.isNaN(reviewDate.getTime()) && reviewDate < minDate) return false
      }
      return true
    })
  }, [feedbackItems, ratingFilter, categoryFilter, locationFilter, periodFilter])

  const summary = useMemo(() => {
    if (filteredFeedback.length === 0) return { total: 0, average: 0, hidden: 0, flagged: 0 }
    const total = filteredFeedback.length
    const average = filteredFeedback.reduce((sum, item) => sum + item.rating, 0) / total
    const hidden = filteredFeedback.filter(item => item.status === 'Hidden').length
    const flagged = filteredFeedback.filter(item => item.flaggedKeywords.length > 0).length
    return { total, average, hidden, flagged }
  }, [filteredFeedback])

  async function updateStatus(item: FeedbackItem, status: FeedbackVisibilityStatus) {
    if (!auth?.idToken) return
    const backendVisibility = status === 'Hidden' ? 'HIDDEN' : 'PUBLISHED'
    try {
      await updateAdminFeedbackVisibility(item.tourId, item.userId, backendVisibility, auth.idToken)
      setFeedbackItems(prev =>
        prev.map(entry =>
          entry.tourId === item.tourId && entry.userId === item.userId ? { ...entry, status } : entry
        )
      )
    } catch {
      setError('Failed to update feedback visibility. Please try again.')
    }
  }

  const filterSelectStyle: React.CSSProperties = {
    height: 36,
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--surface)',
    padding: '0 12px',
    fontFamily: 'Nunito, sans-serif',
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--text-muted)',
    cursor: 'pointer',
    appearance: 'auto',
  }

  const tdStyle: React.CSSProperties = {
    padding: '14px 12px 14px 0',
    verticalAlign: 'top',
  }

  const actionBtnStyle: React.CSSProperties = {
    height: 30,
    padding: '0 12px',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    fontFamily: 'Nunito, sans-serif',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'background 0.15s',
  }

  return (
    <div className="travel-page">
      {/* ── Header ── */}
      <header className="site-header">
        <div className="site-nav-wrap">
          <div
            className="brand-wrap"
            style={{ cursor: 'pointer' }}
            onClick={() => setRoute({ view: 'admin', tourId: '' })}
          >
            <img src={logo} alt="Travel Agency" className="brand-logo" />
          </div>

          <nav className="main-nav">
            <button
              type="button"
              className="nav-btn"
              onClick={() => setRoute({ view: 'admin', tourId: '' })}
            >
              Reports
            </button>
            <button
              type="button"
              className="nav-btn active"
              onClick={() => setRoute({ view: 'feedback', tourId: '' })}
            >
              Feedback
            </button>
          </nav>

          <div className="account-wrap" ref={accountWrapRef}>
            <div className="user-profile">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0 12px' }}>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={() => setShowAuthMenu(!showAuthMenu)}
                  aria-label="Account menu"
                  aria-expanded={showAuthMenu}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M18 20C18 18.4087 17.3679 16.8826 16.2426 15.7574C15.1174 14.6321 13.5913 14 12 14C10.4087 14 8.88258 14.6321 7.75736 15.7574C6.63214 16.8826 6 18.4087 6 20" stroke="#0B3857" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 14C14.2091 14 16 12.2091 16 10C16 7.79086 14.2091 6 12 6C9.79086 6 8 7.79086 8 10C8 12.2091 9.79086 14 12 14Z" stroke="#0B3857" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#0B3857" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>
                <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 600, fontSize: '16px', color: '#0B3857', whiteSpace: 'nowrap' }}>
                  Admin
                </span>
              </div>

              {showAuthMenu && (
                <div className="auth-menu">
                  <div style={{ padding: '16px 16px 14px' }}>
                    {auth?.userName && (
                      <strong style={{ display: 'block', fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 15, color: '#0B3857', marginBottom: 2 }}>
                        {auth.userName}
                      </strong>
                    )}
                    <p style={{ fontFamily: 'Nunito, sans-serif', fontSize: 14, color: '#6B7280', margin: 0 }}>{auth?.email}</p>
                  </div>
                  <div style={{ height: 1, background: '#D3E1ED', margin: '0 16px' }} />
                  <div style={{ padding: '8px 0' }}>
                    <button
                      type="button"
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
                      onClick={handleLogout}
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
            </div>
          </div>
        </div>
      </header>

      <main style={{ background: 'var(--bg)', flex: 1 }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '40px 32px 48px' }}>

          <h1 style={{ textAlign: 'center', marginBottom: 24 }}>Feedback Moderation</h1>

          {/* ── Summary metrics ── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Feedback records', value: summary.total },
              { label: 'Average rating', value: summary.average.toFixed(1) },
              { label: 'Hidden', value: summary.hidden },
              { label: 'Flagged', value: summary.flagged },
            ].map(card => (
              <div
                key={card.label}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '16px 20px',
                }}
              >
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>{card.label}</p>
                <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* ── Feedback table ── */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-sm)',
              padding: 24,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
              <h2 style={{ margin: 0 }}>All Feedback</h2>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <select value={periodFilter} onChange={e => setPeriodFilter(e.target.value as '30d' | '90d' | 'all')} style={filterSelectStyle}>
                  <option value="all">All time</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                </select>
                <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} style={filterSelectStyle}>
                  <option value="ALL">All locations</option>
                  {locationOptions.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
                <select value={ratingFilter} onChange={e => setRatingFilter(e.target.value)} style={filterSelectStyle}>
                  <option value="ALL">All ratings</option>
                  <option value="1">1 star</option>
                  <option value="2">2 stars</option>
                  <option value="3">3 stars</option>
                  <option value="4">4 stars</option>
                  <option value="5">5 stars</option>
                </select>
                <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={filterSelectStyle}>
                  <option value="ALL">All categories</option>
                  {categoryOptions.map(category => (
                    <option key={category} value={category}>{titleCase(category)}</option>
                  ))}
                </select>
              </div>
            </div>

            {error && <p style={{ fontSize: 13, color: 'var(--red)', marginBottom: 12 }}>{error}</p>}
            {loading && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Loading feedback...</p>}

            {!loading && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: 960, borderCollapse: 'collapse', fontSize: 14, fontFamily: 'Nunito, sans-serif' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Customer', 'Tour', 'Category', 'Rating', 'Comment', 'Status', 'Flag', 'Actions'].map(col => (
                        <th
                          key={col}
                          style={{
                            padding: '10px 12px 10px 0',
                            textAlign: 'left',
                            fontSize: 11,
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            color: 'var(--text-light)',
                          }}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFeedback.map(item => (
                      <tr key={`${item.tourId}::${item.userId}`} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={tdStyle}>
                          <p style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{item.customerName}</p>
                          <p style={{ fontSize: 12, color: 'var(--text-light)' }}>{formatDate(item.createdAt)}</p>
                        </td>
                        <td style={{ ...tdStyle, maxWidth: 140 }}>
                          <span style={{ color: 'var(--text)', fontWeight: 600 }}>{item.tourName}</span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ color: 'var(--text-muted)' }}>{titleCase(item.tourCategory)}</span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ fontWeight: 700, color: 'var(--text)' }}>{item.rating}/5</span>
                          <div style={{ display: 'flex', gap: 2, marginTop: 2 }}>
                            {[1,2,3,4,5].map(s => (
                              <svg key={s} width="10" height="10" viewBox="0 0 24 24" fill={s <= Math.round(item.rating) ? '#F59E0B' : 'none'} stroke="#F59E0B" strokeWidth="2">
                                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
                              </svg>
                            ))}
                          </div>
                        </td>
                        <td style={{ ...tdStyle, maxWidth: 280 }}>
                          <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: '20px', wordBreak: 'break-word' }}>
                            {item.comment || <em style={{ color: 'var(--text-light)' }}>No comment</em>}
                          </p>
                        </td>
                        <td style={tdStyle}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '3px 10px',
                              borderRadius: 999,
                              fontSize: 12,
                              fontWeight: 700,
                              background: item.status === 'Published' ? 'var(--green-bg)' : 'var(--border)',
                              color: item.status === 'Published' ? 'var(--green)' : 'var(--text-muted)',
                            }}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          {item.flaggedKeywords.length > 0 ? (
                            <>
                              <p style={{ fontSize: 12, fontWeight: 700, color: '#B45309', marginBottom: 2 }}>Review required</p>
                              <p style={{ fontSize: 11, color: '#92400E' }}>{item.flaggedKeywords.join(', ')}</p>
                            </>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--green)' }}>Clear</span>
                          )}
                        </td>
                        <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                          <button
                            type="button"
                            onClick={() => updateStatus(item, 'Published')}
                            style={{
                              ...actionBtnStyle,
                              background: item.status === 'Published' ? 'var(--primary)' : 'var(--primary-light)',
                              color: item.status === 'Published' ? '#fff' : 'var(--primary)',
                              marginRight: 6,
                            }}
                          >
                            Publish
                          </button>
                          <button
                            type="button"
                            onClick={() => updateStatus(item, 'Hidden')}
                            style={{
                              ...actionBtnStyle,
                              background: item.status === 'Hidden' ? 'var(--text)' : 'var(--border)',
                              color: item.status === 'Hidden' ? '#fff' : 'var(--text-muted)',
                            }}
                          >
                            Hide
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredFeedback.length === 0 && !error && (
                  <p style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 14 }}>
                    No feedback matches the selected filters.
                  </p>
                )}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}
