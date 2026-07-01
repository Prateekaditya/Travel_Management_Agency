import { createContext, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Tour, PersonalDetail, DateDurationOption } from '../types'
import { postBooking } from '../api'
import { normalizePrice, formatDate } from '../utils/formatters'
import { useAuth } from './AuthContext'

interface BookingContextValue {
  bookingTour: Tour | null
  bookingDate: string
  setBookingDate: (v: string) => void
  bookingDuration: string
  setBookingDuration: (v: string) => void
  bookingMealPlan: string
  setBookingMealPlan: (v: string) => void
  bookingAdults: number
  setBookingAdults: (v: number) => void
  bookingChildren: number
  setBookingChildren: (v: number) => void
  personalDetails: PersonalDetail[]
  setPersonalDetails: (v: PersonalDetail[]) => void
  dateDurationOptions: DateDurationOption[]
  totalPrice: string
  isBooking: boolean
  bookingMessage: string
  bookingError: string
  initializeFromTour: (tour: Tour) => void
  handleBooking: () => void
}

const BookingContext = createContext<BookingContextValue | null>(null)

export function BookingProvider({ children }: { children: ReactNode }) {
  const { auth, isLoggedIn, effectiveUserId } = useAuth()

  const [bookingTour, setBookingTour] = useState<Tour | null>(null)
  const [bookingDate, setBookingDate] = useState('')
  const [bookingDuration, setBookingDuration] = useState('')
  const [bookingMealPlan, setBookingMealPlan] = useState('')
  const [bookingAdults, setBookingAdultsRaw] = useState(1)
  const [bookingChildren, setBookingChildrenRaw] = useState(0)
  const [personalDetails, setPersonalDetails] = useState<PersonalDetail[]>([{ firstName: '', lastName: '' }])

  function resizePersonalDetails(adults: number, children: number) {
    const total = adults + children
    setPersonalDetails(prev => {
      const updated = [...prev]
      while (updated.length < total) updated.push({ firstName: '', lastName: '' })
      while (updated.length > total) updated.pop()
      return updated
    })
  }

  function setBookingAdults(count: number) {
    setBookingAdultsRaw(count)
    resizePersonalDetails(count, bookingChildren)
  }

  function setBookingChildren(count: number) {
    setBookingChildrenRaw(count)
    resizePersonalDetails(bookingAdults, count)
  }
  const [isBooking, setIsBooking] = useState(false)
  const [bookingMessage, setBookingMessage] = useState('')
  const [bookingError, setBookingError] = useState('')

  const totalPrice = useMemo(() => {
    if (!bookingTour || !bookingDuration) return '$0'
    const base = normalizePrice(bookingTour.price?.[bookingDuration])
    const mealCode = (bookingMealPlan.match(/\(([^)]+)\)/)?.[1] || '').trim()
    const supplement = normalizePrice(bookingTour.mealSupplementsPerDay?.[mealCode])
    const days = Number(bookingDuration.match(/\d+/)?.[0]) || 1
    const childPriceRaw = bookingTour.price?.['child'] || bookingTour.price?.['Child']
    const childBase = childPriceRaw ? normalizePrice(childPriceRaw) : base
    const totalGuests = bookingAdults + bookingChildren
    const total = base * bookingAdults + childBase * bookingChildren + supplement * days * totalGuests
    return `$${total.toLocaleString()}`
  }, [bookingAdults, bookingChildren, bookingDuration, bookingMealPlan, bookingTour])

  const dateDurationOptions = useMemo<DateDurationOption[]>(() => {
    const startDates = bookingTour?.startDates || []
    const durations = bookingTour?.durations || []
    if (!startDates.length && !durations.length) return []
    if (!durations.length) {
      return startDates.map(startDate => ({
        key: `${startDate}|`, startDate, duration: '', label: formatDate(startDate),
      }))
    }
    return startDates.flatMap(startDate =>
      durations.map(duration => ({
        key: `${startDate}|${duration}`, startDate, duration,
        label: `${formatDate(startDate)}, ${duration}`,
      }))
    )
  }, [bookingTour])

  function initializeFromTour(tourData: Tour) {
    setBookingTour(tourData)
    setBookingDate(tourData.startDates?.[0] || '')
    setBookingDuration(tourData.durations?.[0] || '')
    setBookingMealPlan(tourData.mealPlans?.[0] || '')
    setBookingAdultsRaw(1)
    setBookingChildrenRaw(0)
    setPersonalDetails([{ firstName: '', lastName: '' }])
  }

  async function handleBooking() {
    if (!bookingTour || !isLoggedIn || !auth) return
    setBookingMessage('')
    setBookingError('')
    const payload = {
      userId: effectiveUserId,
      tourId: bookingTour.id,
      date: bookingDate,
      duration: bookingDuration,
      mealPlan: (bookingMealPlan.match(/\(([^)]+)\)/)?.[1] || bookingMealPlan).trim(),
      guests: { adult: bookingAdults, children: bookingChildren },
      personalDetails,
    }
    try {
      setIsBooking(true)
      const response = await postBooking(payload, auth.idToken)
      setBookingMessage(response.details || 'Booking confirmed!')
    } catch (error) {
      setBookingError((error as Error).message || 'Booking failed.')
    } finally {
      setIsBooking(false)
    }
  }

  return (
    <BookingContext.Provider value={{
      bookingTour,
      bookingDate, setBookingDate,
      bookingDuration, setBookingDuration,
      bookingMealPlan, setBookingMealPlan,
      bookingAdults, setBookingAdults,
      bookingChildren, setBookingChildren,
      personalDetails, setPersonalDetails,
      dateDurationOptions,
      totalPrice,
      isBooking, bookingMessage, bookingError,
      initializeFromTour,
      handleBooking,
    }}>
      {children}
    </BookingContext.Provider>
  )
}

export function useBooking(): BookingContextValue {
  const ctx = useContext(BookingContext)
  if (!ctx) throw new Error('useBooking must be used inside BookingProvider')
  return ctx
}
