import locationIcon from '../assets/figma/Location.png'
import starIcon from '../assets/figma/star-01.png'

interface HeroProps {
  title?: string
  destination?: string
  rating?: number
  imageUrls?: string[]
  fallbackImage?: string
  loading?: boolean
  onBack?: () => void
  isHomepage?: boolean
}

const GRID_CLASSES = [
  'gallery-c1-r1',
  'gallery-c1-r2',
  'gallery-c2-tall',
  'gallery-c3-r1',
  'gallery-c34-r2',
  'gallery-c4-r1',
  'gallery-c5-tall',
]

export default function Hero({
  title = 'Loading...',
  destination = '',
  rating = 0,
  imageUrls = [],
  loading = false,
}: Omit<HeroProps, 'onBack' | 'isHomepage'>) {
  const hasImages = imageUrls && imageUrls.length > 0
  const displayImages = hasImages
    ? Array.from({ length: 7 }, (_, i) => imageUrls[i % imageUrls.length])
    : []

  return (
    <div className="hero-section">
      <div className="tour-title">
        <div>
          <h2>{title}</h2>
          <p className="location-line" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <img src={locationIcon} alt="" style={{ width: '16px', height: '16px' }} /> {destination}
          </p>
        </div>
        <div className="rating-display" aria-label={`Rating ${rating} out of 5`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <img src={starIcon} alt="" style={{ width: '16px', height: '16px' }} /> {rating}
        </div>
      </div>

      <div className="gallery-grid p-4 bg-[#FFFFFF]" aria-label="Tour image gallery">
        {GRID_CLASSES.map((cls, i) =>
          loading || !hasImages ? (
            <div
              key={cls}
              className={cls}
              style={{
                background: 'linear-gradient(90deg, #D3E1ED 25%, #E7F4FC 50%, #D3E1ED 75%)',
                backgroundSize: '200% 100%',
                animation: 'skeleton-shimmer 1.4s ease-in-out infinite',
                borderRadius: 4,
              }}
            />
          ) : (
            <img key={cls} src={displayImages[i]} alt="" className={cls} loading="lazy" />
          )
        )}
      </div>
    </div>
  )
}
