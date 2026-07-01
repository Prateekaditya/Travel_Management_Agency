import { useState, useCallback } from 'react';
import { fetchAvailableTours, fetchTravelAgentTours } from '../services/tourService';
import type { Tour, TourFilters, ToursQueryParams, SortField, SortOrder } from '../types/tour.types';

const PAGE_SIZE = 6;

interface UseToursResult {
  tours: Tour[];
  loading: boolean;
  error: string | null;
  totalPages: number;
  totalItems: number;
  dbTotal: number;
  currentPage: number;
  search: (filters: TourFilters, page?: number, sortField?: SortField, sortOrder?: SortOrder) => void;
  goToPage: (page: number) => void;
  setSort: (sortField: SortField, sortOrder: SortOrder) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

export function useTours(userRole?: string, userId?: string): UseToursResult {
  console.log('🔍 useTours hook initialized with:', { userRole, userId });
  
  const [allTours, setAllTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbTotal, setDbTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [lastFilters, setLastFilters] = useState<TourFilters | null>(null);
  const [lastSortField, setLastSortField] = useState<SortField>('rating');
  const [lastSortOrder, setLastSortOrder] = useState<SortOrder>('desc');

  // Derive everything from the actual list
  const totalItems = allTours.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  const tours = allTours.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const search = useCallback(async (
    filters: TourFilters,
    page = 0,
    sortField: SortField = 'rating',
    sortOrder: SortOrder = 'desc',
  ) => {
    setLoading(true);
    setError(null);
    setLastFilters(filters);
    setLastSortField(sortField);
    setLastSortOrder(sortOrder);
    setCurrentPage(page);

    // Request all results at once; backend paginates but we ask for a large size
    const params: ToursQueryParams = { ...filters, page: 0, size: 10000, sortField, sortOrder };

    try {
      let result: any;
      
      // Use dedicated endpoint for travel agents
      if (userRole === 'TRAVEL_AGENT' && userId) {
        console.log('🎯 Fetching tours for travel agent:', userId);
        result = await fetchTravelAgentTours(userId, params);
        console.log('📦 Travel agent tours fetched:', result.tours.length);
      } else {
        console.log('📦 Fetching all available tours');
        result = await fetchAvailableTours(params, userRole, userId);
        console.log('📦 All tours fetched:', result.tours.length);
      }
      
      console.log('🎯 First tour sample:', result.tours[0]);
      console.log('📊 Final tours to display:', result.tours.length);
      
      setAllTours(result.tours);
      setDbTotal(result.totalTours);
    } catch (err) {
      console.error('❌ Error fetching tours:', err);
      setError('Failed to load tours. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userRole, userId]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const setSort = useCallback(
    (sortField: SortField, sortOrder: SortOrder) => {
      if (lastFilters) search(lastFilters, 0, sortField, sortOrder);
    },
    [lastFilters, search]
  );

  const DEFAULT: TourFilters = {
    destination: '',
    startDate: '',
    endDate: '',
    duration: [],
    mealPlans: [],
    adults: 1,
    children: 0,
    tourType: [],
  };

  const hasActiveFilters = lastFilters !== null && (
    lastFilters.destination !== '' ||
    lastFilters.startDate !== '' ||
    lastFilters.endDate !== '' ||
    lastFilters.duration.length > 0 ||
    lastFilters.mealPlans.length > 0 ||
    lastFilters.tourType.length > 0 ||
    lastFilters.adults > 1 ||
    lastFilters.children > 0
  );

  const clearFilters = useCallback(() => {
    search(DEFAULT, 0, lastSortField, lastSortOrder);
  }, [search, lastSortField, lastSortOrder]);

  return { tours, loading, error, totalPages, totalItems, dbTotal, currentPage, search, goToPage, setSort, clearFilters, hasActiveFilters };
}

