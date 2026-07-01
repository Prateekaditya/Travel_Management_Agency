import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import { createBooking } from '../api/bookings';
import { setAuthToken as setClientToken } from '../api/client';

export interface TourInfo {
  id: string;
  name: string;
  destination: string;
  rating: number;
  startDates: string[];
  durations: string[];
  mealPlans: string[];
  price: Record<string, string>;
  mealSupplementsPerDay: Record<string, string>;
  guestQuantity: {
    adultsMaxValue: number;
    childrenMaxValue: number;
  };
}

interface PersonalDetail {
  firstName: string;
  lastName: string;
}

interface ReservationFormModalProps {
  tour: TourInfo;
  userId: string;
  token: string;
  initialAdults?: number;
  mockApi?: boolean;
  onClose: () => void;
  onSuccess: (freeCancelation: string, details: string, meta: { tourName: string; date: string; duration: string; meal: string; guests: string }) => void;
}

function formatShortDate(isoDate: string): string {
  const date = new Date(isoDate + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function extractMealCode(mealLabel: string): string {
  const match = mealLabel.match(/\(([^)]+)\)/);
  return match ? match[1] : mealLabel;
}

const ReservationFormModal: React.FC<ReservationFormModalProps> = ({
  tour,
  userId,
  token,
  initialAdults = 1,
  mockApi = false,
  onClose,
  onSuccess,
}) => {
  const defaultOption =
    tour.startDates.length > 0 && tour.durations.length > 0
      ? JSON.stringify({ date: tour.startDates[0], duration: tour.durations[0] })
      : '';

  const [selectedDateDuration, setSelectedDateDuration] = useState(defaultOption);
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(0);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [selectedMealPlan, setSelectedMealPlan] = useState(tour.mealPlans[0] || '');
  const [personalDetails, setPersonalDetails] = useState<PersonalDetail[]>(
    Array.from({ length: initialAdults }, () => ({ firstName: '', lastName: '' }))
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const nameRegex = /^[a-zA-Z\s'\-]+$/;

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    personalDetails.forEach((d, i) => {
      const fn = d.firstName.trim();
      const ln = d.lastName.trim();
      if (!fn) errors[`firstName_${i}`] = 'First name is required.';
      else if (!nameRegex.test(fn)) errors[`firstName_${i}`] = 'Only letters, hyphens, and apostrophes are allowed.';
      else if (fn.length < 2) errors[`firstName_${i}`] = 'First name must be at least 2 characters.';
      else if (fn.length > 50) errors[`firstName_${i}`] = 'First name must be up to 50 characters.';

      if (!ln) errors[`lastName_${i}`] = 'Last name is required.';
      else if (!nameRegex.test(ln)) errors[`lastName_${i}`] = 'Only letters, hyphens, and apostrophes are allowed.';
      else if (ln.length < 2) errors[`lastName_${i}`] = 'Last name must be at least 2 characters.';
      else if (ln.length > 50) errors[`lastName_${i}`] = 'Last name must be up to 50 characters.';
    });
    if (!selectedMealPlan) errors['mealPlan'] = 'Please select a meal plan.';
    if (!selectedDateDuration) errors['date'] = 'Please select a date and duration.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAdultsChange = (newCount: number) => {
    setAdults(newCount);
    setPersonalDetails(prev => {
      const total = newCount + children;
      const updated = [...prev];
      while (updated.length < total) updated.push({ firstName: '', lastName: '' });
      while (updated.length > total) updated.pop();
      return updated;
    });
  };

  const handleChildrenChange = (newCount: number) => {
    setChildren(newCount);
    setPersonalDetails(prev => {
      const total = adults + newCount;
      const updated = [...prev];
      while (updated.length < total) updated.push({ firstName: '', lastName: '' });
      while (updated.length > total) updated.pop();
      return updated;
    });
  };

  const updatePersonalDetail = (
    index: number,
    field: 'firstName' | 'lastName',
    value: string
  ) => {
    setPersonalDetails(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const getSelectedPrice = (): string => {
    if (!selectedDateDuration) return '';
    try {
      const { duration } = JSON.parse(selectedDateDuration);
      const priceEntries = tour.price;

      // 1. Base adult price for the selected duration
      let raw = priceEntries[duration] || '';
      if (!raw) {
        // Fall back to first non-child numeric value
        raw = Object.entries(priceEntries)
          .filter(([k]) => !k.toLowerCase().includes('child'))
          .map(([, v]) => v)
          .find(v => v && String(v).replace(/[^0-9.]/g, '')) || '';
      }
      if (!raw) return '';
      const adultPrice = parseFloat(String(raw).replace(/[^0-9.]/g, ''));
      if (isNaN(adultPrice)) return raw;

      // 2. Child price: use 'child' key if present, else same as adult
      const childRaw = priceEntries['child'] || priceEntries['Child'] || '';
      const childPrice = childRaw
        ? parseFloat(String(childRaw).replace(/[^0-9.]/g, ''))
        : adultPrice;

      // 3. Meal supplement: mealSupplementsPerDay[code] * durationDays * totalGuests
      const mealCode = extractMealCode(selectedMealPlan);
      const suppRaw = tour.mealSupplementsPerDay?.[mealCode] || '';
      const suppPerDay = suppRaw ? parseFloat(String(suppRaw).replace(/[^0-9.]/g, '')) : 0;
      const durationDays = parseInt(duration) || 0;   // "7 days" → 7
      const totalGuests = adults + children;
      const mealSupplement = isNaN(suppPerDay) ? 0 : suppPerDay * durationDays * totalGuests;

      const total = adultPrice * adults
        + (isNaN(childPrice) ? adultPrice : childPrice) * children
        + mealSupplement;
      return `$${total.toLocaleString()}`;
    } catch {
      return '';
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const { date, duration } = JSON.parse(selectedDateDuration);
      const mealCode = extractMealCode(selectedMealPlan);
      const guestLabel = `${adults} adult${adults > 1 ? 's' : ''}${children > 0 ? `, ${children} child${children > 1 ? 'ren' : ''}` : ''}`;
      const startFormatted = new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
      });
      const meta = { tourName: tour.name, date: startFormatted, duration, meal: selectedMealPlan, guests: guestLabel };

      if (mockApi) {
        // Demo mode: skip real API, return mock confirmation
        const cancelDate = new Date(date + 'T00:00:00');
        cancelDate.setDate(cancelDate.getDate() - 10);
        const freeCancelation = cancelDate.toISOString().split('T')[0];
        const details = `You have booked a tour at ${tour.name}, starting date ${startFormatted} (${duration}), ${selectedMealPlan} for ${guestLabel} successfully. Please upload your travel documents to the booking on the "My Tours" page and wait for the Travel Agent to contact you.`;
        onSuccess(freeCancelation, details, meta);
        return;
      }

      // Ensure the global client has the current session token
      setClientToken(token || null);
      const data = await createBooking({
        userId,
        tourId: tour.id,
        date,
        duration,
        mealPlan: mealCode,
        guests: { adult: adults, children },
        personalDetails,
      });
      onSuccess(data.freeCancelation, data.details, meta);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // All date × duration combinations
  const dateDurationOptions: { value: string; label: string }[] = [];
  for (const date of tour.startDates) {
    for (const duration of tour.durations) {
      dateDurationOptions.push({
        value: JSON.stringify({ date, duration }),
        label: `${formatShortDate(date)}, ${duration}`,
      });
    }
  }

  const totalGuests = adults + children;
  const maxAdults = tour.guestQuantity.adultsMaxValue || 10;
  const maxChildren = tour.guestQuantity.childrenMaxValue ?? 0;
  const totalMax = maxAdults + maxChildren;

  const guestLabel = adults > 0 || children > 0
    ? `${adults} adult${adults !== 1 ? 's' : ''}${children > 0 ? `, ${children} child${children !== 1 ? 'ren' : ''}` : ''}`
    : 'Select guests';

  // Suppress unused variable warning — userId is passed to the API body
  void userId;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/40"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      {/* Modal panel */}
      <div
        className="relative bg-white shadow-xl flex flex-col"
        style={{ width: 544, maxWidth: 'calc(100vw - 32px)', maxHeight: '90vh', borderRadius: 12, overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header (fixed, never scrolls) ── */}
        <div className="flex items-start justify-between flex-shrink-0" style={{ padding: '24px 24px 0' }}>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">{tour.name}</h2>
              <span className="flex items-center gap-1 text-[#0B3857] font-semibold text-sm">
                <svg className="w-4 h-4 fill-[#0B3857]" viewBox="0 0 24 24">
                  <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
                {tour.rating.toFixed(1).replace('.', ',')}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{tour.destination}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors mt-1"
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

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto flex flex-col" style={{ padding: '20px 24px', gap: 20 }}>

          {/* ── Personal details ── */}
          <div className="flex flex-col" style={{ gap: 16 }}>
            {personalDetails.map((detail, index) => {
              const isChild = index >= adults;
              const guestLabel = (() => {
                if (adults + children === 1) return 'Personal details';
                if (isChild) return `Personal details (Child ${index - adults + 1})`;
                return adults > 1 ? `Personal details (Adult ${index + 1})` : 'Personal details';
              })();
              return (
              <div key={index}>
                <h3 className="text-base font-bold text-gray-900 mb-3">
                  {guestLabel}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      First name
                    </label>
                    <input
                      type="text"
                      value={detail.firstName}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^[a-zA-Z\s'\-]*$/.test(val)) {
                          updatePersonalDetail(index, 'firstName', val);
                        }
                        setFieldErrors(prev => { const n = { ...prev }; delete n[`firstName_${index}`]; return n; });
                      }}
                      className={`w-full border rounded-lg px-3 py-2.5 text-gray-800 outline-none focus:ring-1 ${
                        fieldErrors[`firstName_${index}`]
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:border-[#1a6b8c] focus:ring-[#1a6b8c]'
                      }`}
                    />
                    {fieldErrors[`firstName_${index}`]
                      ? <p className="text-xs text-red-500 mt-1">{fieldErrors[`firstName_${index}`]}</p>
                      : <p className="text-xs text-gray-400 mt-1">e.g. Johnson</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-800 mb-1">
                      Last name
                    </label>
                    <input
                      type="text"
                      value={detail.lastName}
                      onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^[a-zA-Z\s'\-]*$/.test(val)) {
                          updatePersonalDetail(index, 'lastName', val);
                        }
                        setFieldErrors(prev => { const n = { ...prev }; delete n[`lastName_${index}`]; return n; });
                      }}
                      className={`w-full border rounded-lg px-3 py-2.5 text-gray-800 outline-none focus:ring-1 ${
                        fieldErrors[`lastName_${index}`]
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : 'border-gray-300 focus:border-[#1a6b8c] focus:ring-[#1a6b8c]'
                      }`}
                    />
                    {fieldErrors[`lastName_${index}`]
                      ? <p className="text-xs text-red-500 mt-1">{fieldErrors[`lastName_${index}`]}</p>
                      : <p className="text-xs text-gray-400 mt-1">e.g. Doe</p>}
                  </div>
                </div>
              </div>
              );
            })}
          </div>

          {/* ── Tour details ── */}
          <div className="flex flex-col" style={{ gap: 8 }}>
            <h3 className="text-base font-bold text-gray-900">Tour details</h3>

            {/* Date + Duration */}
            <div className="flex items-center border border-gray-300 rounded-lg px-4 py-3">
              <svg
                className="w-5 h-5 text-gray-500 mr-3 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <select
                value={selectedDateDuration}
                onChange={e => setSelectedDateDuration(e.target.value)}
                className="flex-1 appearance-none bg-transparent outline-none text-gray-800 cursor-pointer"
              >
                {dateDurationOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <svg
                className="w-4 h-4 text-gray-500 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Guests — stepper */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setGuestsOpen(o => !o)}
                className="w-full flex items-center border border-gray-300 rounded-lg px-4 py-3 text-left focus:outline-none"
                style={{ borderColor: guestsOpen ? '#1a6b8c' : undefined, borderWidth: guestsOpen ? 2 : 1 }}
              >
                <svg className="w-5 h-5 text-gray-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <span className="flex-1 text-gray-800">{guestLabel}</span>
                <svg className={`w-4 h-4 text-gray-500 transition-transform ${guestsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {guestsOpen && (
                <div className="absolute left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 mt-1 p-4 flex flex-col gap-4">
                  {/* Adults row */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800">Adults</span>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleAdultsChange(Math.max(1, adults - 1))}
                        disabled={adults <= 1}
                        className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-[#1a6b8c] hover:text-[#1a6b8c] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
                      </button>
                      <span className="w-6 text-center font-semibold text-gray-800">{adults}</span>
                      <button
                        type="button"
                        onClick={() => handleAdultsChange(Math.min(maxAdults, adults + 1))}
                        disabled={adults >= maxAdults || totalGuests >= totalMax}
                        className="w-8 h-8 rounded-full border-2 border-[#1a6b8c] flex items-center justify-center text-[#1a6b8c] hover:bg-[#E7F9FF] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 12h16" /></svg>
                      </button>
                    </div>
                  </div>

                  {/* Children row — only shown if childrenMaxValue > 0 */}
                  {maxChildren > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800">Children</span>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => handleChildrenChange(Math.max(0, children - 1))}
                          disabled={children <= 0}
                          className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-[#1a6b8c] hover:text-[#1a6b8c] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
                        </button>
                        <span className="w-6 text-center font-semibold text-gray-800">{children}</span>
                        <button
                          type="button"
                          onClick={() => handleChildrenChange(Math.min(maxChildren, children + 1))}
                          disabled={children >= maxChildren || totalGuests >= totalMax}
                          className="w-8 h-8 rounded-full border-2 border-[#1a6b8c] flex items-center justify-center text-[#1a6b8c] hover:bg-[#E7F9FF] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 12h16" /></svg>
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => setGuestsOpen(false)}
                    className="mt-1 w-full py-2 rounded-lg bg-[#1a6b8c] text-white text-sm font-semibold hover:bg-[#155a77] transition-colors"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>

            {/* Meal plan */}
            <div className="flex items-center border border-gray-300 rounded-lg px-4 py-3">
              <svg
                className="w-5 h-5 text-gray-500 mr-3 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 2v20" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
              </svg>
              <select
                value={selectedMealPlan}
                onChange={e => {
                  setSelectedMealPlan(e.target.value);
                  setFieldErrors(prev => { const n = { ...prev }; delete n['mealPlan']; return n; });
                }}
                className={`flex-1 appearance-none bg-transparent outline-none cursor-pointer ${
                  fieldErrors['mealPlan'] ? 'text-red-500' : 'text-gray-800'
                }`}
              >
                <option value="" disabled>Select meal plan</option>
                {tour.mealPlans.map(plan => (
                  <option key={plan} value={plan}>
                    {plan}
                  </option>
                ))}
              </select>
              <svg
                className="w-4 h-4 text-gray-500 pointer-events-none"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

        </div>{/* end scrollable body */}

        {/* ── Total price + Book button (fixed footer) ── */}
        <div className="flex flex-col flex-shrink-0" style={{ gap: 12, padding: '0 24px 24px' }}>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          {fieldErrors['mealPlan'] && <p className="text-red-500 text-xs -mt-2">{fieldErrors['mealPlan']}</p>}
          <p className="text-right text-gray-800 font-semibold">
            Total price:&nbsp;<span className="font-bold">{getSelectedPrice()}</span>
          </p>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-3 rounded-lg bg-[#1a6b8c] text-white font-semibold text-base hover:bg-[#155a77] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Booking…' : 'Book the tour'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ReservationFormModal;
