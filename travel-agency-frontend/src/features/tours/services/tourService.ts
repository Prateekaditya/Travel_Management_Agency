import type { Tour, MealPlan, TourType, ToursPage, ToursQueryParams } from '../types/tour.types';

const MEAL_CODE_TO_LABEL: Record<string, string> = {
  BB: 'Breakfast (BB)',
  HB: 'Half-board (HB)',
  FB: 'Full-board (FB)',
  AI: 'All inclusive (AI)',
};

function normaliseMealPlan(plan: string): { code: MealPlan | null; label: string } {
  // Backend stores full labels: "Breakfast (BB)" — extract code
  const m = plan.match(/\(([^)]+)\)/);
  if (m) {
    const code = m[1].trim().toUpperCase();
    return { code: (['BB', 'HB', 'FB', 'AI'].includes(code) ? code : null) as MealPlan | null, label: plan };
  }
  // Backend stored bare code: "BB" — generate label
  const code = plan.trim().toUpperCase();
  if (['BB', 'HB', 'FB', 'AI'].includes(code)) {
    return { code: code as MealPlan, label: MEAL_CODE_TO_LABEL[code] };
  }
  return { code: null, label: plan };
}

function mapBackendTour(raw: any): Tour {
  const normalisedMeals = (raw.mealPlans ?? []).map(normaliseMealPlan);
  const mealPlanCodes = normalisedMeals
    .filter((n: { code: MealPlan | null }) => n.code !== null)
    .map((n: { code: MealPlan }) => n.code);
  const mealPlanLabels = normalisedMeals.map((n: { label: string }) => n.label);

  const durationNumbers = (raw.durations ?? [])
    .map((d: string) => parseInt(d))
    .filter((n: number) => !isNaN(n));

  return {
    id: raw.id,
    title: raw.name,
    destination: raw.destination,
    imageUrl: (raw.imageUrls ?? [])[0] ?? '',
    rating: raw.rating,
    reviewCount: raw.reviews ?? raw.reviewCount ?? 0,
    startDate: raw.startDate ?? raw.startDates?.[0] ?? '',
    startDates: raw.startDates ?? (raw.startDate ? [raw.startDate] : []),
    durationOptions: durationNumbers,
    mealPlans: mealPlanCodes,
    mealPlanLabels,
    pricePerPerson: (() => {
      const rawPrice = raw.price;
      if (!rawPrice) return 0;
      // Extract only the first dollar-sign-prefixed number to avoid
      // accidentally including numbers from trailing text like "for 1 person"
      const match = String(rawPrice).match(/\$\s*([\d,]+\.?\d*)/);
      if (match) {
        const n = parseFloat(match[1].replace(/,/g, ''));
        return isNaN(n) ? 0 : n;
      }
      const n = parseFloat(String(rawPrice).replace(/[^0-9.]/g, ''));
      return isNaN(n) ? 0 : n;
    })(),
    priceMap: raw.priceMap ?? {},
    mealSupplementsPerDay: raw.mealSupplementsPerDay ?? {},
    guestQuantity: {
      adultsMaxValue: raw.guestQuantity?.adultsMaxValue ?? 8,
      childrenMaxValue: raw.guestQuantity?.childrenMaxValue ?? 0,
      totalMaxValue: raw.guestQuantity?.totalMaxVelue ?? raw.guestQuantity?.totalMaxValue ?? 8,
    },
    freeCancellationUntil: raw.freeCancelation ?? null,
    tourType: raw.tourType as TourType,
    isAvailable: true,
    travelAgentId: raw.travelAgentId,
  };
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

async function apiFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.message ?? `HTTP ${res.status}: ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export async function fetchDestinations(query: string): Promise<string[]> {
  const params = new URLSearchParams();
  if (query) params.set('destination', query);
  const data = await apiFetch<unknown>(`${BASE_URL}/tours/destinations?${params}`);
  // Handle both { destinations: [...] } and plain array responses
  if (Array.isArray(data)) return data as string[];
  if (data && typeof data === 'object' && Array.isArray((data as any).destinations)) return (data as any).destinations;
  return [];
}

function toSortBy(field: string, order: string): string {
  if (field === 'rating')    return order === 'asc' ? 'RATING_ASC'      : 'RATING_DESC';
  if (field === 'price')     return order === 'asc' ? 'PRICE_ASC'       : 'PRICE_DESC';
  if (field === 'startDate') return order === 'asc' ? 'START_DATE_ASC'  : 'START_DATE_DESC';
  return 'RATING_DESC';
}

export async function fetchAvailableTours(params: ToursQueryParams, userRole?: string, userId?: string): Promise<ToursPage> {
  const query = new URLSearchParams();

  if (params.destination)         query.set('destination', params.destination);
  if (params.startDate)           query.set('startDate', params.startDate);
  if (params.endDate)             query.set('endDate', params.endDate);
  // Send each selected duration range as repeated param: duration=1-3&duration=4-7
  params.duration.forEach(d => query.append('duration', d));
  // Send all selected meal plan codes as repeated params: mealPlan=BB&mealPlan=HB
  params.mealPlans.forEach(mp => query.append('mealPlan', mp));
  if (params.adults)           query.set('adults', String(params.adults));
  if (params.children)         query.set('children', String(params.children));
  // Send each selected tour type as repeated param: tourType=RESORT&tourType=CRUISE
  params.tourType.forEach(t => query.append('tourType', t));

  query.set('sortBy', toSortBy(params.sortField, params.sortOrder));
  query.set('page', String(Math.max(1, params.page + 1)));   // frontend is 0-indexed, backend is 1-indexed
  query.set('pageSize', String(params.size));

  const data = await apiFetch<any>(`${BASE_URL}/tours/available?${query}`);
  return { ...data, tours: data.tours.map(mapBackendTour) };
}

export async function fetchTravelAgentTours(userId: string, params: ToursQueryParams): Promise<ToursPage> {
  const query = new URLSearchParams();

  if (params.destination)         query.set('destination', params.destination);
  if (params.startDate)           query.set('startDate', params.startDate);
  if (params.endDate)             query.set('endDate', params.endDate);
  params.duration.forEach(d => query.append('duration', d));
  params.mealPlans.forEach(mp => query.append('mealPlan', mp));
  if (params.adults)           query.set('adults', String(params.adults));
  if (params.children)         query.set('children', String(params.children));
  params.tourType.forEach(t => query.append('tourType', t));

  query.set('sortBy', toSortBy(params.sortField, params.sortOrder));
  query.set('page', String(Math.max(1, params.page + 1)));
  query.set('pageSize', String(params.size));

  const data = await apiFetch<any>(`${BASE_URL}/tours/travel-agent/${userId}?${query}`);
  return { ...data, tours: data.tours.map(mapBackendTour) };
}
