import type { Tour, Review } from './types'

const DEFAULT_API_BASE_URL = 'http://localhost:8080/api/v1'
// In dev mode, use a relative URL so requests are handled by the Vite proxy
// (avoids IPv4/IPv6 resolution timeout on Windows).
// In production VITE_REPORT_APP_URL is always set to the full backend URL.
const DEFAULT_REPORT_APP_URL = '/api/report'

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? DEFAULT_API_BASE_URL

export const REPORT_APP_URL =
  (import.meta.env.VITE_REPORT_APP_URL as string | undefined)?.replace(/\/$/, '') ?? DEFAULT_REPORT_APP_URL

/** Error thrown by requestJson for non-2xx responses. Includes the HTTP status code. */
export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { headers: callerHeaders, ...restOptions } = options
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(callerHeaders as Record<string, string> || {}),
    },
    ...restOptions,
  })

  let data: { message?: string } | null = null
  try {
    data = await response.json()
  } catch {
    data = null
  }

  if (!response.ok) {
    const message = data?.message || `Request failed (${response.status})`
    throw new ApiError(response.status, message)
  }

  return data as T
}

export async function getTourDetails(tourId: string): Promise<Tour> {
  return requestJson<Tour>(`/tours/${tourId}`)
}

export async function getDestinations(): Promise<string[]> {
  const data = await requestJson<{ destinations: string[] }>('/tours/destinations')
  return data.destinations ?? []
}

export async function getTourReviews(
  tourId: string,
  params: { page?: number; pageSize?: number; sortBy?: string } = {}
): Promise<{ reviews: Review[]; totalPages: number }> {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value))
    }
  })
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return requestJson<{ reviews: Review[]; totalPages: number }>(`/tours/${tourId}/reviews${suffix}`)
}

export async function postBooking(
  payload: Record<string, unknown>,
  idToken: string
): Promise<{ details?: string }> {
  return requestJson<{ details?: string }>('/bookings', {
    method: 'POST',
    headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
    body: JSON.stringify(payload),
  })
}

export interface SubmitTourFeedbackRequest {
  rating: number
  comment?: string
}

export interface FeedbackResponse {
  message?: string;
  moderationStatus?: 'APPROVED' | 'FLAGGED';
}

export async function submitTourFeedback(
  tourId: string,
  payload: SubmitTourFeedbackRequest,
  idToken: string
): Promise<FeedbackResponse> {
  return requestJson<FeedbackResponse>(`/tours/${tourId}/feedbacks`, {
    method: 'POST',
    headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
    body: JSON.stringify(payload),
  })
}

export async function updateTourFeedback(
  tourId: string,
  payload: SubmitTourFeedbackRequest,
  idToken: string
): Promise<FeedbackResponse> {
  return requestJson<FeedbackResponse>(`/tours/${tourId}/feedbacks`, {
    method: 'PATCH',
    headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
    body: JSON.stringify(payload),
  })
}

export interface GenerateReportRequest {
  reportType: 'STAFF_PERFORMANCE' | 'SALES'
  startDate: string
  endDate: string
  location: string
}

export interface GenerateReportResponse {
  cachedReportKey: string
  reportType: string
  reportData?: {
    columns: string[]
    rows: Array<Array<string | number>>
  }
}

export interface AdminFeedbackItem {
  tourId: string
  tourName: string
  tourType: string
  destination: string
  userId: string
  authorName: string
  createdAt: string
  rating: number
  comment: string
  visibility: 'PUBLISHED' | 'HIDDEN'
  flagged: boolean
  flagReason: string | null
}

export async function getAdminFeedbacks(
  params: { rating?: number; tourType?: string },
  idToken: string
): Promise<AdminFeedbackItem[]> {
  const query = new URLSearchParams()
  if (params.rating !== undefined) query.set('rating', String(params.rating))
  if (params.tourType) query.set('tourType', params.tourType)
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return requestJson<AdminFeedbackItem[]>(`/admin/feedbacks${suffix}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  })
}

export async function updateAdminFeedbackVisibility(
  tourId: string,
  userId: string,
  visibility: 'PUBLISHED' | 'HIDDEN',
  idToken: string
): Promise<{ message: string }> {
  return requestJson<{ message: string }>(`/admin/feedbacks/${encodeURIComponent(tourId)}/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ visibility }),
  })
}

export async function generateReport(
  payload: GenerateReportRequest,
  idToken: string
): Promise<GenerateReportResponse> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30_000)
  try {
    const response = await fetch(`${REPORT_APP_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { message?: string }
      throw new Error(err.message || `Report generation failed (${response.status})`)
    }
    return response.json() as Promise<GenerateReportResponse>
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('Report request timed out. The report service may be unavailable.')
    }
    throw err
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function downloadReportFile(
  cachedReportKey: string,
  idToken: string,
  format: 'excel' | 'csv' | 'pdf' = 'excel',
  reportType: string = 'STAFF_PERFORMANCE'
): Promise<void> {
  const url = `${REPORT_APP_URL}/download?cachedReportKey=${encodeURIComponent(cachedReportKey)}&format=${format}&reportType=${encodeURIComponent(reportType)}`
  const response = await fetch(url, {
    headers: idToken ? { Authorization: `Bearer ${idToken}` } : {},
  })
  if (!response.ok) throw new Error(`Download failed (${response.status})`)
  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = objectUrl
  const disposition = response.headers.get('content-disposition') ?? ''
  const match = disposition.match(/filename="?([^"]+)"?/)
  const ext = format === 'csv' ? '.csv' : format === 'pdf' ? '.pdf' : '.xlsx'
  a.download = match ? match[1] : `report${ext}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(objectUrl)
}
