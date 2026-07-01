import React, { useState, useEffect } from 'react';
import { BookingState } from '../types/booking';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import { agentEditBooking } from '../api/bookings';

function formatGuestLabel(name: string): string {
  return name
    .replace(/child\(ren\)/gi, 'children')
    .replace(/\b1 children\b/gi, '1 child');
}

function buildChangeSummary(originalBooking: TravelAgentBooking, updatedBooking: TravelAgentBooking): string[] {
  const changes: string[] = [];

  if (originalBooking.tourDetails.guests !== updatedBooking.tourDetails.guests) {
    changes.push(`Number of tourists: ${originalBooking.tourDetails.guests} → ${updatedBooking.tourDetails.guests}.`);
  }

  if (originalBooking.tourDetails.mealPlan !== updatedBooking.tourDetails.mealPlan) {
    changes.push(`Meal plan: ${originalBooking.tourDetails.mealPlan} → ${updatedBooking.tourDetails.mealPlan}.`);
  }

  if (originalBooking.tourDetails.date !== updatedBooking.tourDetails.date) {
    changes.push(`Start date: ${originalBooking.tourDetails.date} → ${updatedBooking.tourDetails.date}.`);
  }

  return changes.length > 0 ? changes : ['Booking details were updated.'];
}

function parseDateSelection(dateLabel: string): { date: string; duration: string } {
  const parenthesized = dateLabel.match(/^(.*?)\s*\(([^)]+)\)$/);
  const commaSeparated = dateLabel.match(/^(.*?),\s*(.+)$/);
  const match = parenthesized ?? commaSeparated;

  if (!match) {
    return { date: dateLabel, duration: '' };
  }

  const rawDate = match[1].trim();
  const duration = match[2].trim();
  const parsed = new Date(rawDate);
  let date: string;
  if (Number.isNaN(parsed.getTime())) {
    date = rawDate;
  } else {
    // Use local date parts to avoid UTC timezone shift (toISOString converts to UTC)
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    date = `${y}-${m}-${d}`;
  }
  return { date, duration };
}

function parseMealCode(mealPlan: string): string {
  const match = mealPlan.match(/\(([^)]+)\)/);
  return (match ? match[1] : mealPlan).trim();
}

function parseGuestCounts(guestLabel: string): { adult: number; children: number } {
  const adultMatch = guestLabel.match(/(\d+)\s+adult/);
  const childMatch = guestLabel.match(/(\d+)\s+child/);
  return {
    adult: adultMatch ? parseInt(adultMatch[1], 10) : 1,
    children: childMatch ? parseInt(childMatch[1], 10) : 0,
  };
}

interface TourDetail {
  startDates: string[];
  durations: string[];
  mealPlans: string[];
  price?: Record<string, string>;
  mealSupplementsPerDay?: Record<string, string>;
  guestQuantity?: { adultsMaxValue: number; childrenMaxValue: number; totalMaxValue?: number };
}

interface BookingDocumentItem {
  id: string;
  fileName: string;
  fileType?: string;
  uploadedAt?: string;
  /** Backend returns this field name from the pre-signed S3 URL */
  fileUrl?: string;
  /** Legacy aliases — kept for compatibility */
  url?: string;
  documentUrl?: string;
}

interface GuestDocumentGroup {
  userName: string;
  documents: BookingDocumentItem[];
}

function mealCode(label: string): string {
  const match = label.match(/\(([^)]+)\)/);
  return (match ? match[1] : label).trim();
}

function formatGuests(adults: number, children: number): string {
  return `${adults} adult${adults !== 1 ? 's' : ''}${children > 0 ? `, ${children} child${children !== 1 ? 'ren' : ''}` : ''}`;
}

function extractNumber(value: string | number | undefined): number {
  if (value == null) return 0;
  const n = parseFloat(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

// Success Notification Component
interface SuccessNotificationProps {
  message: string;
  onClose: () => void;
}

const SuccessNotification: React.FC<SuccessNotificationProps> = ({ message, onClose }) => {
  return (
    <div 
      className="fixed z-[60] flex items-center gap-3"
      style={{ top: 88, right: 24, width: 380, borderRadius: 6, padding: 14, backgroundColor: '#EDFFEE', border: '1px solid #118819', boxShadow: '0 4px 16px rgba(0,0,0,0.10)' }}
    >
      <svg className="flex-shrink-0 mt-0.5" width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="10" fill="#118819"/>
        <path d="M5.5 10.5l3 3 6-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <div className="flex-1">
        <p className="text-sm font-bold text-[#118819]" style={{ fontFamily: 'Nunito, sans-serif' }}>Success</p>
        <p className="text-sm text-[#0B3857]" style={{ fontFamily: 'Nunito, sans-serif' }}>{message}</p>
      </div>
      <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

// Edit Booking Modal Component
interface EditModalProps {
  booking: TravelAgentBooking;
  onClose: () => void;
  onSave: (updatedBooking: TravelAgentBooking) => void;
}

const EditBookingModal: React.FC<EditModalProps> = ({ booking, onClose, onSave }) => {
  // Parse customer details from booking
  const parseCustomerName = (fullName: string) => {
    const match = fullName.match(/^([^\s]+)\s+([^\s]+)/);
    if (match) {
      return { firstName: match[1], lastName: match[2] };
    }
    return { firstName: fullName.split(' ')[0] || '', lastName: fullName.split(' ')[1] || '' };
  };

  const parseGuestCount = (name: string) => {
    const normalisedName = formatGuestLabel(name);
    const adultMatch = normalisedName.match(/(\d+)\s+adult/);
    const childMatch = normalisedName.match(/(\d+)\s+child(?:ren)?/);
    return {
      adults: adultMatch ? parseInt(adultMatch[1]) : 1,
      children: childMatch ? parseInt(childMatch[1]) : 0
    };
  };

  const customer1 = booking.personalDetails?.[0] || parseCustomerName(booking.customerDetails.name);
  const customer2 = booking.personalDetails?.[1] || { firstName: '', lastName: '' };
  const guestCount = parseGuestCount(booking.customerDetails.name);
  const parsedDateMatch = booking.tourDetails.date.match(/^(.*?)\s*\(([^)]+)\)$/);
  const initialDate = parsedDateMatch?.[1]?.trim() ?? booking.tourDetails.date;
  const initialDuration = parsedDateMatch?.[2]?.trim() ?? '';

  const [tourDetail, setTourDetail] = useState<TourDetail | null>(null);
  const [loadingTour, setLoadingTour] = useState(false);
  const [selectedDateKey, setSelectedDateKey] = useState(`${initialDate}|${initialDuration}`);
  const [adults, setAdults] = useState(guestCount.adults);
  const [children, setChildren] = useState(guestCount.children);
  const [mealPlan, setMealPlan] = useState(booking.tourDetails.mealPlan);
  const [customer1FirstName, setCustomer1FirstName] = useState(customer1.firstName);
  const [customer1LastName, setCustomer1LastName] = useState(customer1.lastName);
  const [customer2FirstName, setCustomer2FirstName] = useState(customer2.firstName);
  const [customer2LastName, setCustomer2LastName] = useState(customer2.lastName);
  const [additionalGuests, setAdditionalGuests] = useState<Array<{ firstName: string; lastName: string }>>(
    booking.personalDetails?.slice(2) ?? []
  );
  const [isAdultsOpen, setIsAdultsOpen] = useState(false);
  const [isMealOpen, setIsMealOpen] = useState(false);

  useEffect(() => {
    const extraGuestCount = Math.max(0, adults + children - 2);

    setAdditionalGuests(prev => {
      const next = [...prev];

      while (next.length < extraGuestCount) {
        next.push({ firstName: '', lastName: '' });
      }

      return next.slice(0, extraGuestCount);
    });
  }, [adults, children]);

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
      .catch(() => {
        setTourDetail(null);
      })
      .finally(() => setLoadingTour(false));
  }, [booking.tourId]);

  const dateOptions = tourDetail?.startDates.length && tourDetail?.durations.length
    ? tourDetail.startDates.flatMap(sd =>
        tourDetail.durations.map(dur => ({
          key: `${sd}|${dur}`,
          label: `${sd}, ${dur}`,
          date: sd,
          duration: dur,
        }))
      )
    : [{ key: `${initialDate}|${initialDuration}`, label: `${initialDate}${initialDuration ? `, ${initialDuration}` : ''}`, date: initialDate, duration: initialDuration }];

  const mealOptions = tourDetail?.mealPlans.length
    ? tourDetail.mealPlans
    : ['Breakfast (BB)', 'Half-board (HB)', 'Full-board (FB)', 'All inclusive (AI)'];

  const guestsLabel = formatGuests(adults, children);

  const selectedDateOption = dateOptions.find(opt => opt.key === selectedDateKey) ?? dateOptions[0];
  const selectedDurationDays = selectedDateOption?.duration ? parseInt(selectedDateOption.duration.replace(/[^0-9]/g, ''), 10) || 1 : 1;
  const currentMealCode = mealCode(mealPlan);
  const priceMap = tourDetail?.price ?? {};
  const adultPriceRaw = Object.entries(priceMap).find(([k]) => !k.toLowerCase().includes('child'))?.[1] ?? Object.values(priceMap)[0] ?? undefined;
  const childPriceRaw = priceMap.child ?? priceMap.Child ?? priceMap.CHILD ?? adultPriceRaw;
  const adultPrice = extractNumber(adultPriceRaw);
  const childPrice = extractNumber(childPriceRaw || adultPriceRaw);
  const supplementRaw = tourDetail?.mealSupplementsPerDay?.[currentMealCode];
  const supplement = extractNumber(supplementRaw);
  const calculatedTotal = adultPrice > 0
    ? adultPrice * adults + childPrice * children + supplement * selectedDurationDays * (adults + children)
    : 0;
  const totalPrice = calculatedTotal > 0 ? `$${Math.round(calculatedTotal).toLocaleString()}` : booking.tourDetails.totalPrice;

  const handleSave = () => {
    const totalGuests = adults + children;
    const guestText = totalGuests === 1 
      ? '1 adult' 
      : children === 0 
        ? `${adults} ${adults === 1 ? 'adult' : 'adults'}` 
        : `${adults} ${adults === 1 ? 'adult' : 'adults'}, ${children} ${children === 1 ? 'child' : 'children'}`;

    const updatedBooking = {
      ...booking,
      tourDetails: {
        ...booking.tourDetails,
        date: dateOptions.find(opt => opt.key === selectedDateKey)?.label ?? booking.tourDetails.date,
        mealPlan,
        guests: `${customer1FirstName} ${customer1LastName} (${guestText})`,
        totalPrice,
      },
      customerDetails: {
        ...booking.customerDetails,
        name: `${customer1FirstName} ${customer1LastName} (${guestText})`,
      },
      personalDetails: [
        { firstName: customer1FirstName, lastName: customer1LastName },
        ...(adults + children > 1 ? [{ firstName: customer2FirstName, lastName: customer2LastName }] : []),
        ...additionalGuests.slice(0, Math.max(0, totalGuests - 2))
      ],
    };
    onSave(updatedBooking);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-lg w-full max-w-[600px] mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4  sticky top-0 bg-white z-10">
          <div className='ml-3'>
          <div className='flex gap-3 '>
                <h2 className="text-[24px] font-bold text-[#0B3857]" style={{ fontFamily: 'Nunito, sans-serif' }}>{booking.name}</h2>
                <span className="ml-2 flex items-center gap-1">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7.52144 2.30229C7.6751 1.991 7.75193 1.83535 7.85623 1.78562C7.94697 1.74236 8.0524 1.74236 8.14314 1.78562C8.24744 1.83535 8.32427 1.991 8.47793 2.30229L9.93571 5.2556C9.98108 5.3475 10.0038 5.39345 10.0369 5.42913C10.0663 5.46072 10.1015 5.48631 10.1406 5.5045C10.1847 5.52503 10.2354 5.53244 10.3368 5.54726L13.5977 6.02388C13.941 6.07408 14.1127 6.09917 14.1922 6.18304C14.2613 6.25601 14.2938 6.35628 14.2807 6.45593C14.2656 6.57047 14.1413 6.69153 13.8927 6.93367L11.534 9.23103C11.4604 9.30264 11.4237 9.33845 11.4 9.38106C11.379 9.41878 11.3655 9.46022 11.3603 9.50309C11.3544 9.5515 11.3631 9.60208 11.3804 9.70324L11.937 12.9482C11.9957 13.2904 12.025 13.4615 11.9699 13.5631C11.9219 13.6514 11.8366 13.7134 11.7377 13.7317C11.6241 13.7528 11.4704 13.672 11.1631 13.5104L8.24793 11.9773C8.1571 11.9295 8.11168 11.9057 8.06384 11.8963C8.02147 11.888 7.9779 11.888 7.93554 11.8963C7.88769 11.9057 7.84227 11.9295 7.75144 11.9773L4.83629 13.5104C4.52895 13.672 4.37528 13.7528 4.26166 13.7317C4.1628 13.7134 4.07749 13.6514 4.0295 13.5631C3.97434 13.4615 4.00369 13.2904 4.06239 12.9482L4.61893 9.70324C4.63628 9.60208 4.64496 9.5515 4.63909 9.50309C4.63389 9.46022 4.62042 9.41878 4.59941 9.38106C4.57569 9.33845 4.53893 9.30264 4.4654 9.23103L2.10671 6.93367C1.85812 6.69153 1.73382 6.57047 1.71869 6.45593C1.70553 6.35628 1.73804 6.25601 1.80717 6.18304C1.88663 6.09917 2.05832 6.07408 2.4017 6.02388L5.66255 5.54726C5.76396 5.53244 5.81466 5.52503 5.85882 5.5045C5.89792 5.48631 5.93312 5.46072 5.96246 5.42913C5.99561 5.39345 6.01829 5.3475 6.06366 5.2556L7.52144 2.30229Z" fill="#0B3857" stroke="#0B3857" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                5.0
              </span>
          </div>
            <div className="flex items-center gap-1 text-[12px] text-[#677883] mt-0.5" style={{ fontFamily: 'Nunito, sans-serif' }}>
              <span>{booking.destination}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 ml-3 mr-3">
          {/* Tour details section */}
          <div>
            <h3 className="text-[18px] font-bold text-[#0B3857] mb-3" style={{ fontFamily: 'Nunito, sans-serif' }}>Tour details</h3>

            <div className="space-y-3">
              {/* Date */}
              <div>
      
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSelectedDateKey(selectedDateKey)}
                    className="w-full flex items-center justify-between border border-[#D3E1ED] rounded-lg bg-white px-3 py-3 text-sm text-[#0B3857] text-left transition-shadow duration-200 hover:shadow-[0_10px_18px_rgba(2,126,172,0.10)] hover:border-[#CFE7F2]"
                    style={{ fontFamily: 'Nunito, sans-serif' }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="flex-shrink-0 text-[#0B3857]">
                        <rect x="3" y="4" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M12.5 2.5V5M5.5 2.5V5M3 7.5H15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                      <span className="truncate">
                        {dateOptions.find(opt => opt.key === selectedDateKey)?.label ?? booking.tourDetails.date}
                      </span>
                    </div>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                      <path d="M6 9l6 6 6-6" stroke="#0B3857" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  <select
                    value={selectedDateKey}
                    onChange={e => setSelectedDateKey(e.target.value)}
                    disabled={loadingTour}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    aria-label="Select date"
                  >
                    {dateOptions.map(opt => (
                      <option key={opt.key} value={opt.key}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Adults/Children */}
              <div>
                <div className="relative">
                  <button
                    onClick={() => setIsAdultsOpen(!isAdultsOpen)}
                    className="w-full flex items-center justify-between border border-[#D3E1ED] rounded-lg bg-white px-3 py-3 text-sm text-[#0B3857] text-left transition-shadow duration-200 hover:shadow-[0_10px_18px_rgba(2,126,172,0.10)] hover:border-[#CFE7F2]"
                    style={{ fontFamily: 'Nunito, sans-serif' }}
                  >
                    <div className="flex items-center gap-3">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#0B3857" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="9" cy="7" r="4" stroke="#0B3857" strokeWidth="1.7" />
                      </svg>
                      <span>{guestsLabel}</span>
                    </div>
                    <svg className={`transition-transform flex-shrink-0 ${isAdultsOpen ? 'rotate-180' : ''}`} width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M6 9l6 6 6-6" stroke="#0B3857" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  
                  {isAdultsOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#0B3857] font-semibold" style={{ fontFamily: 'Nunito, sans-serif' }}>Adults</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setAdults(Math.max(0, adults - 1))}
                              className="w-8 h-8 rounded-full border border-[#027EAC] text-[#027EAC] flex items-center justify-center hover:bg-[#E7F9FF] transition-colors"
                            >
                              <svg width="12" height="2" viewBox="0 0 12 2" fill="none">
                                <path d="M1 1H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                            </button>
                            <span className="w-8 text-center font-semibold text-[#0B3857]" style={{ fontFamily: 'Nunito, sans-serif' }}>{adults}</span>
                            <button
                              onClick={() => setAdults(adults + 1)}
                              className="w-8 h-8 rounded-full border border-[#027EAC] text-[#027EAC] flex items-center justify-center hover:bg-[#E7F9FF] transition-colors"
                            >
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-[#0B3857] font-semibold" style={{ fontFamily: 'Nunito, sans-serif' }}>Children</span>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setChildren(Math.max(0, children - 1))}
                              className="w-8 h-8 rounded-full border border-[#027EAC] text-[#027EAC] flex items-center justify-center hover:bg-[#E7F9FF] transition-colors"
                            >
                              <svg width="12" height="2" viewBox="0 0 12 2" fill="none">
                                <path d="M1 1H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                            </button>
                            <span className="w-8 text-center font-semibold text-[#0B3857]" style={{ fontFamily: 'Nunito, sans-serif' }}>{children}</span>
                            <button
                              onClick={() => setChildren(children + 1)}
                              className="w-8 h-8 rounded-full border border-[#027EAC] text-[#027EAC] flex items-center justify-center hover:bg-[#E7F9FF] transition-colors"
                            >
                
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Meal Plan */}
              <div>
                <div className="relative">
                  <button
                    onClick={() => setIsMealOpen(!isMealOpen)}
                    className="w-full flex items-center justify-between border border-[#D3E1ED] rounded-lg bg-white px-3 py-3 text-sm text-[#0B3857] text-left transition-shadow duration-200 hover:shadow-[0_10px_18px_rgba(2,126,172,0.10)] hover:border-[#CFE7F2]"
                    style={{ fontFamily: 'Nunito, sans-serif' }}
                  >
                    <div className="flex items-center gap-3">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" stroke="#0B3857" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M7 2v20" stroke="#0B3857" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3zm0 0v7" stroke="#0B3857" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>{mealPlan}</span>
                    </div>
                    <svg 
                      className={`transition-transform flex-shrink-0 ${isMealOpen ? 'rotate-180' : ''}`}
                      width="18" 
                      height="18" 
                      viewBox="0 0 24 24" 
                      fill="none"
                    >
                      <path d="M6 9l6 6 6-6" stroke="#0B3857" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  
                  {isMealOpen && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                      {mealOptions.map((option) => (
                        <button
                          key={option}
                          onClick={() => {
                            setMealPlan(option);
                            setIsMealOpen(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-[#0B3857] hover:bg-[#E7F9FF] first:rounded-t-lg last:rounded-b-lg transition-colors"
                          style={{ fontFamily: 'Nunito, sans-serif' }}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Personal details Customer 1 */}
          <div>
            <h3 className="text-[18px] font-bold text-[#0B3857] mb-3" style={{ fontFamily: 'Nunito, sans-serif' }}>Personal details (Customer 1)</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[14px] text-[#0B3857] font-bold mb-1" style={{ fontFamily: 'Nunito, sans-serif' }}>First name</label>
                <input
                  type="text"
                  value={customer1FirstName}
                  onChange={(e) => setCustomer1FirstName(e.target.value)}
                  placeholder="e.g. Johnson"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#0B3857] focus:outline-none focus:ring-2 focus:ring-[#027EAC] focus:border-transparent"
                  style={{ fontFamily: 'Nunito, sans-serif' }}
                />
              </div>
              <div>
                <label className="block text-[14px] text-[#0B3857] font-bold mb-1" style={{ fontFamily: 'Nunito, sans-serif' }}>Last name</label>
                <input
                  type="text"
                  value={customer1LastName}
                  onChange={(e) => setCustomer1LastName(e.target.value)}
                  placeholder="e.g. Doe"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#0B3857] focus:outline-none focus:ring-2 focus:ring-[#027EAC] focus:border-transparent"
                  style={{ fontFamily: 'Nunito, sans-serif' }}
                />
              </div>
            </div>
          </div>

          {/* Personal details Customer 2 */}
          {adults + children > 1 && (
            <div>
              <h3 className="text-[18px] font-bold text-[#0B3857] mb-3" style={{ fontFamily: 'Nunito, sans-serif' }}>Personal details (Customer 2)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[14px] text-[#0B3857] font-bold mb-1" style={{ fontFamily: 'Nunito, sans-serif' }}>First name</label>
                  <input
                    type="text"
                    value={customer2FirstName}
                    onChange={(e) => setCustomer2FirstName(e.target.value)}
                    placeholder="e.g. Johnson"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#0B3857] focus:outline-none focus:ring-2 focus:ring-[#027EAC] focus:border-transparent"
                    style={{ fontFamily: 'Nunito, sans-serif' }}
                  />
                </div>
                <div>
                  <label className="block text-[14px] text-[#0B3857] font-bold mb-1" style={{ fontFamily: 'Nunito, sans-serif' }}>Last name</label>
                  <input
                    type="text"
                    value={customer2LastName}
                    onChange={(e) => setCustomer2LastName(e.target.value)}
                    placeholder="e.g. Doe"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#0B3857] focus:outline-none focus:ring-2 focus:ring-[#027EAC] focus:border-transparent"
                    style={{ fontFamily: 'Nunito, sans-serif' }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Additional personal details */}
          {additionalGuests.map((guest, index) => {
            const guestNumber = index + 3;

            return (
              <div key={guestNumber}>
                <h3 className="text-[18px] font-bold text-[#0B3857] mb-3" style={{ fontFamily: 'Nunito, sans-serif' }}>Personal details (Customer {guestNumber})</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[14px] text-[#0B3857] font-bold mb-1" style={{ fontFamily: 'Nunito, sans-serif' }}>First name</label>
                    <input
                      type="text"
                      value={guest.firstName}
                      onChange={(e) => {
                        const value = e.target.value;
                        setAdditionalGuests(prev =>
                          prev.map((item, i) => (i === index ? { ...item, firstName: value } : item))
                        );
                      }}
                      placeholder="e.g. Johnson"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#0B3857] focus:outline-none focus:ring-2 focus:ring-[#027EAC] focus:border-transparent"
                      style={{ fontFamily: 'Nunito, sans-serif' }}
                    />
                  </div>
                  <div>
                    <label className="block text-[14px] text-[#0B3857] font-bold mb-1" style={{ fontFamily: 'Nunito, sans-serif' }}>Last name</label>
                    <input
                      type="text"
                      value={guest.lastName}
                      onChange={(e) => {
                        const value = e.target.value;
                        setAdditionalGuests(prev =>
                          prev.map((item, i) => (i === index ? { ...item, lastName: value } : item))
                        );
                      }}
                      placeholder="e.g. Doe"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-[#0B3857] focus:outline-none focus:ring-2 focus:ring-[#027EAC] focus:border-transparent"
                      style={{ fontFamily: 'Nunito, sans-serif' }}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {/* Total Price */}
          <div className="pt-3 ">
            <div className="flex items-center justify-end gap-2">
              <span className="text-[14px] font-extrabold text-[#0B3857]" style={{ fontFamily: 'Nunito, sans-serif' }}>Total price:</span>
              <span className="text-[14px] font-extrabold text-[#0B3857]" style={{ fontFamily: 'Nunito, sans-serif' }}>{totalPrice}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4  flex-shrink-0">
          <button
            onClick={handleSave}
            className="w-full px-4 py-2.5 bg-[#027EAC] text-white rounded-lg font-semibold text-sm hover:bg-[#026a8f] transition-colors"
            style={{ fontFamily: 'Nunito, sans-serif' }}
          >
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
};

// Cancel Modal Component
interface CancelModalProps {
  booking: TravelAgentBooking;
  onClose: () => void;
  onConfirm: (reason: string) => void;
}

const CancelBookingModal: React.FC<CancelModalProps> = ({ booking, onClose, onConfirm }) => {
  const [reason, setReason] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const reasons = [
    "Customer's Emergency",
    "Hotel Emergency",
    "Safety concerns",
    "Insufficient bookings",
  ];

  const handleConfirm = () => {
    onConfirm(reason);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-lg w-full max-w-[520px] mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 ml-3 mt-2 mr-3 ">
          <h2 className="text-[24px] font-bold text-[#0B3857]" style={{ fontFamily: 'Nunito, sans-serif' }}>Cancel</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 ml-3 mr-3">
          {/* Booking details section */}
          <div>
            <h3 className="text-[18px] font-[700] text-[#0B3857] mb-3" style={{ fontFamily: 'Nunito, sans-serif' }}>Booking details</h3>
            
            <div className="space-y-2 text-[14px]" style={{ fontFamily: 'Nunito, sans-serif' }}>
              <div className="grid grid-cols-[120px,1fr] gap-2">
                <span className="font-[800]">Customer:</span>
                <span className="text-[#0B3857] font-[400]">{formatGuestLabel(booking.customerDetails.name)}</span>
              </div>
              
              <div className="grid grid-cols-[120px,1fr] gap-2">
                <span className="font-[800]">Contact email:</span>
                <span className="text-[#0B3857] font-[400]">{booking.customerDetails.email}</span>
              </div>
              
              <div className="grid grid-cols-[120px,1fr] gap-2">
                <span className="font-[800]">Tour name:</span>
                <span className="text-[#0B3857] font-[400]">{booking.name}</span>
              </div>
              
              <div className="grid grid-cols-[120px,1fr] gap-2">
                <span className="font-[800]">Location:</span>
                <span className="text-[#0B3857] font-[400]">{booking.destination}</span>
              </div>
              
              <div className="grid grid-cols-[120px,1fr] gap-2">
                <span className="font-[800]">Start date:</span>
                <span className="text-[#0B3857] font-[400]">{booking.tourDetails.date.split('(')[0].trim()}</span>
              </div>
              
              <div className="grid grid-cols-[120px,1fr] gap-2">
                <span className="font-[800]">Duration:</span>
                <span className="text-[#0B3857] font-[400]">{booking.tourDetails.date.match(/\(([^)]+)\)/)?.[1] || ''}</span>
              </div>
              
              <div className="grid grid-cols-[120px,1fr] gap-2">
                <span className="font-[800]">Tour type:</span>
                <span className="text-[#0B3857] font-[400]">Resort</span>
              </div>
              
              <div className="grid grid-cols-[120px,1fr] gap-2">
                <span className="font-[800]">Meal plan:</span>
                <span className="text-[#0B3857] font-[400]">{booking.tourDetails.mealPlan}</span>
              </div>
            </div>
          </div>

          {/* Cancellation reason */}
          <div>
            <label className="block text-[14px] mt-1 font-[800] text-[#0B3857] mb-2" style={{ fontFamily: 'Nunito, sans-serif' }}>
              Cancellation reason
            </label>
            <div className="relative">
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-[#0B3857] focus:outline-none focus:ring-2 focus:ring-[#027EAC] focus:border-transparent text-left flex items-center justify-between transition-shadow duration-200 hover:shadow-[0_10px_18px_rgba(2,126,172,0.16)] hover:border-[#CFE7F2]"
                style={{ fontFamily: 'Nunito, sans-serif' }}
              >
                <span className={reason ? 'text-[#0B3857]' : 'text-gray-400'}>
                  {reason || 'Select reason'}
                </span>
                <svg 
                  className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  width="12" 
                  height="12" 
                  viewBox="0 0 12 12" 
                  fill="none"
                >
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              
              {isOpen && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                  {reasons.map((reasonOption) => (
                    <label
                      key={reasonOption}
                      className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setReason(reasonOption);
                        setIsOpen(false);
                      }}
                    >
                      <div className="flex items-center w-full">
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center mr-3 ${
                          reason === reasonOption ? 'border-[#027EAC]' : 'border-gray-300'
                        }`}>
                          {reason === reasonOption && (
                            <div className="w-2 h-2 rounded-full bg-[#027EAC]"></div>
                          )}
                        </div>
                        <span className="text-sm text-[#0B3857]" style={{ fontFamily: 'Nunito, sans-serif' }}>
                          {reasonOption}
                        </span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 ml-3 mr-3 pb-4 mb-4">
          <button
            onClick={onClose}
            className="w-[160px] text-[14px] px-2 py-2 border-[2px] border-[#027EAC] text-[#027EAC] rounded-lg font-semibold text-sm hover:bg-[#E7F9FF] transition-colors"
            style={{ fontFamily: 'Nunito, sans-serif' }}
          >
            Keep the booking
          </button>
          <button
            onClick={handleConfirm}
            disabled={!reason}
            className="w-[160px] text-[14px] px-2 py-2 bg-[#027EAC] text-white rounded-lg font-semibold text-sm hover:bg-[#026a8f] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: 'Nunito, sans-serif' }}
          >
            Cancel the booking
          </button>
        </div>
      </div>
    </div>
  );
};

interface BookingChangesModalProps {
  bookingName: string;
  bookingDate: string;
  changes: string[];
  onDecline: () => void;
  onConfirm: () => void;
}

const BookingChangesModal: React.FC<BookingChangesModalProps> = ({ bookingName, bookingDate, changes, onDecline, onConfirm }) => {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-40" onClick={onConfirm}>
      <div
        className="bg-white rounded-xl shadow-lg w-full max-w-[420px] mx-4 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-4">
          <h2 className="text-lg font-bold text-[#0B3857]" style={{ fontFamily: 'Nunito, sans-serif' }}>
            Confirm tour booking changes
          </h2>
          <button onClick={onConfirm} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <p className="text-sm text-[#0B3857] leading-6 mb-4" style={{ fontFamily: 'Nunito, sans-serif' }}>
          Your booking for <span className="font-semibold">{bookingName}</span> on <span className="font-semibold">{bookingDate}</span> has been updated by the travel agent.
        </p>

        <div className="mb-4">
          <h3 className="text-sm font-bold text-[#0B3857] mb-2" style={{ fontFamily: 'Nunito, sans-serif' }}>Changes:</h3>
          <ul className="list-disc pl-5 space-y-2 text-sm text-[#0B3857]" style={{ fontFamily: 'Nunito, sans-serif' }}>
            {changes.map((change, index) => (
              <li key={index}>{change}</li>
            ))}
          </ul>
        </div>

        <p className="text-sm text-[#0B3857] leading-6 mb-5" style={{ fontFamily: 'Nunito, sans-serif' }}>
          All other details of this booking remain the same.
          <br />
          Please review the changes and confirm your updated booking, or contact us if you need further assistance.
        </p>

        <div className="flex justify-end gap-2">
          <button
            onClick={onDecline}
            className="px-4 py-2 rounded-lg border border-[#027EAC] text-[#027EAC] bg-white font-semibold text-sm hover:bg-[#E7F9FF] transition-colors"
            style={{ fontFamily: 'Nunito, sans-serif' }}
          >
            Decline changes
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-[#027EAC] text-white font-semibold text-sm hover:bg-[#026a8f] transition-colors"
            style={{ fontFamily: 'Nunito, sans-serif' }}
          >
            Confirm changes
          </button>
        </div>
      </div>
    </div>
  );
};

// Confirm Booking Modal Component
interface ConfirmModalProps {
  booking: TravelAgentBooking;
  onClose: () => void;
  onConfirm: () => void;
}

const ConfirmBookingModal: React.FC<ConfirmModalProps> = ({ booking, onClose, onConfirm }) => {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  // Extract document count from tourDetails.documents (e.g., "2 items")
  const documentCountMatch = booking.tourDetails.documents.match(/(\d+)/);
  const documentCount = documentCountMatch ? parseInt(documentCountMatch[0]) : 0;

  // Generate document names based on count and customer name
  const customerNameParts = booking.customerDetails.name.split('(')[0].trim().replace(/\s+/g, '-');
  
  let passportDoc: string | null = null;
  let paymentDoc: string | null = null;

  if (documentCount === 1) {
    // If only one document, assume it's the passport
    passportDoc = `Passport-${customerNameParts}.pdf`;
  } else if (documentCount >= 2) {
    // If multiple documents, first is passport, last is payment
    passportDoc = `Passport-${customerNameParts}.pdf`;
    paymentDoc = `Payment-receipt.pdf`;
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[24px] font-bold text-[#0B3857]" style={{ fontFamily: 'Nunito, sans-serif' }}>{booking.name}</h2>
              <span className="flex items-center gap-1 text-sm text-[#6B7280]">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M7.52144 2.30229C7.6751 1.991 7.75193 1.83535 7.85623 1.78562C7.94697 1.74236 8.0524 1.74236 8.14314 1.78562C8.24744 1.83535 8.32427 1.991 8.47793 2.30229L9.93571 5.2556C9.98108 5.3475 10.0038 5.39345 10.0369 5.42913C10.0663 5.46072 10.1015 5.48631 10.1406 5.5045C10.1847 5.52503 10.2354 5.53244 10.3368 5.54726L13.5977 6.02388C13.941 6.07408 14.1127 6.09917 14.1922 6.18304C14.2613 6.25601 14.2938 6.35628 14.2807 6.45593C14.2656 6.57047 14.1413 6.69153 13.8927 6.93367L11.534 9.23103C11.4604 9.30264 11.4237 9.33845 11.4 9.38106C11.379 9.41878 11.3655 9.46022 11.3603 9.50309C11.3544 9.5515 11.3631 9.60208 11.3804 9.70324L11.937 12.9482C11.9957 13.2904 12.025 13.4615 11.9699 13.5631C11.9219 13.6514 11.8366 13.7134 11.7377 13.7317C11.6241 13.7528 11.4704 13.672 11.1631 13.5104L8.24793 11.9773C8.1571 11.9295 8.11168 11.9057 8.06384 11.8963C8.02147 11.888 7.9779 11.888 7.93554 11.8963C7.88769 11.9057 7.84227 11.9295 7.75144 11.9773L4.83629 13.5104C4.52895 13.672 4.37528 13.7528 4.26166 13.7317C4.1628 13.7134 4.07749 13.6514 4.0295 13.5631C3.97434 13.4615 4.00369 13.2904 4.06239 12.9482L4.61893 9.70324C4.63628 9.60208 4.64496 9.5515 4.63909 9.50309C4.63389 9.46022 4.62042 9.41878 4.59941 9.38106C4.57569 9.33845 4.53893 9.30264 4.4654 9.23103L2.10671 6.93367C1.85812 6.69153 1.73382 6.57047 1.71869 6.45593C1.70553 6.35628 1.73804 6.25601 1.80717 6.18304C1.88663 6.09917 2.05832 6.07408 2.4017 6.02388L5.66255 5.54726C5.76396 5.53244 5.81466 5.52503 5.85882 5.5045C5.89792 5.48631 5.93312 5.46072 5.96246 5.42913C5.99561 5.39345 6.01829 5.3475 6.06366 5.2556L7.52144 2.30229Z" fill="#0B3857" stroke="#0B3857" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                5.0
              </span>
            </div>
            <div className="flex items-center gap-1 text-[12px] text-[#677883] mt-0.5" style={{ fontFamily: 'Nunito, sans-serif' }}>
              <span>{booking.destination}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-4 space-y-4">
          {/* Booking details section */}
          <div>
            <h3 className="text-[18px] font-bold text-[#0B3857] mb-3" style={{ fontFamily: 'Nunito, sans-serif' }}>Booking details</h3>
            
            <div className="space-y-2 text-sm" style={{ fontFamily: 'Nunito, sans-serif' }}>
              <div className="grid grid-cols-[120px,1fr] gap-2">
                <span className="text-[14px] font-extrabold text-[#0B3857]">Customer:</span>
                <span className="text-[14px] text-[#0B3857]">{formatGuestLabel(booking.customerDetails.name)}</span>
              </div>
              
              <div className="grid grid-cols-[120px,1fr] gap-2">
                <span className="text-[14px] font-extrabold text-[#0B3857]">Contact email:</span>
                <span className="text-[14px] text-[#0B3857]">{booking.customerDetails.email}</span>
              </div>
              
              <div className="grid grid-cols-[120px,1fr] gap-2">
                <span className="text-[14px] font-extrabold text-[#0B3857]">Start date:</span>
                <span className="text-[14px] text-[#0B3857]">{booking.tourDetails.date.split('(')[0].trim()}</span>
              </div>
              
              <div className="grid grid-cols-[120px,1fr] gap-2">
                <span className="text-[14px] font-extrabold text-[#0B3857]">Duration:</span>
                <span className="text-[14px] text-[#0B3857]">{booking.tourDetails.date.match(/\(([^)]+)\)/)?.[1] || ''}</span>
              </div>
              
              <div className="grid grid-cols-[120px,1fr] gap-2">
                <span className="text-[14px] font-extrabold text-[#0B3857]">Meal plan:</span>
                <span className="text-[14px] text-[#0B3857]">{booking.tourDetails.mealPlan}</span>
              </div>
            </div>
          </div>

          {/* Documents section */}
          <div>
            <h3 className="text-[18px] mt-2 font-bold text-[#0B3857] mb-3" style={{ fontFamily: 'Nunito, sans-serif' }}>Documents</h3>
            
            <div className="space-y-2 text-sm" style={{ fontFamily: 'Nunito, sans-serif' }}>
              {(() => {
                const docs = booking.customerDetails?.documents;
                const payments = docs?.payments ?? [];
                const guestGroups = docs?.guestDocuments ?? [];
                
                // Build document array with updated guest names from personalDetails
                const allDocs: Array<{ label: string; file: BookingDocumentItem; guestIndex: number }> = [
                  ...payments.map(f => ({ label: 'Payment', file: f, guestIndex: -1 })),
                  ...guestGroups.flatMap((g, idx) => 
                    (g.documents ?? []).map(f => ({ 
                      label: g.userName, 
                      file: f, 
                      guestIndex: idx 
                    }))
                  ),
                ];
                
                if (allDocs.length === 0) {
                  return (
                    <p className="text-[14px] text-[#677883]">No documents uploaded yet.</p>
                  );
                }
                
                return allDocs.map(({ label, file, guestIndex }) => {
                  const downloadUrl = file.fileUrl ?? file.url ?? file.documentUrl;
                  const isPayment = label === 'Payment';
                  
                  // Use updated guest name from personalDetails if available, otherwise use original
                  let displayLabel: string;
                  if (isPayment) {
                    displayLabel = 'Payment';
                  } else {
                    const updatedGuest = booking.personalDetails?.[guestIndex];
                    const guestName = updatedGuest 
                      ? `${updatedGuest.firstName} ${updatedGuest.lastName}` 
                      : label;
                    displayLabel = `${guestName} passport`;
                  }
                  
                  return (
                    <div key={file.id} className="grid grid-cols-[180px,1fr] gap-2">
                      <span className="text-[14px] font-extrabold text-[#0B3857]">{displayLabel}:</span>
                      {downloadUrl ? (
                        <a
                          href={downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#027EAC] hover:underline truncate"
                        >
                          {file.fileName}
                        </a>
                      ) : (
                        <span className="text-[14px] text-[#677883]">{file.fileName}</span>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Total price */}
          <div className="pt-3 ">
            <div className="flex items-center justify-end gap-2">
              <span className="text-sm font-extrabold text-[#0B3857]" style={{ fontFamily: 'Nunito, sans-serif' }}>Total price:</span>
              <span className="text-sm font-extrabold text-[#0B3857]" style={{ fontFamily: 'Nunito, sans-serif' }}>{booking.tourDetails.totalPrice}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 ">
          <button
            onClick={handleConfirm}
            className="w-full px-4 py-2.5 bg-[#027EAC] text-white rounded-lg font-semibold text-sm hover:bg-[#026a8f] transition-colors"
            style={{ fontFamily: 'Nunito, sans-serif' }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

// Backend API functions
interface TravelAgentBooking {
  id: string;
  tourId?: string;
  state: BookingState;
  changeRequestStatus?: 'PENDING' | 'APPROVED';
  tourImageUrl: string | null;
  name: string; // tour name
  destination: string;
  tourDetails: {
    date: string;
    mealPlan: string;
    guests: string;
    totalPrice: string;
    documents: string;
  };
  customerDetails: {
    name: string;
    email: string;
    phone: string | null;
    documents: {
      payments: BookingDocumentItem[];
      guestDocuments: GuestDocumentGroup[];
    };
  };
  freeCancelation?: string; // ISO date like "2026-05-24"
  personalDetails?: Array<{ firstName: string; lastName: string }>;
  canceledBy?: string | null;
  cancelReason?: string | null;
}

interface BookingsResponse {
  bookings: TravelAgentBooking[];
}

// API functions
async function fetchTravelAgentBookings(agentId: string): Promise<TravelAgentBooking[]> {
  const response = await apiRequest<BookingsResponse>(`/bookings?agentId=${encodeURIComponent(agentId)}`);
  return response.bookings.map(booking => ({
    ...booking,
    state: (String(booking.state) === 'CANCELLED' ? 'CANCELED' : booking.state) as BookingState,
  }));
}

async function confirmBooking(bookingId: string): Promise<void> {
  await apiRequest(`/bookings/${bookingId}/confirm`, { method: 'POST' });
}

async function cancelBooking(bookingId: string, reason: string): Promise<void> {
  await apiRequest(`/bookings/${bookingId}/cancel`, {
    method: 'DELETE',
    body: { cancellationReason: reason },
  });
}



type FilterTab = 'All tours' | BookingState;

const FILTER_TABS: FilterTab[] = ['All tours', 'BOOKED', 'CONFIRMED', 'STARTED', 'FINISHED', 'CANCELED'];

const TAB_LABELS: Record<FilterTab, string> = {
  'All tours': 'All tours',
  BOOKED: 'Booked',
  CONFIRMED: 'Confirmed',
  STARTED: 'Started',
  FINISHED: 'Finished',
  CANCELED: 'Canceled',
};

interface DocumentsModalProps {
  booking: TravelAgentBooking;
  onClose: () => void;
}

const DocumentsModal: React.FC<DocumentsModalProps> = ({ booking, onClose }) => {
  const documents = booking.customerDetails.documents ?? { payments: [], guestDocuments: [] };
  const allDocuments: Array<{ label: string; file: BookingDocumentItem }> = [
    ...(documents.payments ?? []).map(file => ({ label: 'Payment', file })),
    ...(documents.guestDocuments ?? []).flatMap(group =>
      (group.documents ?? []).map(file => ({ label: group.userName, file }))
    ),
  ];

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4" onClick={onClose}>
      <div
        className="w-full max-w-[640px] rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-[24px] font-bold text-[#0B3857]" style={{ fontFamily: 'Nunito, sans-serif' }}>Documents</h2>
          <button onClick={onClose} className="text-[#0B3857] hover:text-gray-600 transition-colors" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {allDocuments.length === 0 ? (
            <p className="text-sm text-[#677883]" style={{ fontFamily: 'Nunito, sans-serif' }}>
              No documents uploaded yet.
            </p>
          ) : (
            allDocuments.map(({ label, file }) => (
              <div key={file.id} className="flex items-center justify-between gap-4 rounded-lg py-1">
                <div className="flex items-start gap-3 min-w-0">
                  <svg width="18" height="18" viewBox="0 0 16 16" fill="none" className="mt-0.5 flex-shrink-0">
                    <path d="M10.0001 1.33301H4.00008C3.64646 1.33301 3.30732 1.47348 3.05727 1.72353C2.80722 1.97358 2.66675 2.31272 2.66675 2.66634V13.333C2.66675 13.6866 2.80722 14.0258 3.05727 14.2758C3.30732 14.5259 3.64646 14.6663 4.00008 14.6663H12.0001C12.3537 14.6663 12.6928 14.5259 12.9429 14.2758C13.1929 14.0258 13.3334 13.6866 13.3334 13.333V4.66634L10.0001 1.33301Z" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9.33325 1.33301V3.99967C9.33325 4.3533 9.47373 4.69244 9.72378 4.94248C9.97383 5.19253 10.313 5.33301 10.6666 5.33301H13.3333" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-[#0B3857]" style={{ fontFamily: 'Nunito, sans-serif' }}>
                      {file.fileName}
                    </p>
                    <p className="text-xs text-[#A0A9B3]" style={{ fontFamily: 'Nunito, sans-serif' }}>
                      {label}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  className="text-sm font-semibold text-[#027EAC] hover:underline disabled:opacity-40"
                  style={{ fontFamily: 'Nunito, sans-serif' }}
                  disabled={!file.fileUrl && !file.url && !file.documentUrl}
                  onClick={() => {
                    const downloadUrl = file.fileUrl ?? file.url ?? file.documentUrl;
                    if (downloadUrl) {
                      window.open(downloadUrl, '_blank', 'noopener,noreferrer');
                    }
                  }}
                >
                  Download
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const STATE_ORDER: BookingState[] = ['BOOKED', 'CONFIRMED', 'STARTED', 'FINISHED'];

const VH = 32;
const STEP_W = 90;
const TIP = 14;

// Status breadcrumb component matching MyToursPage design
function StatusBreadcrumb({ state }: { state: BookingState }) {
  const steps =
    state === 'CANCELED'
      ? [
          { label: 'Booked', isActive: true, isCanceled: false },
          { label: 'Confirmed', isActive: true, isCanceled: false },
          { label: 'Canceled', isActive: true, isCanceled: true },
        ]
      : STATE_ORDER.map((s, i) => ({
          label: s.charAt(0) + s.slice(1).toLowerCase(),
          isActive: STATE_ORDER.indexOf(state) >= i,
          isCanceled: false,
        }));

  const n = steps.length;
  const totalVW = n * STEP_W + TIP;

  return (
    <div style={{ position: 'relative', width: '100%', height: VH }}>
      <svg
        width="100%"
        height={VH}
        viewBox={`0 0 ${totalVW} ${VH}`}
        preserveAspectRatio="none"
        fill="none"
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        {[...steps].reverse().map((step, ri) => {
          const i = n - 1 - ri;
          const x0 = i * STEP_W;
          const xBody = x0 + STEP_W;
          const xTip = xBody + TIP;
          const xNotch = x0 + TIP;
          const isFirst = i === 0;

          const fill = step.isCanceled ? '#ffffff' : step.isActive ? '#ffffff' : '#F7FDFF';
          const stroke = step.isCanceled ? '#B70B0B' : step.isActive ? '#027EAC' : '#cbd5e1';

          const d = isFirst
            ? `M${x0},0 L${xBody},0 L${xTip},${VH / 2} L${xBody},${VH} L${x0},${VH} Z`
            : `M${x0},0 L${xBody},0 L${xTip},${VH / 2} L${xBody},${VH} L${x0},${VH} L${xNotch},${VH / 2} Z`;

          return (
            <path
              key={i}
              d={d}
              fill={fill}
              stroke={stroke}
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>

      <div style={{ position: 'relative', height: VH, display: 'flex' }}>
        {steps.map((step, i) => {
          const textColor = step.isCanceled ? '#B70B0B' : step.isActive ? '#0B3857' : '#94a3b8';
          return (
            <div
              key={i}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                color: textColor,
                fontSize: 14,
                fontWeight: 800,
                fontFamily: 'Nunito, sans-serif',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            >
              {step.isCanceled ? (
                <svg width="16" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : step.isActive ? (
                <svg width="14" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" style={{ flexShrink: 0 }}>
                  <path
                    d="M5 13l4 4L19 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
              {step.label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Pending alert modal shown when agent clicks "Check and confirm" while customer hasn't reviewed yet
const PendingAlertModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40" onClick={onClose}>
    <div className="bg-white rounded-xl shadow-lg w-full max-w-[380px] mx-4 p-6" onClick={e => e.stopPropagation()}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-[#FFF3CD] flex items-center justify-center flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 9v4M12 17h.01" stroke="#B45309" strokeWidth="2" strokeLinecap="round"/>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2 className="text-base font-bold text-[#0B3857]" style={{ fontFamily: 'Nunito, sans-serif' }}>
          Waiting for customer
        </h2>
      </div>
      <p className="text-sm text-[#677883] mb-5" style={{ fontFamily: 'Nunito, sans-serif' }}>
        The customer has not yet reviewed or accepted the proposed changes. You cannot check and confirm until they respond.
      </p>
      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="px-5 py-2 rounded-lg bg-[#027EAC] text-white text-sm font-semibold hover:bg-[#026a8f] transition-colors"
          style={{ fontFamily: 'Nunito, sans-serif' }}
        >
          OK
        </button>
      </div>
    </div>
  </div>
);

// Booking Card Component
const TravelAgentBookingCard: React.FC<{ 
  booking: TravelAgentBooking; 
  onCancelClick: () => void; 
  onEditClick: () => void;
  onConfirmClick: () => void;
  onDocumentsClick: () => void;
}> = ({ booking, onCancelClick, onEditClick, onConfirmClick, onDocumentsClick }) => {
  const [showPendingAlert, setShowPendingAlert] = useState(false);
  return (
    <>
      <div className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex flex-col gap-3">
      {/* Status Breadcrumb */}
      <StatusBreadcrumb state={booking.state} />

      {/* Tour Info */}
      <div className="flex items-start gap-3 mt-3">
        <img src={booking.tourImageUrl || 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop'} alt={booking.name} className="w-[120px] h-[64px] rounded-lg object-cover flex-shrink-0" />
        <div className="flex flex-col justify-center   min-w-0">
          <h3 className="font-bold text-[18px]  text-[#0B3857]" style={{ fontFamily: 'Nunito, sans-serif' }}>{booking.name}</h3>
          <div className="flex  items-center gap-2 text-[12px] mb-2 text-[#6B7280]" style={{ fontFamily: 'Nunito, sans-serif' }}>
            <svg width="16" height="16" viewBox="0 0 12 12" fill="none">
              <path d="M6 6.5C6.82843 6.5 7.5 5.82843 7.5 5C7.5 4.17157 6.82843 3.5 6 3.5C5.17157 3.5 4.5 4.17157 4.5 5C4.5 5.82843 5.17157 6.5 6 6.5Z" stroke="#6B7280" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 10.5C7.5 9 9 7.5 9 5.5C9 3.84315 7.65685 2.5 6 2.5C4.34315 2.5 3 3.84315 3 5.5C3 7.5 4.5 9 6 10.5Z" stroke="#6B7280" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>{booking.destination}</span>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 gap-6">
        {/* Tour Details */}
        <div>
          <h4 className="font-[800] text-[14px] text-[#0B3857] mb-2.5" style={{ fontFamily: 'Nunito, sans-serif' }}>Tour details</h4>
          <div className="flex flex-col gap-2.5 text-[14px] text-[#0B3857]" style={{ fontFamily: 'Nunito, sans-serif' }}>
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 mt-0.5">
                <rect x="2" y="2.5" width="10" height="9.5" rx="1.5" stroke="#0B3857" strokeWidth="1"/>
                <path d="M9.5 1.75V3.25M4.5 1.75V3.25" stroke="#0B3857" strokeWidth="1" strokeLinecap="round"/>
                <path d="M2 6H12" stroke="#0B3857" strokeWidth="1"/>
              </svg>
              <span>{booking.tourDetails.date}</span>
            </div>
            <div className="flex items-center gap-2">
  <svg
    width="14"
    height="14"
    viewBox="0 0 1000 1000"
    fill="currentColor"
    className="flex-shrink-0 mt-0.5"
  >
    <path d="M239 367q1 25 11.5 42t38.5 37q22 15 33 31t10 35l-23 295v2q0 17 8 31t22 22 30 8 30-8 22-22 8-31q0-4-1-9l-23-288q-1-19 10.5-35t32.5-31q29-20 39.5-38t10.5-45l1-5V157q0-12-9-20t-19.5-6.5-17 9T447 157v107q0 10-6.5 17.5t-17.5 9-19.5-6.5-8.5-19V157q0-10-6.5-17.5t-17.5-9-20 6.5-9 20v107q1 10-6 17.5t-17.5 9T299 284t-9-19V157q0-10-6.5-17.5t-17-9T247 137t-9 20v201zm363 230l54 18q7 2 11 8t3 13l-13 173q-1 7 0 13 2 15 11 26 2 3 6 6 9 8 21 12 16 6 32.5 2.5T757 854q6-6 6-15V184q0-22-12-37.5T724 131q-18 0-38 22-25 27-46 80-17 43-27 87-17 72-23 155-4 54-3 102 0 7 4 12.5t11 7.5z" />
  </svg>
              <span>{booking.tourDetails.mealPlan}</span>
            </div>
            <div className="flex items-center gap-2">
 <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    className="flex-shrink-0 mt-0.5"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M19,4H5A2,2,0,0,0,3,6H3A2,2,0,0,0,5,8H21"
      style={{ fill: 'none', stroke: 'rgb(0, 0, 0)', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2 }}
    />
    <path
      d="M21,8V19a1,1,0,0,1-1,1H4a1,1,0,0,1-1-1V6A2,2,0,0,0,5,8Z"
      style={{ fill: 'none', stroke: 'rgb(0, 0, 0)', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2 }}
    />
    <path
      d="M16,12h5a0,0,0,0,1,0,0v4a0,0,0,0,1,0,0H16a1,1,0,0,1-1-1V13A1,1,0,0,1,16,12Z"
      style={{ fill: 'none', stroke: 'rgb(44, 169, 188)', strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2 }}
    />
  </svg>
              <span className="text-[#0B3857]">Total price <span className="font-[800]">{booking.tourDetails.totalPrice}</span> </span>
            </div>
            {booking.state === 'CANCELED' && (
              <div className="flex flex-col">
                {booking.canceledBy && (
                
                    <span className="text-[12px] text-[#EF4444]" style={{ fontFamily: 'Nunito, sans-serif' }}>
                      <strong>Cancelled by:</strong> {booking.canceledBy}
                    </span>
                 
                )}
                {booking.cancelReason && (
                
                    <span className="text-[12px] text-[#EF4444]" style={{ fontFamily: 'Nunito, sans-serif' }}>
                      <strong>Reason:</strong> {booking.cancelReason}
                    </span>
                
                )}
              </div>
            )}
          </div>
        </div>

        {/* Customer Details */}
        <div>
          <h4 className="font-[800] text-[14px] text-[#0B3857] mb-2.5" style={{ fontFamily: 'Nunito, sans-serif' }}>Customer details</h4>
          <div className="flex flex-col gap-2.5 text-[14px] text-[#0B3857]" style={{ fontFamily: 'Nunito, sans-serif' }}>
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 mt-0.5">
                <path d="M11.5 12.25V11.0833C11.5 10.4645 11.2542 9.87104 10.8166 9.43346C10.379 8.99587 9.78551 8.75 9.16667 8.75H4.83333C4.21449 8.75 3.621 8.99587 3.18342 9.43346C2.74583 9.87104 2.5 10.4645 2.5 11.0833V12.25" stroke="#6B7280" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="7" cy="4.66667" r="2.33333" stroke="#0B3857" strokeWidth="1"/>
              </svg>
              <span>{formatGuestLabel(booking.customerDetails.name)}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 mt-0.5">
                <rect x="1.75" y="3.5" width="10.5" height="7" rx="1" stroke="#6B7280" strokeWidth="1"/>
                <path d="M1.75 5.25L7 8.75L12.25 5.25" stroke="#0B3857" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>{booking.customerDetails.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0 mt-0.5">
                <path d="M8.16667 1.75H3.5C3.27899 1.75 3.06702 1.8378 2.91074 1.99408C2.75446 2.15036 2.66667 2.36232 2.66667 2.58333V11.4167C2.66667 11.6377 2.75446 11.8496 2.91074 12.0059C3.06702 12.1622 3.27899 12.25 3.5 12.25H10.5C10.721 12.25 10.933 12.1622 11.0893 12.0059C11.2455 11.8496 11.3333 11.6377 11.3333 11.4167V5.25L8.16667 1.75Z" stroke="#6B7280" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8.16667 1.75V5.25H11.3333" stroke="#0B3857" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <button
                type="button"
                onClick={onDocumentsClick}
                className="text-[#027EAC] hover:underline font-medium text-left"
                style={{ fontFamily: 'Nunito, sans-serif' }}
              >
                Documents uploaded: {booking.tourDetails.documents}
              </button>
            </div>
          </div>
        </div>
      </div>
    <div className='flex flex-row gap-2 justify-between items-center'>
      {/* Free Cancellation */}
      {booking.freeCancelation && (booking.state === 'BOOKED' || booking.state === 'CONFIRMED') && (
        <div className="flex items-center gap-2 text-[13px] text-[#16A34A] font-medium" style={{ fontFamily: 'Nunito, sans-serif' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M11.6667 3.5L5.25 9.91667L2.33333 7" stroke="#16A34A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className='w-[220px]'>Free cancellation until {new Date(booking.freeCancelation).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end ml-auto">
        {booking.state === 'BOOKED' && (
          <>
            <button 
              onClick={onCancelClick}
              className="px-4 py-2 rounded-lg border-[2px] border-[#027EAC] text-[13px] font-semibold text-[#374151] hover:bg-gray-50 transition-colors" 
              style={{ fontFamily: 'Nunito, sans-serif' }}
            >
              Cancel
            </button>
            <button 
              onClick={onEditClick}
              className="px-4 py-2 rounded-lg border-[2px] border-[#027EAC] text-[13px] font-semibold text-[#374151] hover:bg-gray-50 transition-colors"
              style={{ fontFamily: 'Nunito, sans-serif' }}
            >
              Edit
            </button>
            <div className="relative">
              <button 
                onClick={booking.changeRequestStatus === 'PENDING' ? () => setShowPendingAlert(true) : onConfirmClick}
                className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-colors ${
                  booking.changeRequestStatus === 'PENDING'
                    ? 'bg-[#94a3b8] text-white opacity-60'
                    : 'bg-[#027EAC] text-white hover:bg-[#026a8f]'
                }`} 
                style={{ fontFamily: 'Nunito, sans-serif' }}
              >
                Check and confirm
              </button>
            </div>
          </>
        )}
        {booking.state === 'CONFIRMED' && (
          <>
            <button 
              onClick={onCancelClick}
              className="px-4 py-2 rounded-lg border border-[#D1D5DB] text-[13px] font-semibold text-[#374151] hover:bg-gray-50 transition-colors" 
              style={{ fontFamily: 'Nunito, sans-serif' }}
            >
              Cancel
            </button>
          </>
        )}
        {booking.state === 'STARTED' && (
          <span className="text-[13px] text-[#6B7280]" style={{ fontFamily: 'Nunito, sans-serif' }}>In progress...</span>
        )}
        {booking.state === 'FINISHED' && (
          <span className="text-[13px] text-[#16A34A] font-medium" style={{ fontFamily: 'Nunito, sans-serif' }}>Completed successfully</span>
        )}
      </div>
      </div>
    </div>

    {/* Pending alert popup when agent clicks Check & Confirm while customer hasn't responded */}
    {showPendingAlert && <PendingAlertModal onClose={() => setShowPendingAlert(false)} />}
    </>
  );
};

const TravelAgentBookingsPage: React.FC = () => {
  const { auth, isAuthReady } = useAuth();
  const [activeTab, setActiveTab] = useState<FilterTab>('All tours');
  const [currentPage, setCurrentPage] = useState(0);
  const [cancelingBooking, setCancelingBooking] = useState<TravelAgentBooking | null>(null);
  const [editingBooking, setEditingBooking] = useState<TravelAgentBooking | null>(null);
  const [confirmingBooking, setConfirmingBooking] = useState<TravelAgentBooking | null>(null);
  const [documentsBooking, setDocumentsBooking] = useState<TravelAgentBooking | null>(null);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [bookings, setBookings] = useState<TravelAgentBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const ITEMS_PER_PAGE = 6;

  const refreshBookings = async (signal?: AbortSignal) => {
    if (!auth?.userId) return;

    try {
      const data = await fetchTravelAgentBookings(auth.userId);
      if (signal?.aborted) return;
      setBookings(data);
      setError(null);
    } catch (err) {
      if (!signal?.aborted) {
        setError('Failed to load bookings. Please try again later.');
      }
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    if (!auth?.userId || !auth?.idToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const controller = new AbortController();
    refreshBookings(controller.signal);

    const intervalId = window.setInterval(() => {
      refreshBookings();
    }, 15000);

    const handleFocus = () => {
      refreshBookings();
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      controller.abort();
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthReady, auth?.userId, auth?.idToken]);

  const handleEditBooking = async (updatedBooking: TravelAgentBooking) => {
    try {
      const { date, duration } = parseDateSelection(updatedBooking.tourDetails.date);
      const guestCounts = parseGuestCounts(updatedBooking.tourDetails.guests);

      await agentEditBooking(updatedBooking.id, {
        date,
        duration,
        mealPlan: parseMealCode(updatedBooking.tourDetails.mealPlan),
        guests: guestCounts,
        personalDetails: updatedBooking.personalDetails ?? [],
        changeRequestStatus: 'PENDING',
      });

      // Update local booking with new display values immediately
      setBookings(prevBookings =>
        prevBookings.map(b =>
          b.id === updatedBooking.id
            ? {
                ...b,
                changeRequestStatus: 'PENDING' as const,
                tourDetails: {
                  ...b.tourDetails,
                  date: updatedBooking.tourDetails.date,
                  mealPlan: updatedBooking.tourDetails.mealPlan,
                  guests: updatedBooking.tourDetails.guests,
                  totalPrice: updatedBooking.tourDetails.totalPrice,
                },
                personalDetails: updatedBooking.personalDetails,
              }
            : b
        )
      );
      refreshBookings();
      setShowSuccessNotification(true);
      setTimeout(() => setShowSuccessNotification(false), 5000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save booking changes');
    }
  };

  const handleCancelBooking = async (reason: string) => {
    if (!cancelingBooking) return;

    try {
      await cancelBooking(cancelingBooking.id, reason);
      
      // Update the booking state to CANCELED locally
      setBookings(prevBookings =>
        prevBookings.map(booking =>
          booking.id === cancelingBooking.id
            ? { ...booking, state: 'CANCELED' as BookingState }
            : booking
        )
      );
      refreshBookings();
      
      setShowSuccessNotification(true);
      setTimeout(() => setShowSuccessNotification(false), 5000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to cancel booking: ${errorMessage}`);
    }
  };

  const handleConfirmBooking = async () => {
    if (!confirmingBooking) return;

    try {
      await confirmBooking(confirmingBooking.id);
      
      setBookings(prevBookings =>
        prevBookings.map(booking =>
          booking.id === confirmingBooking.id
            ? { ...booking, state: 'CONFIRMED' as BookingState }
            : booking
        )
      );
      refreshBookings();
      
      setShowSuccessNotification(true);
      setTimeout(() => setShowSuccessNotification(false), 5000);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      alert(`Failed to confirm booking: ${errorMessage}`);
    }
  };

  const filtered = activeTab === 'All tours' ? bookings : bookings.filter(b => b.state === activeTab);
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#E7F9FF' }}>
      <div className="w-full max-w-[1250px] mx-auto px-6 flex flex-col flex-1">
        {/* Filter tabs */}
        <div className="pt-4">
          <div className="relative inline-block">
            <div className="flex items-stretch gap-6 pb-2">
              {FILTER_TABS.map(tab => (
                <button
                  key={tab}
                  onClick={() => { setActiveTab(tab); setCurrentPage(0); }}
                  className={`relative flex items-center text-sm transition-colors whitespace-nowrap ${
                    activeTab === tab
                      ? 'text-[#0B3857] font-bold'
                      : 'text-[#677883] font-medium hover:text-[#0B3857]'
                  }`}
                  style={{ fontFamily: 'Nunito, sans-serif' }}
                >
                  {TAB_LABELS[tab]}
                  {activeTab === tab && (
                    <span className="absolute -bottom-2 left-0 right-0 h-[2px] bg-[#027EAC] rounded-sm z-10" />
                  )}
                </button>
              ))}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-[#A2AEB9]" />
          </div>
        </div>

        {/* Booking grid */}
        <main className="py-6 flex flex-col flex-1">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-[#E5E7EB] p-4 flex flex-col gap-3">
                  {/* Breadcrumb skeleton */}
                  <div className="flex gap-2">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <div key={j} className="h-8 flex-1 rounded" style={{ background: 'linear-gradient(90deg,#D3E1ED 25%,#E7F4FC 50%,#D3E1ED 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                    ))}
                  </div>
                  
                  {/* Tour info skeleton */}
                  <div className="flex items-start gap-3 mt-3">
                    <div className="w-[120px] h-[64px] rounded-lg flex-shrink-0" style={{ background: 'linear-gradient(90deg,#D3E1ED 25%,#E7F4FC 50%,#D3E1ED 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                    <div className="flex flex-col gap-2 flex-1">
                      <div className="h-4 rounded w-3/4" style={{ background: 'linear-gradient(90deg,#D3E1ED 25%,#E7F4FC 50%,#D3E1ED 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                      <div className="h-3 rounded w-1/2" style={{ background: 'linear-gradient(90deg,#D3E1ED 25%,#E7F4FC 50%,#D3E1ED 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                    </div>
                  </div>
                  
                  {/* Details grid skeleton */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                      <div className="h-3 rounded w-1/2 mb-1" style={{ background: 'linear-gradient(90deg,#D3E1ED 25%,#E7F4FC 50%,#D3E1ED 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                      {Array.from({ length: 3 }).map((_, k) => (
                        <div key={k} className="h-3 rounded w-full" style={{ background: 'linear-gradient(90deg,#D3E1ED 25%,#E7F4FC 50%,#D3E1ED 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                      ))}
                    </div>
                    <div className="flex flex-col gap-2">
                      <div className="h-3 rounded w-1/2 mb-1" style={{ background: 'linear-gradient(90deg,#D3E1ED 25%,#E7F4FC 50%,#D3E1ED 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                      {Array.from({ length: 3 }).map((_, k) => (
                        <div key={k} className="h-3 rounded w-full" style={{ background: 'linear-gradient(90deg,#D3E1ED 25%,#E7F4FC 50%,#D3E1ED 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                      ))}
                    </div>
                  </div>
                  
                  {/* Action buttons skeleton */}
                  <div className="flex gap-2 justify-end">
                    <div className="h-9 w-20 rounded-lg" style={{ background: 'linear-gradient(90deg,#D3E1ED 25%,#E7F4FC 50%,#D3E1ED 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                    <div className="h-9 w-20 rounded-lg" style={{ background: 'linear-gradient(90deg,#D3E1ED 25%,#E7F4FC 50%,#D3E1ED 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                    <div className="h-9 w-32 rounded-lg" style={{ background: 'linear-gradient(90deg,#D3E1ED 25%,#E7F4FC 50%,#D3E1ED 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-red-500 text-base" style={{ fontFamily: 'Nunito, sans-serif' }}>
                {error}
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-[#677883] text-base" style={{ fontFamily: 'Nunito, sans-serif' }}>
                No bookings found for this filter.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {paginated.map(booking => (
                  <TravelAgentBookingCard 
                    key={booking.id} 
                    booking={booking} 
                    onCancelClick={() => setCancelingBooking(booking)}
                    onEditClick={() => setEditingBooking(booking)}
                    onConfirmClick={() => setConfirmingBooking(booking)}
                    onDocumentsClick={() => setDocumentsBooking(booking)}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 pt-8">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    className="px-3 py-2 rounded-lg border border-[#D3E1ED] text-sm font-semibold text-[#344054] hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontFamily: 'Nunito, sans-serif' }}
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentPage(i)}
                      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        currentPage === i
                          ? 'bg-[#027EAC] text-white'
                          : 'border border-[#D3E1ED] text-[#344054] hover:bg-white'
                      }`}
                      style={{ fontFamily: 'Nunito, sans-serif' }}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage === totalPages - 1}
                    className="px-3 py-2 rounded-lg border border-[#D3E1ED] text-sm font-semibold text-[#344054] hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontFamily: 'Nunito, sans-serif' }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Cancel Booking Modal */}
      {cancelingBooking && (
        <CancelBookingModal
          booking={cancelingBooking}
          onClose={() => setCancelingBooking(null)}
          onConfirm={handleCancelBooking}
        />
      )}

      {/* Confirm Booking Modal */}
      {confirmingBooking && (
        <ConfirmBookingModal
          booking={confirmingBooking}
          onClose={() => setConfirmingBooking(null)}
          onConfirm={handleConfirmBooking}
        />
      )}

      {/* Documents Modal */}
      {documentsBooking && (
        <DocumentsModal
          booking={documentsBooking}
          onClose={() => setDocumentsBooking(null)}
        />
      )}

      {/* Edit Booking Modal */}
      {editingBooking && (
        <EditBookingModal
          booking={editingBooking}
          onClose={() => setEditingBooking(null)}
          onSave={handleEditBooking}
        />
      )}

      {/* Success Notification */}
      {showSuccessNotification && (
        <SuccessNotification
          message="Action completed successfully."
          onClose={() => setShowSuccessNotification(false)}
        />
      )}
    </div>
  );
};

export default TravelAgentBookingsPage;
