import type { MealPlan, TourType, DurationRange, TourFilters } from '../../types/tour.types';

export const MEAL_OPTIONS: { value: MealPlan; label: string }[] = [
  { value: 'BB', label: 'Breakfast (BB)' },
  { value: 'HB', label: 'Half-board (HB)' },
  { value: 'FB', label: 'Full-board (FB)' },
  { value: 'AI', label: 'All inclusive (AI)' },
];

export const TOUR_TYPE_OPTIONS: { value: TourType; label: string }[] = [
  { value: 'RESORT', label: 'Resorts' },
  { value: 'CRUISE', label: 'Cruises' },
  { value: 'HIKE',   label: 'Hikes'   },
];
export const DURATION_OPTIONS: DurationRange[] = ['1-3', '4-7', '8-12', '13+'];

export const DEFAULT_FILTERS: TourFilters = {
  destination: '',
  startDate: '',
  endDate: '',
  duration: [],
  mealPlans: [],
  adults: 1,
  children: 0,
  tourType: [],
};
