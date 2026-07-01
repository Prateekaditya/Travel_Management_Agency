import { useState } from 'react'
import type { Tour, DateDurationOption } from '../types'
import CustomSelect from './CustomSelect'

const CalendarIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)
const UsersIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const UtensilsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
    <path d="M7 2v20" />
    <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
  </svg>
)

interface BookingSidebarProps {
  tour: Tour | null
  loading: boolean
  selectedDate: string
  selectedDuration: string
  selectedMealPlan: string
  selectedAdults: number
  selectedChildren: number
  dateDurationOptions: DateDurationOption[]
  totalPrice: string
  onDateDurationChange: (date: string, duration: string) => void
  onAdultsChange: (count: number) => void
  onChildrenChange: (count: number) => void
  onMealPlanChange: (meal: string) => void
  onBook: () => void
  isBooking: boolean
  isLoggedIn: boolean
  bookingMessage: string
  bookingError: string
}

export default function BookingSidebar({
  tour,
  loading,
  selectedDate,
  selectedDuration,
  selectedMealPlan,
  selectedAdults,
  selectedChildren,
  dateDurationOptions,
  totalPrice,
  onDateDurationChange,
  onAdultsChange,
  onChildrenChange,
  onMealPlanChange,
  onBook,
  isBooking,
  isLoggedIn,
  bookingMessage,
  bookingError,
}: BookingSidebarProps) {
  const [guestsOpen, setGuestsOpen] = useState(false)
  const [closeDateDur, setCloseDateDur] = useState(false)
  const [closeMeal, setCloseMeal] = useState(false)
  const isDisabled = !tour || loading

  const openGuests = () => {
    setCloseDateDur(true)
    setCloseMeal(true)
    setTimeout(() => { setCloseDateDur(false); setCloseMeal(false) }, 50)
    setGuestsOpen(true)
  }

  const openDateDur = () => {
    setGuestsOpen(false)
    setCloseMeal(true)
    setTimeout(() => setCloseMeal(false), 50)
  }

  const openMeal = () => {
    setGuestsOpen(false)
    setCloseDateDur(true)
    setTimeout(() => setCloseDateDur(false), 50)
  }

  const maxAdults = tour?.guestQuantity?.adultsMaxValue || 10
  const maxChildren = tour?.guestQuantity?.childrenMaxValue ?? 0
  const totalMax = tour?.guestQuantity?.totalMaxVelue ?? (maxAdults + maxChildren)
  const totalGuests = selectedAdults + selectedChildren

  const guestLabel = `${selectedAdults} adult${selectedAdults !== 1 ? 's' : ''}${selectedChildren > 0 ? `, ${selectedChildren} child${selectedChildren !== 1 ? 'ren' : ''}` : ''}`

  const mealOptions = (tour?.mealPlans || []).map(meal => ({ value: meal, label: meal }))
  const dateDurOpts = dateDurationOptions.map(o => ({ value: o.key, label: o.label }))

  return (
    <aside className="booking-card">
      <div className="input-wrap">
        <span className="field-icon"><CalendarIcon /></span>
        <CustomSelect
          value={`${selectedDate}|${selectedDuration}`}
          onChange={(val) => {
            const [date, duration] = val.split('|')
            onDateDurationChange(date, duration)
          }}
          options={dateDurOpts}
          placeholder="Select date & duration"
          disabled={isDisabled}
          onOpen={openDateDur}
          forceClose={closeDateDur}
        />
      </div>

      <div className="input-wrap" style={guestsOpen ? { zIndex: 500, position: 'relative' } : {}}>
        <span className="field-icon"><UsersIcon /></span>
        {/* Guests stepper dropdown */}
        <div style={{ flex: 1, position: 'relative' }}>
          <button
            type="button"
            disabled={isDisabled}
            onClick={() => guestsOpen ? setGuestsOpen(false) : openGuests()}
            style={{ width: '100%', background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: isDisabled ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <span style={{ color: isDisabled ? '#aaa' : '#0B3857' }}>{guestLabel}</span>
            <svg style={{ width: 16, height: 16, transform: guestsOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', color: '#6b7280' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {guestsOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: -40, right: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 8px 32px rgba(13,53,83,0.14)', zIndex: 500, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Adults row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#1f2937' }}>Adults</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button
                    type="button"
                    onClick={() => onAdultsChange(Math.max(1, selectedAdults - 1))}
                    disabled={selectedAdults <= 1}
                    style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #d1d5db', background: 'none', cursor: selectedAdults <= 1 ? 'not-allowed' : 'pointer', opacity: selectedAdults <= 1 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5563' }}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
                  </button>
                  <span style={{ width: 24, textAlign: 'center', fontWeight: 600, color: '#1f2937' }}>{selectedAdults}</span>
                  <button
                    type="button"
                    onClick={() => onAdultsChange(Math.min(maxAdults, selectedAdults + 1))}
                    disabled={selectedAdults >= maxAdults || totalGuests >= totalMax}
                    style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #1a6b8c', background: 'none', cursor: (selectedAdults >= maxAdults || totalGuests >= totalMax) ? 'not-allowed' : 'pointer', opacity: (selectedAdults >= maxAdults || totalGuests >= totalMax) ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a6b8c' }}
                  >
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 12h16" /></svg>
                  </button>
                </div>
              </div>

              {/* Children row — only shown if childrenMaxValue > 0 */}
              {maxChildren > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#1f2937' }}>Children</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                      type="button"
                      onClick={() => onChildrenChange(Math.max(0, selectedChildren - 1))}
                      disabled={selectedChildren <= 0}
                      style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #d1d5db', background: 'none', cursor: selectedChildren <= 0 ? 'not-allowed' : 'pointer', opacity: selectedChildren <= 0 ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5563' }}
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
                    </button>
                    <span style={{ width: 24, textAlign: 'center', fontWeight: 600, color: '#1f2937' }}>{selectedChildren}</span>
                    <button
                      type="button"
                      onClick={() => onChildrenChange(Math.min(maxChildren, selectedChildren + 1))}
                      disabled={selectedChildren >= maxChildren || totalGuests >= totalMax}
                      style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #1a6b8c', background: 'none', cursor: (selectedChildren >= maxChildren || totalGuests >= totalMax) ? 'not-allowed' : 'pointer', opacity: (selectedChildren >= maxChildren || totalGuests >= totalMax) ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a6b8c' }}
                    >
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 12h16" /></svg>
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setGuestsOpen(false)}
                style={{ width: '100%', padding: '8px 0', borderRadius: 8, background: '#1a6b8c', color: '#fff', fontWeight: 600, fontSize: 14, border: 'none', cursor: 'pointer' }}
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="input-wrap">
        <span className="field-icon"><UtensilsIcon /></span>
        <CustomSelect
          value={selectedMealPlan}
          onChange={onMealPlanChange}
          options={mealOptions}
          placeholder="Meal plan"
          disabled={isDisabled}
          onOpen={openMeal}
          forceClose={closeMeal}
        />
      </div>

      <div className="price-row">
        <span>Total price:</span>
        <strong>{totalPrice}</strong>
      </div>

      <button
        type="button"
        disabled={!tour || loading || isBooking}
        onClick={onBook}
        className="primary-btn"
        style={{ padding: '14px', fontSize: '15px' }}
      >
        {isBooking ? 'Booking...' : 'Book the tour'}
      </button>
      {bookingMessage && (
        <p className="status-ok" aria-live="polite" style={{ fontSize: '14px', textAlign: 'center', marginTop: '4px' }}>
          {bookingMessage}
        </p>
      )}
      {bookingError && (
        <p className="status-error" aria-live="polite" style={{ marginTop: '4px' }}>
          {bookingError}
        </p>
      )}
    </aside>
  )
}
