import { useEffect, useState } from 'react'
import { getTourDetails, getTourReviews } from '../api'
import { useRouter } from '../context/RouterContext'
import { useBooking } from '../context/BookingContext'
import type { Tour, Review } from '../types'

export function useTourDetail() {
  const { route } = useRouter()
  const { initializeFromTour } = useBooking()

  const [tour, setTour] = useState<Tour | null>(null)
  const [tourError, setTourError] = useState('')
  const [loadingTour, setLoadingTour] = useState(true)

  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewsError, setReviewsError] = useState('')
  const [loadingReviews, setLoadingReviews] = useState(true)
  const [reviewSort, setReviewSort] = useState('RATING_DESC')
  const [reviewPage, setReviewPage] = useState(1)
  const [reviewTotalPages, setReviewTotalPages] = useState(1)

  useEffect(() => {
    if (route.view !== 'details' || !route.tourId) {
      setTour(null)
      setLoadingTour(false)
      return
    }
    async function loadTour() {
      setLoadingTour(true)
      setTourError('')
      try {
        const details = await getTourDetails(route.tourId)
        if (!details) throw new Error('Tour not found.')
        setTour(details)
        initializeFromTour(details)
      } catch (error) {
        setTourError((error as Error).message || 'Unable to load tour details.')
      } finally {
        setLoadingTour(false)
      }
    }
    setReviewPage(1)
    loadTour()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.tourId, route.view])

  useEffect(() => {
    if (route.view !== 'details' || !route.tourId) {
      setReviews([])
      setReviewTotalPages(1)
      setLoadingReviews(false)
      return
    }
    async function loadReviews() {
      setLoadingReviews(true)
      setReviewTotalPages(1)
      setReviewsError('')
      try {
        const data = await getTourReviews(route.tourId, {
          page: reviewPage,
          pageSize: 4,
          sortBy: reviewSort,
        })
        setReviews(data.reviews || [])
        setReviewTotalPages(data.totalPages || 1)
      } catch (error) {
        setReviewsError((error as Error).message || 'Unable to load reviews.')
      } finally {
        setLoadingReviews(false)
      }
    }
    loadReviews()
  }, [reviewSort, reviewPage, route.tourId, route.view])

  return {
    tour,
    tourError,
    loadingTour,
    reviews,
    reviewsError,
    loadingReviews,
    reviewSort, setReviewSort,
    reviewPage, setReviewPage,
    reviewTotalPages,
  }
}
