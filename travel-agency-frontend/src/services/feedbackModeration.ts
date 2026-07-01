import type { Review } from '../types'

export type FeedbackVisibilityStatus = 'Published' | 'Hidden'

export interface FeedbackModerationRecord {
  status: FeedbackVisibilityStatus
  flaggedKeywords: string[]
  updatedAt: string
}

export interface LocalFeedbackEntry {
  tourId: string
  tourName: string
  tourCategory: string
  destination: string
  authorName: string
  rate: number
  reviewContent: string
  createdAt: string
}

const MODERATION_STORAGE_KEY = 'travelFeedbackModerationMap'
const LOCAL_FEEDBACK_STORAGE_KEY = 'travelLocalFeedbackEntries'
const FEEDBACK_MODERATION_EVENT = 'travel-feedback-moderation-updated'

const PROHIBITED_KEYWORDS = [
  'scam',
  'fraud',
  'hate',
  'racist',
  'abuse',
  'idiot',
  'stupid',
  'threat',
  'violence',
]

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof localStorage !== 'undefined'
}

function readJson<T>(storageKey: string, fallback: T): T {
  if (!isBrowser()) return fallback
  try {
    const raw = localStorage.getItem(storageKey)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson<T>(storageKey: string, value: T): void {
  if (!isBrowser()) return
  localStorage.setItem(storageKey, JSON.stringify(value))
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function detectProhibitedKeywords(comment: string): string[] {
  const lower = normalizeText(comment)
  return PROHIBITED_KEYWORDS.filter(keyword => lower.includes(keyword))
}

export function buildFeedbackKey(tourId: string, review: Pick<Review, 'authorName' | 'createdAt' | 'reviewContent'>): string {
  return [tourId, normalizeText(review.authorName || ''), review.createdAt || '', normalizeText(review.reviewContent || '')].join('::')
}

export function getFeedbackModerationMap(): Record<string, FeedbackModerationRecord> {
  return readJson<Record<string, FeedbackModerationRecord>>(MODERATION_STORAGE_KEY, {})
}

function notifyModerationChange(): void {
  if (!isBrowser()) return
  window.dispatchEvent(new CustomEvent(FEEDBACK_MODERATION_EVENT))
}

export function subscribeToFeedbackModerationChanges(onChange: () => void): () => void {
  if (!isBrowser()) return () => {}

  const handler = () => onChange()
  const storageHandler = (event: StorageEvent) => {
    if (event.key === MODERATION_STORAGE_KEY || event.key === LOCAL_FEEDBACK_STORAGE_KEY) {
      onChange()
    }
  }

  window.addEventListener(FEEDBACK_MODERATION_EVENT, handler)
  window.addEventListener('storage', storageHandler)

  return () => {
    window.removeEventListener(FEEDBACK_MODERATION_EVENT, handler)
    window.removeEventListener('storage', storageHandler)
  }
}

export function getFeedbackModerationRecord(feedbackKey: string, comment: string): FeedbackModerationRecord {
  const map = getFeedbackModerationMap()
  const existing = map[feedbackKey]
  if (existing) {
    return {
      status: existing.status,
      flaggedKeywords: existing.flaggedKeywords ?? detectProhibitedKeywords(comment),
      updatedAt: existing.updatedAt,
    }
  }

  return {
    status: 'Published',
    flaggedKeywords: detectProhibitedKeywords(comment),
    updatedAt: '',
  }
}

export function setFeedbackVisibility(feedbackKey: string, comment: string, status: FeedbackVisibilityStatus): void {
  const map = getFeedbackModerationMap()
  const prior = map[feedbackKey]

  map[feedbackKey] = {
    status,
    flaggedKeywords: prior?.flaggedKeywords ?? detectProhibitedKeywords(comment),
    updatedAt: new Date().toISOString(),
  }

  writeJson(MODERATION_STORAGE_KEY, map)
  notifyModerationChange()
}

export function isFeedbackVisible(tourId: string, review: Review): boolean {
  const feedbackKey = buildFeedbackKey(tourId, review)
  return getFeedbackModerationRecord(feedbackKey, review.reviewContent).status !== 'Hidden'
}

export function filterVisibleReviews(tourId: string, reviews: Review[]): Review[] {
  return reviews.filter(review => isFeedbackVisible(tourId, review))
}

export function getLocalFeedbackEntries(): LocalFeedbackEntry[] {
  return readJson<LocalFeedbackEntry[]>(LOCAL_FEEDBACK_STORAGE_KEY, [])
}

export function saveLocalFeedbackEntry(entry: LocalFeedbackEntry): void {
  const next: LocalFeedbackEntry = {
    ...entry,
    createdAt: entry.createdAt || new Date().toISOString(),
  }

  const feedbacks = getLocalFeedbackEntries()
  const feedbackKey = buildFeedbackKey(next.tourId, next)

  const index = feedbacks.findIndex(item => buildFeedbackKey(item.tourId, item) === feedbackKey)
  if (index >= 0) {
    feedbacks[index] = next
  } else {
    feedbacks.unshift(next)
  }

  writeJson(LOCAL_FEEDBACK_STORAGE_KEY, feedbacks)

  const map = getFeedbackModerationMap()
  if (!map[feedbackKey]) {
    map[feedbackKey] = {
      status: 'Published',
      flaggedKeywords: detectProhibitedKeywords(next.reviewContent),
      updatedAt: new Date().toISOString(),
    }
    writeJson(MODERATION_STORAGE_KEY, map)
  }

  notifyModerationChange()
}
