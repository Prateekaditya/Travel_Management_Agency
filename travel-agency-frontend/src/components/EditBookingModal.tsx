import React, { useState, useEffect } from 'react';
import { Booking } from '../types/booking';
import { updateBooking } from '../api/bookings';
import { apiRequest } from '../api/client';

interface EditBookingModalProps {
  booking: Booking;
  onSave: (updated: Booking) => void;
  onClose: () => void;
}

interface TourDetail {
  startDates: string[];
  durations: string[];
  mealPlans: string[];
  price: Record<string, string>;
  mealSupplementsPerDay?: Record<string, string>;
  guestQuantity?: { adultsMaxValue: number; childrenMaxValue: number; totalMaxValue?: number };
}

interface PersonalRow { firstName: string; lastName: string; }

// ── helpers ──────────────────────────────────────────────────────────────────

/** "Johnson Doe (2 adults)" → { rows: [{firstName,lastName},...], adults: 2 } */
function parseGuests(guests: string): { rows: PersonalRow[]; adults: number } {
  const countMatch = guests.match(/\((\d+) adult/);
  const adults = countMatch ? parseInt(countMatch[1], 10) : 1;
  const namePart = guests.replace(/\s*\([^)]*\)/, '').trim();
  const parts = namePart.split(' ');
  const firstName = parts[0] ?? '';
  const lastName = parts.slice(1).join(' ') || '';
  return {
    rows: [{ firstName, lastName }, ...Array.from({ length: Math.max(0, adults - 1) }, () => ({ firstName: '', lastName: '' }))],
    adults,
  };
}

/** "Jan 15, 2025 (7 days)" → { isoDate: '2025-01-15', duration: '7 days' } */
function parseDateStr(dateStr: string): { isoDate: string; duration: string } {
  const match = dateStr.match(/^(.*?)\s*\(([^)]+)\)/);
  const rawDate = match ? match[1].trim() : dateStr;
  const duration = match ? match[2].trim() : '';
  const parsed = new Date(rawDate);
  const isoDate = isNaN(parsed.getTime()) ? '' : parsed.toISOString().split('T')[0];
  return { isoDate, duration };
}

/** Format ISO date for display: "2025-01-15" → "Jan 15, 2025" */
function fmtDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Extract meal code from label: "Breakfast (BB)" → "BB" */
function mealCode(label: string): string {
  const m = label.match(/\(([^)]+)\)/);
  return m ? m[1].trim() : label;
}

// SVG icons
const CalendarIcon = () => (
  <svg className="w-5 h-5 text-gray-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);
const GuestIcon = () => (
  <svg className="w-5 h-5 text-gray-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" /><path strokeLinecap="round" strokeLinejoin="round" d="M23 21v-2a4 4 0 0 0-3-3.87" /><path strokeLinecap="round" strokeLinejoin="round" d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);
const MealIcon = () => (
  <svg className="w-5 h-5 text-gray-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path strokeLinecap="round" strokeLinejoin="round" d="M7 2v20" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" />
  </svg>
);
const ChevronDown = () => (
  <svg className="w-4 h-4 text-gray-500 pointer-events-none flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const EditBookingModal: React.FC<EditBookingModalProps> = ({ booking, onSave, onClose }) => {
  const { rows: initRows, adults: initAdults } = parseGuests(booking.tourDetails.guests);
  const { isoDate: initDate, duration: initDuration } = parseDateStr(booking.tourDetails.date);

  const [rows, setRows] = useState<PersonalRow[]>(initRows);
  const [adults, setAdults] = useState(initAdults);
  const [children, setChildren] = useState(0);
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState(`${initDate}|${initDuration}`);
  const [mealPlan, setMealPlan] = useState(booking.tourDetails.mealPlan);
  const [mealOpen, setMealOpen] = useState(false);
  const [tourDetail, setTourDetail] = useState<TourDetail | null>(null);
  const [loadingTour, setLoadingTour] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch tour details to populate date/duration dropdown and price map
  useEffect(() => {
    if (!booking.tourId) return;
    setLoadingTour(true);
    apiRequest<any>(`/tours/${booking.tourId}`)
      .then(t => {
        setTourDetail({
          startDates: t.startDates ?? [],
          durations: t.durations ?? [],
          mealPlans: t.mealPlans ?? [],
          price: t.price ?? {},
          mealSupplementsPerDay: t.mealSupplementsPerDay ?? {},
          guestQuantity: t.guestQuantity,
        });
      })
      .catch(() => { /* silently fall back to parsed data */ })
      .finally(() => setLoadingTour(false));
  }, [booking.tourId]);

  // Date × duration options
  const dateDurOptions: { key: string; label: string; isoDate: string; duration: string }[] =
    tourDetail
      ? tourDetail.startDates.flatMap(sd =>
          tourDetail.durations.map(dur => ({
            key: `${sd}|${dur}`,
            label: `${fmtDate(sd)}, ${dur}`,
            isoDate: sd,
            duration: dur,
          }))
        )
      : initDate
        ? [{ key: `${initDate}|${initDuration}`, label: `${fmtDate(initDate)}, ${initDuration}`, isoDate: initDate, duration: initDuration }]
        : [];

  const mealOptions = tourDetail?.mealPlans.length
    ? tourDetail.mealPlans
    : ['Breakfast (BB)', 'Half-board (HB)', 'Full-board (FB)', 'All inclusive (AI)'];

  const maxAdults   = tourDetail?.guestQuantity?.adultsMaxValue   ?? 8;
  const maxChildren  = tourDetail?.guestQuantity?.childrenMaxValue  ?? 4;
  const totalMax     = tourDetail?.guestQuantity?.totalMaxValue     ?? maxAdults + maxChildren;
  const totalGuests  = adults + children;

  // Guest label for stepper button
  const guestLabel = `${adults} adult${adults !== 1 ? 's' : ''}${children > 0 ? `, ${children} child${children !== 1 ? 'ren' : ''}` : ''}`;

  // Live price calc
  const selectedOpt = dateDurOptions.find(o => o.key === selectedKey) ?? dateDurOptions[0];
  const priceMap = tourDetail?.price ?? {};
  const currentMealCode = mealCode(mealPlan);
  const adultPriceRaw = Object.entries(priceMap).find(([k]) => !k.toLowerCase().includes('child'))?.[1] ?? Object.values(priceMap)[0] ?? null;
  const childPriceRaw = priceMap['child'] ?? priceMap['Child'] ?? priceMap['CHILD'] ?? adultPriceRaw;
  const adultPrice = adultPriceRaw ? parseFloat(String(adultPriceRaw).replace(/[^0-9.]/g, '')) : 0;
  const childPrice = childPriceRaw ? parseFloat(String(childPriceRaw).replace(/[^0-9.]/g, '')) : adultPrice;
  const durDays = selectedOpt ? parseInt(String(selectedOpt.duration).replace(/[^0-9]/g, '')) || 1 : 1;
  const suppPerDay = (tourDetail?.mealSupplementsPerDay ?? {})[currentMealCode];
  const suppNum = suppPerDay ? parseFloat(String(suppPerDay).replace(/[^0-9.]/g, '')) : 0;
  const calcTotal = adultPrice > 0
    ? adultPrice * adults + childPrice * children + suppNum * durDays * totalGuests
    : 0;
  const totalPrice = calcTotal > 0 ? `$${Math.round(calcTotal).toLocaleString()}` : booking.tourDetails.totalPrice;

  const handleAdultsChange = (n: number) => {
    const newAdults = Math.max(1, Math.min(n, maxAdults));
    setAdults(newAdults);
    setRows(prev => {
      const total = newAdults + children;
      const updated = [...prev];
      while (updated.length < total) updated.push({ firstName: '', lastName: '' });
      while (updated.length > total) updated.pop();
      return updated;
    });
  };

  const handleChildrenChange = (n: number) => {
    const newChildren = Math.max(0, Math.min(n, maxChildren));
    setChildren(newChildren);
    setRows(prev => {
      const total = adults + newChildren;
      const updated = [...prev];
      while (updated.length < total) updated.push({ firstName: '', lastName: '' });
      while (updated.length > total) updated.pop();
      return updated;
    });
  };

  const updateRow = (i: number, field: 'firstName' | 'lastName', val: string) => {
    setRows(prev => { const r = [...prev]; r[i] = { ...r[i], [field]: val }; return r; });
  };

  const handleSave = async () => {
    const opt = dateDurOptions.find(o => o.key === selectedKey) ?? dateDurOptions[0];
    if (!opt) return;
    const hasEmpty = rows.some(r => !r.firstName.trim() || !r.lastName.trim());
    if (hasEmpty) { setError('Please fill in all first and last names.'); return; }

    setIsSubmitting(true);
    setError(null);
    try {
      const updated = await updateBooking(booking.id, {
        date: opt.isoDate,
        duration: opt.duration,
        mealPlan: mealCode(mealPlan),
        guests: { adult: adults, children },
        personalDetails: rows,
      });
      onSave(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="relative bg-white shadow-xl flex flex-col"
        style={{ width: 544, maxWidth: 'calc(100vw - 32px)', maxHeight: '90vh', borderRadius: 12, overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between flex-shrink-0" style={{ padding: '24px 24px 0' }}>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">{booking.name}</h2>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{booking.destination}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors mt-1" aria-label="Close">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto flex flex-col" style={{ padding: '24px', gap: 24 }}>

          {/* Personal details — one row per adult/child */}
          <div className="flex flex-col" style={{ gap: 16 }}>
            {rows.map((row, i) => {
              const isChild = i >= adults;
              const label = isChild
                ? `Personal details (Child ${i - adults + 1})`
                : adults + children > 1
                  ? `Personal details (Adult ${i + 1})`
                  : 'Personal details';
              return (
                <div key={i}>
                  <h3 className="text-base font-bold text-gray-900 mb-3">{label}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-1">First name</label>
                      <input
                        type="text"
                        value={row.firstName}
                        onChange={e => updateRow(i, 'firstName', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 outline-none focus:border-[#027EAC] focus:ring-1 focus:ring-[#027EAC]"
                      />
                      <p className="text-xs text-gray-400 mt-1">e.g. Johnson</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-800 mb-1">Last name</label>
                      <input
                        type="text"
                        value={row.lastName}
                        onChange={e => updateRow(i, 'lastName', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-gray-800 outline-none focus:border-[#027EAC] focus:ring-1 focus:ring-[#027EAC]"
                      />
                      <p className="text-xs text-gray-400 mt-1">e.g. Doe</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tour details */}
          <div className="flex flex-col" style={{ gap: 8 }}>
            <h3 className="text-base font-bold text-gray-900">Tour details</h3>

            {/* Date + Duration dropdown */}
            <div className="flex items-center border border-gray-300 rounded-lg px-4 py-3">
              <CalendarIcon />
              <select
                value={selectedKey}
                onChange={e => setSelectedKey(e.target.value)}
                disabled={loadingTour}
                className="flex-1 appearance-none bg-transparent outline-none text-gray-800 cursor-pointer text-sm"
              >
                {dateDurOptions.map(o => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
              <ChevronDown />
            </div>

            {/* Guests — stepper */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setGuestsOpen(o => !o)}
                className="w-full flex items-center border border-gray-300 rounded-lg px-4 py-3 text-left focus:outline-none"
                style={{ borderColor: guestsOpen ? '#1a6b8c' : undefined, borderWidth: guestsOpen ? 2 : 1 }}
              >
                <GuestIcon />
                <span className="flex-1 text-gray-800 text-sm">{guestLabel}</span>
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
                      <button type="button" onClick={() => handleAdultsChange(adults - 1)} disabled={adults <= 1}
                        className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-[#1a6b8c] hover:text-[#1a6b8c] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
                      </button>
                      <span className="w-6 text-center font-semibold text-gray-800">{adults}</span>
                      <button type="button" onClick={() => handleAdultsChange(adults + 1)} disabled={adults >= maxAdults || totalGuests >= totalMax}
                        className="w-8 h-8 rounded-full border-2 border-[#1a6b8c] flex items-center justify-center text-[#1a6b8c] hover:bg-[#E7F9FF] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                        <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 12h16" /></svg>
                      </button>
                    </div>
                  </div>
                  {/* Children row */}
                  {maxChildren > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800">Children</span>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => handleChildrenChange(children - 1)} disabled={children <= 0}
                          className="w-8 h-8 rounded-full border-2 border-gray-300 flex items-center justify-center text-gray-600 hover:border-[#1a6b8c] hover:text-[#1a6b8c] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>
                        </button>
                        <span className="w-6 text-center font-semibold text-gray-800">{children}</span>
                        <button type="button" onClick={() => handleChildrenChange(children + 1)} disabled={children >= maxChildren || totalGuests >= totalMax}
                          className="w-8 h-8 rounded-full border-2 border-[#1a6b8c] flex items-center justify-center text-[#1a6b8c] hover:bg-[#E7F9FF] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16M4 12h16" /></svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Meal plan */}
            <div className="flex items-center border border-gray-300 rounded-lg px-4 py-3">
              <MealIcon />
              <select
                value={mealPlan}
                onChange={e => setMealPlan(e.target.value)}
                className="flex-1 appearance-none bg-transparent outline-none text-gray-800 cursor-pointer text-sm"
              >
                {mealOptions.map(plan => (
                  <option key={plan} value={plan}>{plan}</option>
                ))}
              </select>
              <ChevronDown />
            </div>
          </div>
        </div>

        {/* ── Footer (fixed) ── */}
        <div className="flex flex-col flex-shrink-0" style={{ gap: 12, padding: '0 24px 24px' }}>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <p className="text-right text-gray-800 font-semibold text-sm">
            Total price: <strong>{totalPrice}</strong>
          </p>
          <button
            onClick={handleSave}
            disabled={isSubmitting}
            className="w-full py-3 rounded-lg font-semibold text-base text-white transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#027EAC' }}
          >
            {isSubmitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditBookingModal;
