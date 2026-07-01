import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import SignInModal from '../SignInModal';
import { Star, MapPin, AlertCircle } from 'lucide-react';
import type { Tour, MealPlan } from '../../types/tour.types';
import { C, NUNITO } from '../../constants/theme';
import { useAuth } from '../../../../context/AuthContext';
import { useRouter } from '../../../../context/RouterContext';
import ReservationFormModal, { TourInfo } from '../../../../components/ReservationFormModal';
import AuthPromptModal from '../../../../components/AuthPromptModal';

interface TourCardProps {
  tour: Tour;
}

const MEAL_LABEL: Record<MealPlan, string> = {
  BB: 'Breakfast (BB)',
  HB: 'Half-board (HB)',
  FB: 'Full-board (FB)',
  AI: 'All inclusive (AI)',
};

const txt = (weight: 400 | 700 | 800 = 400, color: string = '#0B3857'): React.CSSProperties => ({
  fontFamily: NUNITO, fontWeight: weight, fontSize: 'clamp(13px, 1.1vw, 14px)', lineHeight: 'clamp(20px, 1.8vw, 24px)', letterSpacing: 0, color,
});

const InfoRow: React.FC<{ icon: React.ReactNode; align?: string; children: React.ReactNode }> = ({
  icon, align = 'center', children,
}) => <div className="flex" style={{ gap: 'clamp(4px, 0.6vw, 8px)', alignItems: align === 'start' ? 'flex-start' : 'center' }}><div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', height: 'clamp(16px, 1.8vw, 24px)' }}>{icon}</div>{children}</div>;

const ICON_SIZE = 'clamp(14px, 1.2vw, 16px)';

const i16 = (Icon: React.ElementType, color = '#0B3857') => (
  <Icon style={{ width: ICON_SIZE, height: ICON_SIZE, flexShrink: 0 }} color={color} strokeWidth={1.8} />
);

const TourCard: React.FC<TourCardProps> = ({ tour }) => {
  const { setRoute } = useRouter();
  const { isLoggedIn, auth } = useAuth();
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmation, setConfirmation] = useState<{ freeCancelation: string; details: string; meta: { tourName: string; date: string; duration: string; meal: string; guests: string } } | null>(null);
  const startDate = new Date(tour.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const durationText = tour.durationOptions.map(d => `${d} days`).join(', ');
  const mealText = tour.mealPlans.map(m => MEAL_LABEL[m]).join(', ');
  const cancellationDate = tour.freeCancellationUntil
    ? new Date(tour.freeCancellationUntil).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    : null;

  return (
    <>
    <div
      className="flex flex-col sm:flex-row sm:h-[320px]"
      style={{
        width: '100%',
        borderRadius: 12,
        padding: 'clamp(10px, 1.5vw, 18px)',
        gap: 'clamp(10px, 1.5vw, 18px)',
        background: '#FFFFFF',
        boxShadow: '0px 2px 10px 6px #027EAC33',
        boxSizing: 'border-box',
        overflow: 'hidden',
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0px 6px 20px 6px #027EAC44';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0px 2px 10px 6px #027EAC33';
      }}
    >

      {/* Image */}
      <div className="w-full sm:w-[37.7%] aspect-[16/9] sm:aspect-auto sm:h-full flex-shrink-0" style={{ borderRadius: 12, overflow: 'hidden', background: '#E7F9FF' }}>
        <img src={tour.imageUrl} alt={tour.title} className="w-full h-full object-cover" />
      </div>

      {/* Content */}
      <div className="flex flex-col" style={{ flex: 1, minWidth: 0, minHeight: 0, justifyContent: 'space-between', overflow: 'hidden' }}>
        <div className="flex flex-col" style={{ gap: 'clamp(4px, 0.6vw, 8px)', flex: 1, minHeight: 0 }}>

          {/* Title + Location + Rating */}
          <div className="flex items-start justify-between gap-2">
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2 style={{
                fontFamily: NUNITO, fontWeight: 700, fontSize: 'clamp(13px, 1.3vw, 18px)',
                lineHeight: 'clamp(20px, 2.2vw, 32px)', letterSpacing: 0, color: '#0B3857',
                margin: 0, padding: 0, overflow: 'hidden',
                whiteSpace: 'nowrap', textOverflow: 'ellipsis',
              }}>
                {tour.title}
              </h2>
              <div className="flex items-center" style={{ gap: 'clamp(3px, 0.4vw, 6px)' }}>
                <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" style={{ width: ICON_SIZE, height: ICON_SIZE, flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span style={{
                  fontFamily: NUNITO, fontWeight: 400, fontSize: 'clamp(9px, 0.9vw, 12px)',
                  lineHeight: 'clamp(12px, 1.2vw, 16px)', letterSpacing: 0, color: '#677883',
                  flex: 1, minWidth: 0,
                  overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                }}>
                  {tour.destination}
                </span>
              </div>
            </div>

            <div className="flex flex-col items-end flex-shrink-0">
              <div className="flex items-center gap-1">
                <Star style={{ width: ICON_SIZE, height: ICON_SIZE }} fill="#0B3857" stroke="#0B3857" />
                <span style={{ ...txt(800), fontSize: 'clamp(11px, 1.1vw, 14px)' }}>{tour.rating.toFixed(1)}</span>
              </div>
              <span style={{ fontFamily: NUNITO, fontSize: 'clamp(9px, 0.9vw, 12px)', color: C.textMuted }}>{tour.reviewCount} reviews</span>
            </div>
          </div>

          <div className="flex flex-col" style={{ gap: 'clamp(4px, 0.6vw, 8px)', marginTop: 'clamp(4px, 0.6vw, 8px)' }}>
          <InfoRow icon={
            <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <path d="M5.33325 1.33301V3.99967" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10.6667 1.33301V3.99967" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12.6667 2.66699H3.33333C2.59695 2.66699 2 3.26395 2 4.00033V13.3337C2 14.07 2.59695 14.667 3.33333 14.667H12.6667C13.403 14.667 14 14.07 14 13.3337V4.00033C14 3.26395 13.403 2.66699 12.6667 2.66699Z" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 6.66699H14" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }>
            <span style={txt()}>{startDate} ({durationText})</span>
          </InfoRow>

          <InfoRow icon={
            <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <path d="M2 1.33301V5.99967C2 6.73301 2.6 7.33301 3.33333 7.33301H6C6.35362 7.33301 6.69276 7.19253 6.94281 6.94248C7.19286 6.69243 7.33333 6.3533 7.33333 5.99967V1.33301" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4.66675 1.33301V14.6663" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14.0001 9.99967V1.33301C13.116 1.33301 12.2682 1.6842 11.6431 2.30932C11.0179 2.93444 10.6667 3.78229 10.6667 4.66634V8.66634C10.6667 9.39967 11.2667 9.99967 12.0001 9.99967H14.0001ZM14.0001 9.99967V14.6663" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          } align="start">
            <span style={{ ...txt(), overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{mealText}</span>
          </InfoRow>

          <InfoRow icon={
            <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <path d="M12.6667 4.66667V2.66667C12.6667 2.48986 12.5964 2.32029 12.4714 2.19526C12.3464 2.07024 12.1768 2 12 2H3.33333C2.97971 2 2.64057 2.14048 2.39052 2.39052C2.14048 2.64057 2 2.97971 2 3.33333C2 3.68696 2.14048 4.02609 2.39052 4.27614C2.64057 4.52619 2.97971 4.66667 3.33333 4.66667H13.3333C13.5101 4.66667 13.6797 4.7369 13.8047 4.86193C13.9298 4.98695 14 5.15652 14 5.33333V8M14 8H12C11.6464 8 11.3072 8.14048 11.0572 8.39052C10.8071 8.64057 10.6667 8.97971 10.6667 9.33333C10.6667 9.68696 10.8071 10.0261 11.0572 10.2761C11.3072 10.5262 11.6464 10.6667 12 10.6667H14C14.1768 10.6667 14.3464 10.5964 14.4714 10.4714C14.5964 10.3464 14.6667 10.1768 14.6667 10V8.66667C14.6667 8.48986 14.5964 8.32029 14.4714 8.19526C14.3464 8.07024 14.1768 8 14 8Z" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 3.33301V12.6663C2 13.02 2.14048 13.3591 2.39052 13.6092C2.64057 13.8592 2.97971 13.9997 3.33333 13.9997H13.3333C13.5101 13.9997 13.6797 13.9294 13.8047 13.8044C13.9298 13.6794 14 13.5098 14 13.333V10.6663" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          }>
            <span style={txt(400)}>
              From <strong style={{ fontWeight: 800 }}>${tour.pricePerPerson.toLocaleString()}</strong> for 1 person
            </span>
          </InfoRow>

          {cancellationDate ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ ...txt(400, C.green), display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 'clamp(13px, 1.1vw, 15px)', lineHeight: 1 }}>✓</span>
                Free cancellation until {cancellationDate}
              </span>
            </div>
          ) : (
            <InfoRow icon={<AlertCircle style={{ width: ICON_SIZE, height: ICON_SIZE, flexShrink: 0 }} color={C.red} strokeWidth={2} />}>
              <span style={txt(700, C.red)}>Free cancellation is no longer available</span>
            </InfoRow>
          )}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap justify-end" style={{ gap: 'clamp(8px, 1vw, 12px)', marginTop: 8, flexShrink: 0 }}>
          <button
            onClick={() => setRoute({ view: 'details', tourId: tour.id })}
            className="transition-colors hover:bg-[#E7F9FF]"
            style={{ fontFamily: NUNITO, fontWeight: 700, fontSize: 'clamp(11px, 1vw, 14px)', height: 'clamp(30px, 3vw, 40px)', border: `1.5px solid ${C.primary}`, color: C.primary, background: '#FFFFFF', borderRadius: 8, padding: '0 clamp(8px, 1.2vw, 16px)', whiteSpace: 'nowrap' }}>
            See details
          </button>
          {auth?.role !== 'TRAVEL_AGENT' && (
            <button
              onClick={() => isLoggedIn ? setShowBookingForm(true) : setShowAuthPrompt(true)}
              className="text-white transition-opacity hover:opacity-90"
              style={{ fontFamily: NUNITO, fontWeight: 700, fontSize: 'clamp(11px, 1vw, 14px)', height: 'clamp(30px, 3vw, 40px)', background: C.primary, borderRadius: 8, padding: '0 clamp(8px, 1.2vw, 16px)', whiteSpace: 'nowrap' }}>
              Book the tour
            </button>
          )}
          {showSignInModal && <SignInModal onClose={() => setShowSignInModal(false)} />}
        </div>
      </div>
    </div>

    {/* Auth prompt — shown when not logged in */}
    {showAuthPrompt && (
      <AuthPromptModal
        onClose={() => setShowAuthPrompt(false)}
        onSignIn={() => { setShowAuthPrompt(false); setRoute({ view: 'login', tourId: '' }); }}
        onCreateAccount={() => { setShowAuthPrompt(false); setRoute({ view: 'signup', tourId: '' }); }}
      />
    )}

    {/* Reservation form */}
    {showBookingForm && (() => {
      // Build price map: use the real priceMap from backend.
      // If priceMap is empty fall back to duration-keyed map with pricePerPerson.
      const priceMap = Object.keys(tour.priceMap).length > 0
        ? tour.priceMap
        : Object.fromEntries(tour.durationOptions.map(d => [`${d} days`, String(tour.pricePerPerson)]));

      const tourInfo: TourInfo = {
        id: tour.id,
        name: tour.title,
        destination: tour.destination,
        rating: tour.rating,
        startDates: tour.startDates.length > 0 ? tour.startDates : [tour.startDate],
        durations: tour.durationOptions.map(d => `${d} days`),
        mealPlans: tour.mealPlanLabels,
        price: priceMap,
        mealSupplementsPerDay: tour.mealSupplementsPerDay,
        guestQuantity: {
          adultsMaxValue: tour.guestQuantity.adultsMaxValue || 8,
          childrenMaxValue: tour.guestQuantity.childrenMaxValue,
        },
      };
      return (
        <ReservationFormModal
          tour={tourInfo}
          userId={auth?.userId ?? ''}
          token={auth?.idToken ?? ''}
          mockApi={false}
          onClose={() => setShowBookingForm(false)}
          onSuccess={(freeCancelation, details, meta) => {
            setShowBookingForm(false);
            setConfirmation({ freeCancelation, details, meta });
            setShowConfirmation(true);
          }}
        />
      );
    })()}

    {/* Booking confirmation */}
    {showConfirmation && confirmation && ReactDOM.createPortal(
      <div className="fixed inset-0 flex items-center justify-center bg-black/50 px-4" style={{ zIndex: 9999 }} onClick={() => setShowConfirmation(false)}>
        <div className="relative bg-white shadow-xl flex flex-col" style={{ width: 544, maxWidth: 'calc(100vw - 32px)', minHeight: 296, borderRadius: 12, padding: 24, gap: 32 }} onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Booking confirmation</h2>
            <button onClick={() => setShowConfirmation(false)} className="text-gray-800 hover:text-gray-900" aria-label="Close">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex flex-col" style={{ gap: 16 }}>
            <div className="rounded-lg px-4 py-3 text-sm text-gray-700" style={{ backgroundColor: '#fefde8', border: '1px solid #f0e68c' }}>
              Free cancellation is possible until {new Date(confirmation.freeCancelation + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}.
            </div>
            <p className="text-sm text-[#0B3857] leading-relaxed">
              You have booked a tour at <strong>{confirmation.meta.tourName}</strong>, starting date{' '}
              <strong>{confirmation.meta.date}</strong> (<strong>{confirmation.meta.duration}</strong>),{' '}
              <strong>{confirmation.meta.meal}</strong> for <strong>{confirmation.meta.guests}</strong> successfully.
              {' '}Please upload your travel documents to the booking on the 'My Tours' page and wait for the Travel Agent to contact you.
            </p>
          </div>
        </div>
      </div>,
      document.body
    )}
  </>
  );
};

export default TourCard;
