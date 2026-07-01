import React from 'react';
import { Booking, BookingState } from '../types/booking';

interface BookingCardProps {
  booking: Booking;
  onCancel?: (id: string) => void;
  onEdit?: (id: string) => void;
  onUploadDocuments?: (id: string) => void;
  onGiveFeedback?: (id: string) => void;
  onUpdateFeedback?: (id: string) => void;
}

const STATE_ORDER: BookingState[] = ['BOOKED', 'CONFIRMED', 'STARTED', 'FINISHED'];

const VH    = 32;
const STEP_W = 90;  // interval between step start positions
const TIP   = 14;  // how far the tip protrudes INTO the next step

function StatusBreadcrumb({ state }: { state: BookingState }) {
  const steps =
    state === 'CANCELED'
      ? [
          { label: 'Booked',    isActive: true, isCanceled: false },
          { label: 'Confirmed', isActive: true, isCanceled: false },
          { label: 'Canceled',  isActive: true, isCanceled: true  },
        ]
      : STATE_ORDER.map((s, i) => ({
          label: s.charAt(0) + s.slice(1).toLowerCase(),
          isActive: STATE_ORDER.indexOf(state) >= i,
          isCanceled: false,
        }));

  const n = steps.length;
  // Total width = n slots + one extra TIP for the last arrow's tip
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
        {/*
          Draw in REVERSE order so step 0 is painted last (= on top).
          This lets the active first step's tip visibly overlap the inactive second step's notch.
        */}
        {[...steps].reverse().map((step, ri) => {
          const i      = n - 1 - ri;            // true index
          const x0     = i * STEP_W;            // left edge of shape
          const xBody  = x0 + STEP_W;           // where body ends & tip starts
          const xTip   = xBody + TIP;           // tip point (protrudes into next step)
          const xNotch = x0 + TIP;              // notch indent point
          const isFirst = i === 0;

          const fill   = step.isCanceled ? '#ffffff' : step.isActive ? '#ffffff' : '#F7FDFF';
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
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>

      {/* Text labels — each flex slot matches one STEP_W interval */}
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
                gap: 4,
                color: textColor,
                fontSize: 12,
                fontWeight: 600,
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            >
              {step.isCanceled ? (
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : step.isActive ? (
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
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

const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onCancel,
  onEdit,
  onUploadDocuments,
  onGiveFeedback,
  onUpdateFeedback,
}) => {
  const { state, tourImageUrl, name, destination, tourDetails, travelAgent, canceledBy, cancelReason } = booking;

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-3"
      style={{
        transition: 'transform 0.18s ease, box-shadow 0.18s ease',
        boxShadow: '0px 2px 10px 6px #027EAC33',
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
      {/* Status breadcrumb */}
      <StatusBreadcrumb state={state} />

      {/* Tour header: image + name + destination */}
      <div className="flex items-center gap-3">
        <img
          src={tourImageUrl ?? undefined}
          alt={name}
          className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
          onError={e => { (e.target as HTMLImageElement).src = 'https://placehold.co/64x64/e2e8f0/94a3b8?text=Tour'; }}
        />
        <div>
          <p className="font-bold text-gray-900 text-sm leading-snug">{name}</p>
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {destination}
          </div>
        </div>
      </div>

      {/* Two-column: Tour details + Travel agent */}
      <div className="grid grid-cols-2 gap-4">
        {/* Tour details */}
        <div>
          <p className="text-xs font-bold text-gray-800 mb-2">Tour details</p>
          <div className="flex flex-col gap-1.5 text-xs text-[#0B3857]">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                <path d="M5.33325 1.33301V3.99967" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M10.6667 1.33301V3.99967" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12.6667 2.66699H3.33333C2.59695 2.66699 2 3.26395 2 4.00033V13.3337C2 14.07 2.59695 14.667 3.33333 14.667H12.6667C13.403 14.667 14 14.07 14 13.3337V4.00033C14 3.26395 13.403 2.66699 12.6667 2.66699Z" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 6.66699H14" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>{tourDetails.date}</span>
            </div>
            {/* Meal plan */}
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                <path d="M2 1.33301V5.99967C2 6.73301 2.6 7.33301 3.33333 7.33301H6C6.35362 7.33301 6.69276 7.19253 6.94281 6.94248C7.19286 6.69243 7.33333 6.3533 7.33333 5.99967V1.33301" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4.66675 1.33301V14.6663" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14.0001 9.99967V1.33301C13.116 1.33301 12.2682 1.6842 11.6431 2.30932C11.0179 2.93444 10.6667 3.78229 10.6667 4.66634V8.66634C10.6667 9.39967 11.2667 9.99967 12.0001 9.99967H14.0001ZM14.0001 9.99967V14.6663" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>{tourDetails.mealPlan}</span>
            </div>
            {/* Guests */}
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                <path d="M12.6666 14V12.6667C12.6666 11.9594 12.3856 11.2811 11.8855 10.781C11.3854 10.281 10.7072 10 9.99992 10H5.99992C5.29267 10 4.6144 10.281 4.1143 10.781C3.6142 11.2811 3.33325 11.9594 3.33325 12.6667V14" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7.99992 7.33333C9.47268 7.33333 10.6666 6.13943 10.6666 4.66667C10.6666 3.19391 9.47268 2 7.99992 2C6.52716 2 5.33325 3.19391 5.33325 4.66667C5.33325 6.13943 6.52716 7.33333 7.99992 7.33333Z" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>{tourDetails.guests}</span>
            </div>
            {/* Total price */}
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                <path d="M12.6667 4.66667V2.66667C12.6667 2.48986 12.5964 2.32029 12.4714 2.19526C12.3464 2.07024 12.1768 2 12 2H3.33333C2.97971 2 2.64057 2.14048 2.39052 2.39052C2.14048 2.64057 2 2.97971 2 3.33333C2 3.68696 2.14048 4.02609 2.39052 4.27614C2.64057 4.52619 2.97971 4.66667 3.33333 4.66667H13.3333C13.5101 4.66667 13.6797 4.7369 13.8047 4.86193C13.9298 4.98695 14 5.15652 14 5.33333V8M14 8H12C11.6464 8 11.3072 8.14048 11.0572 8.39052C10.8071 8.64057 10.6667 8.97971 10.6667 9.33333C10.6667 9.68696 10.8071 10.0261 11.0572 10.2761C11.3072 10.5262 11.6464 10.6667 12 10.6667H14C14.1768 10.6667 14.3464 10.5964 14.4714 10.4714C14.5964 10.3464 14.6667 10.1768 14.6667 10V8.66667C14.6667 8.48986 14.5964 8.32029 14.4714 8.19526C14.3464 8.07024 14.1768 8 14 8Z" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 3.33301V12.6663C2 13.02 2.14048 13.3591 2.39052 13.6092C2.64057 13.8592 2.97971 13.9997 3.33333 13.9997H13.3333C13.5101 13.9997 13.6797 13.9294 13.8047 13.8044C13.9298 13.6794 14 13.5098 14 13.333V10.6663" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Total price <strong>{tourDetails.totalPrice}</strong></span>
            </div>
            {/* Documents */}
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                <path d="M10.0001 1.33301H4.00008C3.64646 1.33301 3.30732 1.47348 3.05727 1.72353C2.80722 1.97358 2.66675 2.31272 2.66675 2.66634V13.333C2.66675 13.6866 2.80722 14.0258 3.05727 14.2758C3.30732 14.5259 3.64646 14.6663 4.00008 14.6663H12.0001C12.3537 14.6663 12.6928 14.5259 12.9429 14.2758C13.1929 14.0258 13.3334 13.6866 13.3334 13.333V4.66634L10.0001 1.33301Z" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9.33325 1.33301V3.99967C9.33325 4.3533 9.47373 4.69244 9.72378 4.94248C9.97383 5.19253 10.313 5.33301 10.6666 5.33301H13.3333" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Documents uploaded: {tourDetails.documents}</span>
            </div>
          </div>
        </div>

        {/* Travel agent */}
        <div>
          <p className="text-xs font-bold text-gray-800 mb-2">Travel agent</p>
          <div className="flex flex-col gap-1.5 text-xs text-[#0B3857]">
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                <path d="M10.6667 1.33301V2.66634" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4.66675 14.6667V13.3333C4.66675 12.9797 4.80722 12.6406 5.05727 12.3905C5.30732 12.1405 5.64646 12 6.00008 12H10.0001C10.3537 12 10.6928 12.1405 10.9429 12.3905C11.1929 12.6406 11.3334 12.9797 11.3334 13.3333V14.6667" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M5.33325 1.33301V2.66634" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 9.33301C9.10457 9.33301 10 8.43758 10 7.33301C10 6.22844 9.10457 5.33301 8 5.33301C6.89543 5.33301 6 6.22844 6 7.33301C6 8.43758 6.89543 9.33301 8 9.33301Z" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12.6667 2.66699H3.33333C2.59695 2.66699 2 3.26395 2 4.00033V13.3337C2 14.07 2.59695 14.667 3.33333 14.667H12.6667C13.403 14.667 14 14.07 14 13.3337V4.00033C14 3.26395 13.403 2.66699 12.6667 2.66699Z" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>{travelAgent.name ?? <span className="italic text-gray-400">Not assigned yet</span>}</span>
            </div>
            {/* Email */}
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                <path d="M13.3333 2.66699H2.66659C1.93021 2.66699 1.33325 3.26395 1.33325 4.00033V12.0003C1.33325 12.7367 1.93021 13.3337 2.66659 13.3337H13.3333C14.0696 13.3337 14.6666 12.7367 14.6666 12.0003V4.00033C14.6666 3.26395 14.0696 2.66699 13.3333 2.66699Z" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M14.6666 4.66699L8.68659 8.46699C8.48077 8.59594 8.2428 8.66433 7.99992 8.66433C7.75704 8.66433 7.51907 8.59594 7.31325 8.46699L1.33325 4.66699" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="truncate">{travelAgent.email ?? <span className="italic text-gray-400">—</span>}</span>
            </div>
            {/* Phone */}
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                <g clipPath="url(#clip0_phone)">
                  <path d="M14.6667 11.2797V13.2797C14.6675 13.4654 14.6294 13.6492 14.555 13.8193C14.4807 13.9894 14.3716 14.1421 14.2348 14.2676C14.0979 14.3932 13.9364 14.4887 13.7605 14.5482C13.5847 14.6077 13.3983 14.6298 13.2134 14.6131C11.1619 14.3902 9.19137 13.6892 7.46004 12.5664C5.84926 11.5428 4.48359 10.1772 3.46004 8.56641C2.33336 6.82721 1.6322 4.84707 1.41337 2.78641C1.39671 2.60205 1.41862 2.41625 1.4777 2.24082C1.53679 2.0654 1.63175 1.9042 1.75655 1.76749C1.88134 1.63077 2.03324 1.52155 2.20256 1.44675C2.37189 1.37196 2.55493 1.33325 2.74004 1.33307H4.74004C5.06357 1.32989 5.37723 1.44446 5.62254 1.65543C5.86786 1.8664 6.02809 2.15937 6.07337 2.47974C6.15779 3.11978 6.31434 3.74822 6.54004 4.35307C6.62973 4.59169 6.64915 4.85102 6.59597 5.10033C6.5428 5.34964 6.41928 5.57848 6.24004 5.75974L5.39337 6.60641C6.34241 8.27544 7.72434 9.65737 9.39337 10.6064L10.24 9.75974C10.4213 9.5805 10.6501 9.45697 10.8994 9.4038C11.1488 9.35063 11.4081 9.37004 11.6467 9.45974C12.2516 9.68544 12.88 9.84199 13.52 9.92641C13.8439 9.97209 14.1396 10.1352 14.3511 10.3847C14.5625 10.6343 14.6748 10.9528 14.6667 11.2797Z" stroke="#0B3857" strokeWidth="1.16667" strokeLinecap="round" strokeLinejoin="round"/>
                </g>
                <defs>
                  <clipPath id="clip0_phone">
                    <rect width="16" height="16" fill="white"/>
                  </clipPath>
                </defs>
              </svg>
              <span>{travelAgent.phone ?? <span className="italic text-gray-400">—</span>}</span>
            </div>
            {/* Messenger */}
            <div className="flex items-center gap-2">
              <svg width="16" height="16" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
                <defs>
                  <radialGradient id="msg-icon-grad" cx="19.26%" cy="99.54%" r="108.56%">
                    <stop offset="0%" stopColor="#0099FF"/>
                    <stop offset="61%" stopColor="#A033FF"/>
                    <stop offset="93%" stopColor="#FF5280"/>
                    <stop offset="100%" stopColor="#FF7061"/>
                  </radialGradient>
                </defs>
                <circle cx="18" cy="18" r="18" fill="url(#msg-icon-grad)"/>
                <path fill="white" d="M18 7.5C12.2 7.5 7.5 11.84 7.5 17.25c0 3.14 1.56 5.94 4 7.78v3.47l3.64-2c.97.27 2 .41 3.36.41 5.8 0 10.5-4.34 10.5-9.75S23.8 7.5 18 7.5zm1.01 13.13l-2.72-2.91-5.3 2.91 5.84-6.21 2.79 2.9 5.27-2.9-5.88 6.21z"/>
              </svg>
              {travelAgent.messenger
                ? <a href={travelAgent.messenger} className="text-[#1a6b8c] underline" target="_blank" rel="noreferrer">Messenger</a>
                : <span className="italic text-gray-400">—</span>
              }
            </div>
          </div>
        </div>
      </div>

      {/* Canceled info */}
      {state === 'CANCELED' && (canceledBy || cancelReason) && (
        <div className="flex flex-col gap-0.5 text-xs">
          <p><span className="font-bold" style={{ color: '#B70B0B' }}>Cancelled by:</span> <span style={{ color: '#B70B0B' }}>{canceledBy ?? '—'}</span></p>
          <p><span className="font-bold" style={{ color: '#B70B0B' }}>Reason:</span> <span style={{ color: '#B70B0B' }}>{cancelReason ?? '—'}</span></p>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 justify-end flex-wrap">
        {(state === 'BOOKED' || state === 'CONFIRMED') && (
          <button
            onClick={() => onCancel?.(booking.id)}
            className="px-4 py-1.5 rounded-lg border-2 border-[#1a6b8c] text-[#1a6b8c] text-xs font-semibold hover:bg-[#E7F9FF] transition-colors"
          >
            Cancel
          </button>
        )}
        {state === 'BOOKED' && (
          <>
            <button
              onClick={() => onEdit?.(booking.id)}
              className="px-4 py-1.5 rounded-lg border-2 border-[#1a6b8c] text-[#1a6b8c] text-xs font-semibold hover:bg-[#E7F9FF] transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => onUploadDocuments?.(booking.id)}
              className="px-4 py-1.5 rounded-lg bg-[#1a6b8c] text-white text-xs font-semibold hover:bg-[#155a77] transition-colors"
            >
              {tourDetails.documents && parseInt(tourDetails.documents) > 0 ? 'Update documents' : 'Upload documents'}
            </button>
          </>
        )}
        {(state === 'STARTED' || state === 'FINISHED') && (
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={() => booking.feedbackRating ? onUpdateFeedback?.(booking.id) : onGiveFeedback?.(booking.id)}
              className={`px-4 py-1.5 rounded-lg text-white text-xs font-semibold transition-colors ${
                booking.feedbackFlagged
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-[#1a6b8c] hover:bg-[#155a77]'
              }`}
            >
              {booking.feedbackRating ? 'Update feedback' : 'Give feedback'}
            </button>
            {booking.feedbackFlagged && (
              <p className="text-xs text-red-600 font-medium text-right">
                Your review was flagged — please update it.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingCard;
