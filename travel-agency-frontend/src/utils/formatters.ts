export function normalizePrice(priceText: string | undefined | null): number {
  if (!priceText) return 0
  return Number(String(priceText).replace(/[^\d.]/g, '')) || 0
}

export function formatDate(dateText: string | undefined | null): string {
  if (!dateText) return ''
  const date = new Date(dateText)
  if (Number.isNaN(date.getTime())) return dateText
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function starsFromRating(value: number | undefined): string {
  const rounded = Math.max(1, Math.min(5, Math.round(value || 0)))
  return `${'★'.repeat(rounded)}${'☆'.repeat(5 - rounded)}`
}

export function initials(name: string | undefined): string {
  if (!name) return 'U'
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}
