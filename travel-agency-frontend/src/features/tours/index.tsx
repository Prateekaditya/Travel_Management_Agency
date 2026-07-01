import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import FilterBar from './components/FilterBar/FilterBar';
import TourCard from './components/TourCard/TourCard';
import { useTours } from './hooks/useTours';
import type { TourFilters, SortField, SortOrder } from './types/tour.types';

const DEFAULT_FILTERS: TourFilters = {
  destination: '',
  startDate: '',
  endDate: '',
  duration: [],
  mealPlans: [],
  adults: 1,
  children: 0,
  tourType: [],
};

const SORT_OPTIONS: { label: string; field: SortField; order: SortOrder }[] = [
  { label: 'Top rated first', field: 'rating', order: 'desc' },
  { label: 'Lowest price', field: 'price', order: 'asc' },
  { label: 'Highest price', field: 'price', order: 'desc' },
  { label: 'Earliest date', field: 'startDate', order: 'asc' },
];

interface ToursPageProps {
  userRole?: string;
  userId?: string;
}

const ToursPage: React.FC<ToursPageProps> = ({ userRole, userId }) => {
  const { tours, loading, error, totalItems, dbTotal, totalPages, currentPage, search, goToPage, setSort, clearFilters, hasActiveFilters } = useTours(userRole, userId);
  const [sortField, setSortField] = useState<SortField>('rating');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [sortOpen, setSortOpen] = useState(false);
  const [filterResetKey, setFilterResetKey] = useState(0);
  const sortRef = useRef<HTMLDivElement>(null);

  const activeSort = SORT_OPTIONS.find((o) => o.field === sortField && o.order === sortOrder) ?? SORT_OPTIONS[0];

  useEffect(() => {
    search(DEFAULT_FILTERS, 0, sortField, sortOrder);
  }, [search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSortChange = (field: SortField, order: SortOrder) => {
    setSortField(field);
    setSortOrder(order);
    setSort(field, order);
    setSortOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#E7F9FF' }}>
      <div className="px-4 sm:px-6 lg:px-10 py-8 flex flex-col flex-1 gap-6 max-w-[1440px] mx-auto w-full">

        <h1 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 600, fontSize: 32, lineHeight: '40px', letterSpacing: 0, textAlign: 'center', color: '#0B3857', margin: 0 }}>
          {userRole === 'TRAVEL_AGENT' ? 'My Listed Tours' : 'Search for your next tour'}
        </h1>

        <div className="bg-white rounded-xl w-full" style={{ boxShadow: '0 2px 12px rgba(2, 126, 172, 0.10)' }}>
          <FilterBar onSearch={(filters) => search(filters, 0)} resetKey={filterResetKey} />
        </div>

        {/* Results + Sort row */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* Left: match count + clear */}
          <div className="flex items-center gap-2" style={{ fontFamily: 'Nunito, sans-serif', fontSize: 14, lineHeight: '24px', color: '#0B3857' }}>
            {!loading && hasActiveFilters && (
              <>
                <span>
                  <strong style={{ fontWeight: 700 }}>{totalItems} of {dbTotal}</strong> tours match your filters.
                </span>
                <button
                  type="button"
                  onClick={() => { clearFilters(); setFilterResetKey(k => k + 1); }}
                  style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 14, color: '#0B3857', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  Clear all filters
                </button>
              </>
            )}
          </div>

          {/* Right: sort */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Sort by:</span>
            <div ref={sortRef} className="relative">
              <button
                type="button"
                onClick={() => setSortOpen(v => !v)}
                className="text-sm font-bold rounded-lg px-4 py-2 bg-white border flex items-center gap-2"
                style={{ fontFamily: 'Nunito, sans-serif', borderColor: '#027EAC', color: '#027EAC', minWidth: 180, justifyContent: 'space-between' }}
              >
                <span className="truncate">{activeSort.label}</span>
                <ChevronDown size={16} color="#027EAC" className={`transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
              </button>

              {sortOpen && (
                <div
                  className="absolute right-0 mt-2 bg-white rounded-lg border overflow-hidden z-50"
                  style={{ width: 220, borderColor: '#D3E1ED', boxShadow: '0 6px 24px rgba(2, 126, 172, 0.15)' }}
                >
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.label}
                      type="button"
                      className="w-full text-left px-4 py-2 text-sm font-bold hover:bg-[#E7F9FF]"
                      style={{ fontFamily: 'Nunito, sans-serif', color: opt.field === sortField && opt.order === sortOrder ? '#027EAC' : '#1a1a1a' }}
                      onClick={() => handleSortChange(opt.field, opt.order)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {loading && (
          <div className="grid gap-4 sm:gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, max(260px, calc(50% - 12px))), 1fr))' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:h-[320px]" style={{ width: '100%', borderRadius: 12, padding: 18, gap: 18, background: '#FFFFFF', boxShadow: '0px 2px 10px 6px #027EAC33', boxSizing: 'border-box', overflow: 'hidden' }}>
                {/* Image skeleton */}
                <div className="w-full sm:w-[37.7%] flex-shrink-0" style={{ borderRadius: 12, background: 'linear-gradient(90deg,#D3E1ED 25%,#E7F4FC 50%,#D3E1ED 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                {/* Content skeleton */}
                <div className="flex flex-col flex-1 gap-3 justify-between" style={{ minWidth: 0 }}>
                  <div className="flex flex-col gap-3">
                    <div style={{ height: 20, borderRadius: 6, width: '65%', background: 'linear-gradient(90deg,#D3E1ED 25%,#E7F4FC 50%,#D3E1ED 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                    <div style={{ height: 13, borderRadius: 6, width: '40%', background: 'linear-gradient(90deg,#D3E1ED 25%,#E7F4FC 50%,#D3E1ED 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                    <div style={{ height: 13, borderRadius: 6, width: '75%', background: 'linear-gradient(90deg,#D3E1ED 25%,#E7F4FC 50%,#D3E1ED 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite', marginTop: 8 }} />
                    <div style={{ height: 13, borderRadius: 6, width: '60%', background: 'linear-gradient(90deg,#D3E1ED 25%,#E7F4FC 50%,#D3E1ED 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                    <div style={{ height: 13, borderRadius: 6, width: '70%', background: 'linear-gradient(90deg,#D3E1ED 25%,#E7F4FC 50%,#D3E1ED 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                    <div style={{ height: 13, borderRadius: 6, width: '50%', background: 'linear-gradient(90deg,#D3E1ED 25%,#E7F4FC 50%,#D3E1ED 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                  </div>
                  <div className="flex justify-end gap-3">
                    <div style={{ height: 36, width: 100, borderRadius: 8, background: 'linear-gradient(90deg,#D3E1ED 25%,#E7F4FC 50%,#D3E1ED 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                    <div style={{ height: 36, width: 110, borderRadius: 8, background: 'linear-gradient(90deg,#D3E1ED 25%,#E7F4FC 50%,#D3E1ED 75%)', backgroundSize: '200% 100%', animation: 'skeleton-shimmer 1.4s ease-in-out infinite' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="text-center py-10 text-red-500 font-bold">{error}</div>
        )}

        {!loading && !error && tours.length === 0 && (
          <div className="text-center py-16 text-gray-500 font-bold text-lg">
            No tours found matching your criteria.
          </div>
        )}

        {!loading && !error && tours.length > 0 && (
          <div className="grid gap-4 sm:gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, max(260px, calc(50% - 12px))), 1fr))', animation: 'fadeInUp 0.35s ease both' }}>
            {tours.map((tour) => (
              <TourCard key={tour.id} tour={tour} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (() => {
          const pages: (number | '...')[] = [];
          if (totalPages <= 7) {
            for (let i = 0; i < totalPages; i++) pages.push(i);
          } else {
            pages.push(0);
            if (currentPage <= 3) {
              for (let i = 1; i <= 4; i++) pages.push(i);
              pages.push('...');
              pages.push(totalPages - 1);
            } else if (currentPage >= totalPages - 4) {
              pages.push('...');
              for (let i = totalPages - 5; i < totalPages; i++) pages.push(i);
            } else {
              pages.push('...');
              pages.push(currentPage - 1);
              pages.push(currentPage);
              pages.push(currentPage + 1);
              pages.push('...');
              pages.push(totalPages - 1);
            }
          }

          const btnBase: React.CSSProperties = {
            fontFamily: 'Nunito, sans-serif', fontWeight: 700, fontSize: 14, lineHeight: '24px',
            minWidth: 36, height: 36, display: 'inline-flex', alignItems: 'center',
            justifyContent: 'center', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'transparent', color: '#0B3857', padding: '0 6px',
            transition: 'all 0.15s ease', transform: 'scale(1)',
          };
          const activeBtn: React.CSSProperties = { ...btnBase, background: '#027EAC', color: '#fff' };
          const disabledBtn: React.CSSProperties = { ...btnBase, opacity: 0.35, cursor: 'not-allowed' };

          return (
            <div className="flex justify-center items-center gap-1 mt-auto mb-4">
              <button 
                onClick={() => goToPage(currentPage - 1)} 
                disabled={currentPage === 0} 
                style={currentPage === 0 ? disabledBtn : btnBase}
                onMouseDown={(e) => !e.currentTarget.disabled && (e.currentTarget.style.transform = 'scale(0.9)')}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >&lt;</button>
              {pages.map((p, idx) =>
                p === '...' ? (
                  <span key={`dots-${idx}`} style={{ ...btnBase, cursor: 'default' }}>…</span>
                ) : (
                  <button 
                    key={p} 
                    onClick={() => goToPage(p as number)} 
                    style={currentPage === p ? activeBtn : btnBase}
                    onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
                    onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >{(p as number) + 1}</button>
                )
              )}
              <button 
                onClick={() => goToPage(currentPage + 1)} 
                disabled={currentPage === totalPages - 1} 
                style={currentPage === totalPages - 1 ? disabledBtn : btnBase}
                onMouseDown={(e) => !e.currentTarget.disabled && (e.currentTarget.style.transform = 'scale(0.9)')}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >&gt;</button>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

export default ToursPage;
