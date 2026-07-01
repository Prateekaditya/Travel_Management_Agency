export const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80'

export const DEFAULT_TOUR_ID = '123e4567-e89b-12d3-a456-426614174000'
export const USER_ID = import.meta.env.VITE_USER_ID || ''
export const AUTH_STORAGE_KEY = 'travelAuth'

export const REVIEW_SORT_OPTIONS = [
  { label: 'Top rated first', value: 'RATING_DESC' },
  { label: 'Low rated first', value: 'RATING_ASC' },
  { label: 'Newest first', value: 'NEWEST' },
  { label: 'Oldest first', value: 'OLDEST' },
]
