import starIcon from '../assets/figma/star-01.png'
import CustomSelect from './CustomSelect'
import type { Review } from '../types'

interface SelectOption {
  value: string
  label: string
}

interface ReviewSectionProps {
  reviews: Review[]
  loading: boolean
  error: string
  sortValue: string
  onSortChange: (value: string) => void
  sortOptions: SelectOption[]
  formatDate: (date: string | undefined | null) => string
  initials: (name: string | undefined) => string
  reviewPage: number
  onReviewPageChange: (page: number) => void
  totalPages: number
}

function renderStars(rating: number) {
  const count = Math.max(1, Math.min(5, Math.round(rating || 0)))
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {Array.from({ length: count }).map((_, i) => (
        <img key={i} src={starIcon} alt="star" style={{ width: '14px', height: '14px' }} />
      ))}
    </div>
  )
}

export default function ReviewSection({
  reviews = [],
  loading,
  error,
  sortValue,
  onSortChange,
  sortOptions = [],
  formatDate,
  initials,
  reviewPage,
  onReviewPageChange,
  totalPages,
}: ReviewSectionProps) {
  return (
    <section className="review-section">
      <div className="review-head">
        <h3>Customer Reviews</h3>
        <div className="sort-container" style={{ marginBottom: 0 }}>
          <label>Sort by:</label>
          <CustomSelect
            value={sortValue}
            onChange={onSortChange}
            options={sortOptions}
            placeholder="Select..."
            align="right"
          />
        </div>
      </div>

      {error && <p className="status-error">{error}</p>}
      {loading && <p className="status-note">Loading reviews...</p>}

      <div className="review-grid">
        {reviews.map((item, index) => (
          <article key={`${item.authorName}-${item.createdAt}-${index}`}>
            <div className="review-meta">
              <div className="avatar-block">
                <div className="avatar">{initials(item.authorName)}</div>
                <div>
                  <strong>{item.authorName}</strong>
                  <br />
                  <small style={{ color: 'var(--text-light)' }}>{formatDate(item.createdAt)}</small>
                </div>
              </div>
              <div className="review-stars">{renderStars(item.rate)}</div>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{item.reviewContent}</p>
          </article>
        ))}
      </div>

      {!loading && !error && reviews.length === 0 && (
        <article className="review-empty">
          <p>No reviews yet. Be the first traveler to share your experience.</p>
        </article>
      )}

      {!loading && totalPages > 1 && (
        <div className="pagination-numbers">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i + 1}
              type="button"
              className={`page-num-btn ${reviewPage === i + 1 ? 'active' : ''}`}
              onClick={() => onReviewPageChange(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          {reviewPage < totalPages && (
            <button
              type="button"
              className="page-num-btn"
              onClick={() => onReviewPageChange(reviewPage + 1)}
            >
              &raquo;
            </button>
          )}
        </div>
      )}
    </section>
  )
}
