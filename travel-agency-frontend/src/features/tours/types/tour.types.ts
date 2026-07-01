export type MealPlan = 'BB' | 'HB' | 'FB' | 'AI';
export type TourType = 'RESORT' | 'CRUISE' | 'HIKE';
export type DurationRange = '1-3' | '4-7' | '8-12' | '13+';

export const DURATION_BOUNDS: Record<DurationRange, { lower: number; upper: number }> = {
  '1-3': { lower: 1, upper: 3 },
  '4-7': { lower: 4, upper: 7 },
  '8-12': { lower: 8, upper: 12 },
  '13+': { lower: 13, upper: 21 },
};

export interface Tour {
  id: string;
  title: string;
  destination: string;
  imageUrl: string;
  rating: number;
  reviewCount: number;
  startDate: string;
  startDates: string[];
  durationOptions: number[];
  mealPlans: MealPlan[];       // codes — used by FilterBar
  mealPlanLabels: string[];   // full labels — used by booking modal
  pricePerPerson: number;
  priceMap: Record<string, string>;
  mealSupplementsPerDay: Record<string, string>;
  guestQuantity: { adultsMaxValue: number; childrenMaxValue: number; totalMaxValue: number };
  freeCancellationUntil: string | null;
  tourType: TourType;
  isAvailable: boolean;
  travelAgentId?: string;
}

export interface TourFilters {
  destination: string;
  startDate: string;
  endDate: string;
  duration: DurationRange[];
  mealPlans: MealPlan[];
  adults: number;
  children: number;
  tourType: TourType[];
}

export type SortField = 'rating' | 'price' | 'startDate';
export type SortOrder = 'asc' | 'desc';

export interface ToursPage {
  tours: Tour[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  totalTours: number;
}

export interface ToursQueryParams extends TourFilters {
  page: number;
  size: number;
  sortField: SortField;
  sortOrder: SortOrder;
}
