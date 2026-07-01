export interface Tour {
  id: string
  name: string
  destination: string
  summary?: string
  rating: number
  imageUrls?: string[]
  startDates: string[]
  durations: string[]
  mealPlans: string[]
  price?: Record<string, string>
  freeCancelationDaysBefore?: number
  accomodiation?: string
  hotelName?: string
  hotelDescription?: string
  customDetails?: Record<string, string>
  mealSupplementsPerDay?: Record<string, string>
  guestQuantity?: {
    adultsMaxValue: number
    childrenMaxValue: number
    totalMaxVelue: number  // intentional typo — matches backend/spec field name
  }
}

export interface Review {
  authorName: string
  createdAt: string
  rate: number
  reviewContent: string
}

export interface Route {
  view: 'all' | 'details' | 'my' | 'login' | 'signup' | 'forgot-password' | 'agent' | 'admin' | 'feedback' | 'profile'
  tourId: string
}

export interface Auth {
  idToken: string
  email: string
  role: string
  userName: string
  userId: string
}

export interface PersonalDetail {
  firstName: string
  lastName: string
}

export interface DateDurationOption {
  key: string
  startDate: string
  duration: string
  label: string
}
