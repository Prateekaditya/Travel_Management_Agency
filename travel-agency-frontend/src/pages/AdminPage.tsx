import { useEffect, useRef, useState } from 'react'
import { downloadReportFile, generateReport, getDestinations, type GenerateReportResponse } from '../api'
import logo from '../assets/figma/Logo.svg'
import { useAuth } from '../context/AuthContext'
import { useRouter } from '../context/RouterContext'

type ReportType = 'STAFF_PERFORMANCE' | 'SALES'

function formatDate(value: string): string {
  if (!value) return 'Unknown date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function fmtDisplay(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const CAL_MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

const navBtnStyle: React.CSSProperties = {
  width: 32, height: 32, border: 'none', background: 'none', cursor: 'pointer',
  fontSize: 20, lineHeight: '1', color: '#374151',
  display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6,
}

function DateRangePicker({ start, end, onChange }: {
  start: Date; end: Date; onChange: (s: Date, e: Date) => void
}) {
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(new Date(start.getFullYear(), start.getMonth(), 1))
  const [tempStart, setTempStart] = useState<Date | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const totalDays = new Date(year, month + 1, 0).getDate()
  const rawFirst = new Date(year, month, 1).getDay()
  const offset = rawFirst === 0 ? 6 : rawFirst - 1

  const handleDay = (day: number) => {
    const clicked = new Date(year, month, day)
    if (!tempStart) {
      setTempStart(clicked)
    } else {
      const s = tempStart <= clicked ? tempStart : clicked
      const e = tempStart <= clicked ? clicked : tempStart
      onChange(s, e)
      setTempStart(null)
      setOpen(false)
    }
  }

  const isSel = (d: Date) =>
    d.toDateString() === (tempStart ?? start).toDateString() ||
    (!tempStart && d.toDateString() === end.toDateString())

  const inRange = (d: Date) => !tempStart && d > start && d < end

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          height: 44, padding: '0 14px',
          border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)',
          background: 'var(--surface)',
          fontFamily: 'Nunito, sans-serif', fontSize: 14, fontWeight: 600, color: 'var(--text)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          whiteSpace: 'nowrap', width: '100%',
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        {fmtDisplay(tempStart ?? start)} – {tempStart ? '…' : fmtDisplay(end)}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2.5" style={{ marginLeft: 'auto' }}>
          <polyline points={open ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 200,
          background: '#fff', border: '1.5px solid var(--border)', borderRadius: 12,
          boxShadow: '0 8px 30px rgba(0,0,0,0.14)', padding: '16px 18px', minWidth: 280,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <button type="button" style={navBtnStyle} onClick={() => setViewDate(new Date(year, month - 1, 1))}>‹</button>
            <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 15 }}>
              {CAL_MONTHS[month]} {year}
            </span>
            <button type="button" style={navBtnStyle} onClick={() => setViewDate(new Date(year, month + 1, 1))}>›</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 6 }}>
            {['M','T','W','T','F','S','S'].map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#9CA3AF', padding: '3px 0', fontFamily: 'Nunito, sans-serif' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {Array.from({ length: offset }, (_, i) => <div key={`b${i}`} />)}
            {Array.from({ length: totalDays }, (_, i) => {
              const day = i + 1
              const thisDate = new Date(year, month, day)
              const sel = isSel(thisDate)
              const ranged = inRange(thisDate)
              return (
                <button
                  key={day} type="button"
                  onClick={() => handleDay(day)}
                  style={{
                    height: 34, border: 'none', borderRadius: sel ? '50%' : 4,
                    background: sel ? '#1B6CA8' : ranged ? '#DBEAFE' : 'transparent',
                    color: sel ? '#fff' : '#111827',
                    fontFamily: 'Nunito, sans-serif', fontSize: 13,
                    fontWeight: sel ? 700 : 400, cursor: 'pointer',
                  }}
                >{day}</button>
              )
            })}
          </div>
          {tempStart && (
            <p style={{ margin: '10px 0 0', fontSize: 12, color: '#6B7280', textAlign: 'center', fontFamily: 'Nunito, sans-serif' }}>
              Now select end date
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default function AdminPage() {
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

  const [reportType, setReportType] = useState<ReportType>('STAFF_PERFORMANCE')
  const [startDate, setStartDate] = useState<Date>(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d })
  const [endDate, setEndDate] = useState<Date>(() => new Date())
  const [reportLocation, setReportLocation] = useState('ALL')
  const [locations, setLocations] = useState<string[]>([])
  const [reportGeneratedAt, setReportGeneratedAt] = useState('')
  const [reportLoading, setReportLoading] = useState(false)
  const [reportError, setReportError] = useState('')
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const [reportResponse, setReportResponse] = useState<GenerateReportResponse | null>(null)
  const downloadMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target as Node)) {
        setShowDownloadMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    getDestinations().then(setLocations).catch(() => setLocations([]))
  }, [])

  async function handleGenerateReport() {
    if (!auth?.idToken) {
      setReportError('You must be signed in as admin to generate reports.')
      return
    }

    const selectedLocation = reportLocation === 'ALL' ? 'All locations' : reportLocation
    const startDateStr = toIsoDate(startDate)
    const endDateStr = toIsoDate(endDate)

    setReportLoading(true)
    setReportError('')
    try {
      const response = await generateReport(
        {
          reportType,
          startDate: startDateStr,
          endDate: endDateStr,
          location: selectedLocation,
        },
        auth.idToken
      )
      setReportResponse(response)
      setReportGeneratedAt(new Date().toISOString())
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Failed to generate report.')
    } finally {
      setReportLoading(false)
    }
  }

  async function handleDownload(format: 'excel' | 'pdf' | 'csv') {
    if (!reportResponse?.cachedReportKey || !auth?.idToken) return
    setDownloadLoading(true)
    setShowDownloadMenu(false)
    try {
      await downloadReportFile(reportResponse.cachedReportKey, auth.idToken, format, reportType)
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'Download failed.')
    } finally {
      setDownloadLoading(false)
    }
  }

  const selectStyle: React.CSSProperties = {
    height: 44,
    border: '1.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    background: 'var(--surface)',
    padding: '0 16px',
    fontFamily: 'Nunito, sans-serif',
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-muted)',
    cursor: 'pointer',
    appearance: 'auto',
  }

  return (
    <div className="travel-page">
      {/* ── Header — mirrors the site-header / Navbar structure ── */}
      <header className="site-header">
        <div className="site-nav-wrap">
          {/* Brand */}
          <div className="brand-wrap" style={{ cursor: 'default' }}>
            <img src={logo} alt="Travel Agency" className="brand-logo" />
          </div>

          {/* Centre nav tabs */}
          <nav className="main-nav">
            <button
              type="button"
              className="nav-btn active"
              onClick={() => setRoute({ view: 'admin', tourId: '' })}
            >
              Reports
            </button>
            <button
              type="button"
              className="nav-btn"
              onClick={() => setRoute({ view: 'feedback', tourId: '' })}
            >
              Feedback
            </button>
          </nav>

          {/* User */}
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
                      onClick={() => { setRoute({ view: 'profile', tourId: '' }); setShowAuthMenu(false); }}
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

          {/* ── Page title ── */}
          <h1 style={{ textAlign: 'center', marginBottom: 24 }}>Generate a report</h1>

          {/* ── Report controls card ── */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-sm)',
              padding: 24,
              marginBottom: 24,
            }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
              <select
                value={reportType}
                onChange={e => setReportType(e.target.value as ReportType)}
                style={selectStyle}
              >
                <option value="STAFF_PERFORMANCE">Staff performance</option>
                <option value="SALES">Sales</option>
              </select>

              <DateRangePicker
                start={startDate}
                end={endDate}
                onChange={(s, e) => { setStartDate(s); setEndDate(e) }}
              />

              <select
                value={reportLocation}
                onChange={e => setReportLocation(e.target.value)}
                style={{ ...selectStyle, flex: 1, minWidth: 0 }}
              >
                <option value="ALL">Select location</option>
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleGenerateReport}
                disabled={reportLoading}
                style={{
                  height: 44,
                  padding: '0 28px',
                  background: reportLoading ? 'var(--primary-hover)' : 'var(--primary)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  fontFamily: 'Nunito, sans-serif',
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: reportLoading ? 'not-allowed' : 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'background 0.15s',
                }}
              >
                {reportLoading ? 'Generating...' : 'Generate report'}
              </button>
            </div>

            {reportError && (
              <p style={{ marginTop: 10, fontSize: 13, color: 'var(--red)' }}>{reportError}</p>
            )}
          </div>

          {/* ── Report data table ── */}
          {reportResponse?.reportData && (
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow-sm)',
                padding: 24,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>Report</h2>
              </div>

              {reportGeneratedAt && (
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
                  Generated {formatDate(reportGeneratedAt)} &mdash; {reportType.replace('_', ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                  &nbsp;&middot;&nbsp; {reportResponse.reportData.rows.length} rows
                </p>
              )}

              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  minWidth: 900,
                  borderCollapse: 'collapse',
                  fontSize: 13,
                  fontFamily: 'Nunito, sans-serif',
                }}>
                  <thead>
                    <tr>
                      {reportResponse.reportData.columns.map((col, ci) => (
                        <th
                          key={ci}
                          title={col}
                          style={{
                            padding: '10px 12px',
                            textAlign: 'center',
                            fontSize: 12,
                            fontWeight: 700,
                            color: '#111827',
                            border: '1px solid #D1D5DB',
                            background: '#fff',
                            lineHeight: 1.35,
                            verticalAlign: 'middle',
                            maxWidth: 110,
                          }}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportResponse.reportData.rows.length === 0 ? (
                      <tr>
                        <td colSpan={reportResponse.reportData.columns.length} style={{ padding: '32px', textAlign: 'center', color: '#6B7280', border: '1px solid #D1D5DB' }}>
                          No data for the selected period.
                        </td>
                      </tr>
                    ) : (
                      reportResponse.reportData.rows.map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => {
                            const isEmail = typeof cell === 'string' && cell.includes('@')
                            return (
                              <td
                                key={ci}
                                style={{
                                  padding: '10px 12px',
                                  border: '1px solid #D1D5DB',
                                  color: isEmail ? '#1D6FA4' : '#111827',
                                  textDecoration: isEmail ? 'underline' : 'none',
                                  verticalAlign: 'middle',
                                  fontSize: 13,
                                  whiteSpace: isEmail ? 'nowrap' : undefined,
                                }}
                              >
                                {cell}
                              </td>
                            )
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* ── Download button below table ── */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
                <div ref={downloadMenuRef} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    onClick={() => setShowDownloadMenu(o => !o)}
                    disabled={downloadLoading}
                    style={{
                      height: 36, padding: '0 16px',
                      background: downloadLoading ? 'var(--primary-hover)' : 'var(--primary)',
                      color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)',
                      fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 700,
                      cursor: downloadLoading ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    {downloadLoading ? 'Downloading…' : 'Download'}
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points={showDownloadMenu ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
                    </svg>
                  </button>
                  {showDownloadMenu && (
                    <div style={{
                      position: 'absolute', bottom: 'calc(100% + 4px)', right: 0, zIndex: 50,
                      background: '#fff', border: '1px solid var(--border)', borderRadius: 8,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.12)', overflow: 'hidden', minWidth: 160,
                    }}>
                      {(['pdf', 'excel', 'csv'] as const).map(fmt => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => handleDownload(fmt)}
                          style={{
                            width: '100%', padding: '10px 16px', background: 'none', border: 'none',
                            cursor: 'pointer', textAlign: 'left',
                            fontFamily: 'Nunito, sans-serif', fontSize: 13, fontWeight: 600, color: '#111827',
                          }}
                          onMouseOver={e => (e.currentTarget.style.background = '#F3F8FD')}
                          onMouseOut={e => (e.currentTarget.style.background = 'none')}
                        >
                          Download {fmt.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
