import { useState } from 'react'
import ReactDOM from 'react-dom'
import { Breadcrumb, BookingSidebar, Hero, ReviewSection } from '../components'
import { FALLBACK_IMAGE, REVIEW_SORT_OPTIONS } from '../constants'
import { useAuth } from '../context/AuthContext'
import { useBooking } from '../context/BookingContext'
import { useRouter } from '../context/RouterContext'
import { useTourDetail } from '../hooks/useTourDetail'
import { formatDate, initials } from '../utils/formatters'
import ReservationFormModal, { TourInfo } from '../components/ReservationFormModal'
import AuthPromptModal from '../components/AuthPromptModal'

export default function TourDetailPage() {
  const { setRoute } = useRouter()
  const { isLoggedIn, auth } = useAuth()
  const {
    bookingDate, setBookingDate,
    bookingDuration, setBookingDuration,
    bookingMealPlan, setBookingMealPlan,
    bookingAdults, setBookingAdults,
    bookingChildren, setBookingChildren,
    dateDurationOptions,
    totalPrice,
  } = useBooking()

  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [confirmation, setConfirmation] = useState<{ freeCancelation: string; details: string; meta: { tourName: string; date: string; duration: string; meal: string; guests: string } } | null>(null)

  const {
    tour,
    tourError,
    loadingTour,
    reviews,
    reviewsError,
    loadingReviews,
    reviewSort, setReviewSort,
    reviewPage, setReviewPage,
    reviewTotalPages,
  } = useTourDetail()

  const tourInfo: TourInfo | null = tour ? {
    id: tour.id,
    name: tour.name,
    destination: tour.destination,
    rating: tour.rating,
    startDates: tour.startDates ?? [],
    durations: tour.durations ?? [],
    mealPlans: tour.mealPlans ?? [],
    price: tour.price ?? {},
    mealSupplementsPerDay: tour.mealSupplementsPerDay ?? {},
    guestQuantity: {
      adultsMaxValue: tour.guestQuantity?.adultsMaxValue ?? 10,
      childrenMaxValue: tour.guestQuantity?.childrenMaxValue ?? 0,
    },
  } : null

  return (
    <main>
      {/* Breadcrumb */}
      <div className="content-grid" style={{ marginTop: 24 }}>
        <Breadcrumb tourTitle={tour?.name || 'Loading...'} />
      </div>
      {/* Hero section */}
      <Hero
        title={tour?.name || 'Loading...'}
        destination={tour?.destination || ''}
        rating={tour?.rating || 0}
        imageUrls={tour?.imageUrls}
        loading={loadingTour}
      />

      {tourError && <p className="status-error">{tourError}</p>}

      {!loadingTour && tour && (
        <div className="content-grid">
          <article className="about-card">
            <p className="about-subtitle">{tour.summary || 'Experience the excitement among the wonders of the Brenta Dolomites! Unforgettable excursions, breathtaking views, adventure in a paradise.'}</p>
            <h3>About the tour</h3>
            <div className="about-lines">
              <div className="about-item">
                <strong>Free cancellation policy</strong>
                <span>Free cancellation until {tour.freeCancelationDaysBefore || 10} days before start date</span>
              </div>
              <div className="about-item">
                <strong>Duration - {(tour.durations || []).join(', ')}</strong>
              </div>
              <div className="about-item">
                <strong>Accommodation</strong>
                <span>{tour.accomodiation || tour.hotelDescription || 'Quality accommodation provided throughout the tour.'}</span>
              </div>
              <div className="about-item">
                <strong>Meal plans</strong>
                <span>{(tour.mealPlans || []).join(', ')}.</span>
              </div>
              {Object.entries(tour.customDetails || {}).map(([key, val]) => (
                <div className="about-item" key={key}>
                  <strong>{key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, c => c.toUpperCase())}</strong>
                  <span>{val}</span>
                </div>
              ))}
            </div>
          </article>

          {auth?.role !== 'TRAVEL_AGENT' && (
            <BookingSidebar
              tour={tour}
              loading={loadingTour}
              selectedDate={bookingDate}
              selectedDuration={bookingDuration}
              selectedMealPlan={bookingMealPlan}
              selectedAdults={bookingAdults}
              selectedChildren={bookingChildren}
              dateDurationOptions={dateDurationOptions}
              totalPrice={totalPrice}
              onDateDurationChange={(date, dur) => { setBookingDate(date); setBookingDuration(dur) }}
              onAdultsChange={setBookingAdults}
              onChildrenChange={setBookingChildren}
              onMealPlanChange={setBookingMealPlan}
              onBook={() => isLoggedIn ? setShowBookingForm(true) : setShowAuthPrompt(true)}
              isBooking={false}
              isLoggedIn={isLoggedIn}
              bookingMessage=""
              bookingError=""
            />
          )}
        </div>
      )}

      <ReviewSection
        reviews={reviews}
        loading={loadingReviews}
        error={reviewsError}
        sortValue={reviewSort}
        onSortChange={(val) => { setReviewSort(val); setReviewPage(1) }}
        sortOptions={REVIEW_SORT_OPTIONS}
        formatDate={formatDate}
        initials={initials}
        reviewPage={reviewPage}
        onReviewPageChange={setReviewPage}
        totalPages={reviewTotalPages}
      />

      {/* Auth prompt for unauthenticated users */}
      {showAuthPrompt && (
        <AuthPromptModal
          onClose={() => setShowAuthPrompt(false)}
          onSignIn={() => { setShowAuthPrompt(false); setRoute({ view: 'login', tourId: '' }) }}
          onCreateAccount={() => { setShowAuthPrompt(false); setRoute({ view: 'signup', tourId: '' }) }}
        />
      )}

      {/* Reservation form modal */}
      {showBookingForm && tourInfo && (
        <ReservationFormModal
          tour={tourInfo}
          userId={auth?.userId ?? ''}
          token={auth?.idToken ?? ''}
          initialAdults={bookingAdults}
          mockApi={false}
          onClose={() => setShowBookingForm(false)}
          onSuccess={(freeCancelation, details, meta) => {
            setShowBookingForm(false)
            setConfirmation({ freeCancelation, details, meta })
          }}
        />
      )}

      {/* Booking confirmation */}
      {confirmation && ReactDOM.createPortal(
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 px-4" style={{ zIndex: 9999 }} onClick={() => setConfirmation(null)}>
          <div
            className="relative bg-white shadow-xl flex flex-col"
            style={{ width: 544, maxWidth: 'calc(100vw - 32px)', borderRadius: 12, padding: 24, gap: 32 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Booking confirmation</h2>
              <button onClick={() => setConfirmation(null)} className="text-gray-400 hover:text-gray-600" aria-label="Close">
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
    </main>
  )
}
