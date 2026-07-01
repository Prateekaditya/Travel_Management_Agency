import React, { useState, useEffect, useRef } from 'react';
import type { TourFilters, MealPlan, TourType, DurationRange } from '../../types/tour.types';
import { fetchDestinations } from '../../services/tourService';
import { C, NUNITO } from '../../constants/theme';
import { MEAL_OPTIONS, TOUR_TYPE_OPTIONS, DURATION_OPTIONS, DEFAULT_FILTERS } from './filterBar.constants';
import FieldShell from './FieldShell';
import CheckboxOption from './CheckboxOption';
import Calendar from './Calendar';

import LocationIcon from '../../../../assets/logo/Location.svg';
import CalendarIcon from '../../../../assets/logo/Calendar.svg';
import MealIcon from '../../../../assets/logo/Meal.svg';
import PeopleIcon from '../../../../assets/logo/People.svg';
import TourIcon from '../../../../assets/logo/tour.svg';

interface FilterBarProps {
  onSearch: (filters: TourFilters) => void;
  resetKey?: number;
}

const DROP: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  left: 0,
  background: '#fff',
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  boxShadow: '0 4px 16px rgba(2, 126, 172, 0.15)',
  zIndex: 50,
  padding: 12,
  maxWidth: 'calc(100vw - 32px)',
};

const DROP_RIGHT: React.CSSProperties = {
  ...DROP,
  left: 'auto',
  right: 0,
};

const iconImg = (src: string, alt: string) => (
  <img src={src} alt={alt} style={{ width: 20, height: 20, flexShrink: 0 }} />
);

const FilterBar: React.FC<FilterBarProps> = ({ onSearch, resetKey }) => {
  const [filters, setFilters] = useState<TourFilters>(DEFAULT_FILTERS);
  const [destSuggestions, setDestSuggestions] = useState<string[]>([]);
  const [destSearch, setDestSearch] = useState('');
  const [destLoading, setDestLoading] = useState(false);
  const [openDrop, setOpenDrop] = useState<string | null>(null);
  const [highlightedIdx, setHighlightedIdx] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const destInputRef = useRef<HTMLInputElement>(null);
  const destDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const destListRef = useRef<HTMLUListElement>(null);

  // Fetch destinations from server as user types (debounced, min 3 chars)
  useEffect(() => {
    if (!destSearch || destSearch.trim().length < 3) {
      setDestSuggestions([]);
      setHighlightedIdx(-1);
      return;
    }
    if (destDebounce.current) clearTimeout(destDebounce.current);
    setDestLoading(true);
    setHighlightedIdx(-1);
    destDebounce.current = setTimeout(() => {
      fetchDestinations(destSearch)
        .then(list => setDestSuggestions(list))
        .catch(() => setDestSuggestions([]))
        .finally(() => setDestLoading(false));
    }, 250);
  }, [destSearch]);

  useEffect(() => {
    if (resetKey !== undefined && resetKey > 0) {
      setFilters(DEFAULT_FILTERS);
      setDestSearch('');
      setOpenDrop(null);
    }
  }, [resetKey]);

  // Keyboard navigation for destination suggestions
  useEffect(() => {
    if (openDrop !== 'dest' || destSuggestions.length === 0) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIdx(h => {
          const next = h < destSuggestions.length - 1 ? h + 1 : 0;
          scrollToSuggestion(next);
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIdx(h => {
          const prev = h > 0 ? h - 1 : destSuggestions.length - 1;
          scrollToSuggestion(prev);
          return prev;
        });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIdx >= 0 && highlightedIdx < destSuggestions.length) {
          selectDestination(destSuggestions[highlightedIdx]);
        }
      } else if (e.key === 'Escape') {
        setOpenDrop(null);
        setDestSearch('');
        setHighlightedIdx(-1);
        destInputRef.current?.blur();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openDrop, destSuggestions, highlightedIdx]);

  const scrollToSuggestion = (idx: number) => {
    if (!destListRef.current) return;
    const items = destListRef.current.querySelectorAll('li');
    if (items[idx]) {
      items[idx].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  };

  const selectDestination = (destination: string) => {
    setFilters(p => ({ ...p, destination }));
    setDestSearch('');
    setOpenDrop(null);
    setHighlightedIdx(-1);
  };


  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node))
        setOpenDrop(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (key: string) => setOpenDrop(prev => prev === key ? null : key);

  const toggleList = <T,>(list: T[], item: T): T[] =>
    list.includes(item) ? list.filter(x => x !== item) : [...list, item];

  const dateLabel = (() => {
    if (!filters.startDate && filters.duration.length === 0) return 'Any date, any duration';
    const parts: string[] = [];
    if (filters.startDate) {
      const s = new Date(filters.startDate);
      const start = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (filters.endDate) {
        const e = new Date(filters.endDate);
        const end = e.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        parts.push(`${start} – ${end}`);
      } else {
        parts.push(start);
      }
    }
    if (filters.duration.length > 0) parts.push(filters.duration.map(d => `${d} days`).join(', '));
    return parts.join(', ');
  })();

  const peopleLabel = `${filters.adults} adult${filters.adults !== 1 ? 's' : ''}${
    filters.children > 0 ? `, ${filters.children} child${filters.children !== 1 ? 'ren' : ''}` : ''
  }`;

  const mealLabel = filters.mealPlans.length
    ? `${filters.mealPlans.map(m => MEAL_OPTIONS.find(o => o.value === m)?.label.split(' ')[0]).join(', ')} (${filters.mealPlans.join(', ')})`
    : 'Meal';

  return (
    <div ref={rootRef} className="flex flex-wrap items-center gap-3 px-4 py-4">

      {/* Destination — inline editable field */}
      <div className="relative" style={{ flex: '1.6 1 0%', minWidth: 160 }}>
        <div
          className="flex items-center gap-2 px-3 bg-white rounded-lg"
          style={{
            height: 48,
            border: `1px solid ${openDrop === 'dest' || !!filters.destination ? C.primary : C.border}`,
            boxShadow: openDrop === 'dest' ? `0 0 0 1px ${C.primary}` : 'none',
          }}
        >
          {iconImg(LocationIcon, 'Location')}
          <input
            ref={destInputRef}
            type="text"
            placeholder="Any destination"
            value={destSearch !== '' ? destSearch : filters.destination}
            onFocus={() => {
              setDestSearch(filters.destination);
              setOpenDrop('dest');
            }}
            onChange={e => {
              setDestSearch(e.target.value);
              setOpenDrop('dest');
            }}
            onBlur={() => {
              // if nothing selected, restore committed value
              setTimeout(() => {
                setOpenDrop(prev => prev === 'dest' ? null : prev);
                setDestSearch('');
              }, 150);
            }}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontFamily: NUNITO, fontWeight: 400, fontSize: 14,
              lineHeight: '24px', color: '#0B3857',
              minWidth: 0,
            }}
          />
          {(filters.destination || destSearch) && (
            <button
              type="button"
              onMouseDown={() => {
                setFilters(p => ({ ...p, destination: '' }));
                setDestSearch('');
                setOpenDrop(null);
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, flexShrink: 0, color: C.textMuted, lineHeight: 1 }}
              aria-label="Clear destination"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {openDrop === 'dest' && destSearch !== '' && (
          <ul
            ref={destListRef}
            style={{
              ...DROP, padding: 4, margin: 0, listStyle: 'none',
              width: '100%', minWidth: 220, maxHeight: 220, overflowY: 'auto',
            }}
          >
            {destLoading
              ? <li className="px-3 py-2 text-sm" style={{ color: C.textMuted, fontFamily: NUNITO }}>Searching…</li>
              : destSuggestions.length > 0
                ? destSuggestions.map((s, idx) => (
                    <li key={s}
                      className="px-3 py-2 cursor-pointer rounded hover:bg-[#E7F9FF]"
                      style={{
                        fontFamily: NUNITO, fontWeight: 400, fontSize: 14, lineHeight: '24px', color: '#0B3857',
                        background: highlightedIdx === idx ? '#E7F9FF' : 'transparent',
                      }}
                      onMouseEnter={() => setHighlightedIdx(idx)}
                      onMouseDown={() => selectDestination(s)}
                    >
                      {s}
                    </li>
                  ))
                : <li className="px-3 py-2 text-sm" style={{ color: C.textMuted, fontFamily: NUNITO }}>No destinations found</li>
            }
          </ul>
        )}
      </div>

      {/* Date Range + Duration */}
      <div className="relative" style={{ flex: '1.5 1 0%', minWidth: 160 }}>
        <FieldShell open={openDrop === 'date'} onClick={() => toggle('date')}
          icon={iconImg(CalendarIcon, 'Calendar')} placeholderActive={!!(filters.startDate || filters.duration.length > 0)}>
          {dateLabel}
        </FieldShell>
        {openDrop === 'date' && (
          <div style={{ ...DROP, display: 'flex', gap: 16 }}>
            <div>
              <div style={{ fontFamily: NUNITO, fontWeight: 400, fontSize: 14, lineHeight: '24px', color: '#0B3857', marginBottom: 8 }}>
                {!filters.startDate ? 'Select start date' : !filters.endDate ? 'Select end date' : 'Date range selected'}
              </div>
              <Calendar startDate={filters.startDate} endDate={filters.endDate}
                onChange={(start, end) => setFilters(p => ({ ...p, startDate: start, endDate: end }))} />
            </div>
            <div style={{ borderLeft: `1px solid ${C.border}`, paddingLeft: 16 }}>
              <div style={{ fontFamily: NUNITO, fontWeight: 400, fontSize: 14, lineHeight: '24px', color: '#0B3857', marginBottom: 8 }}>Duration</div>
              <div className="flex flex-col gap-2" style={{ minWidth: 120 }}>
                {DURATION_OPTIONS.map(d => (
                  <CheckboxOption key={d} label={`${d} days`} active={filters.duration.includes(d)}
                    onChange={() => setFilters(p => ({ ...p, duration: toggleList(p.duration, d) as DurationRange[] }))} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* People */}
      <div className="relative" style={{ flex: '1 1 0%', minWidth: 120 }}>
        <FieldShell open={openDrop === 'people'} onClick={() => toggle('people')}
          icon={iconImg(PeopleIcon, 'People')} placeholderActive={filters.adults > 1 || filters.children > 0}>
          {peopleLabel}
        </FieldShell>
        {openDrop === 'people' && (
          <div style={{ ...DROP, width: 220 }}>
            {(['adults', 'children'] as const).map(field => (
              <div key={field} className="flex items-center justify-between py-1.5">
                <span style={{ fontFamily: NUNITO, fontWeight: 400, fontSize: 14, lineHeight: '24px', color: '#0B3857', textTransform: 'capitalize' }}>
                  {field}
                </span>
                <div className="flex items-center gap-3">
                  <button type="button"
                    onClick={() => setFilters(p => ({ ...p, [field]: Math.max(field === 'adults' ? 1 : 0, p[field] - 1) }))}
                    className="w-7 h-7 flex items-center justify-center rounded-full"
                    style={{ border: `1.5px solid ${C.primary}`, color: C.primary, background: '#fff' }}>-</button>
                  <span style={{ fontFamily: NUNITO, fontWeight: 400, fontSize: 14, lineHeight: '24px', color: '#0B3857', width: 18, textAlign: 'center' }}>
                    {filters[field]}
                  </span>
                  <button type="button"
                    onClick={() => setFilters(p => ({ ...p, [field]: p[field] + 1 }))}
                    className="w-7 h-7 flex items-center justify-center rounded-full"
                    style={{ border: `1.5px solid ${C.primary}`, color: C.primary, background: '#fff' }}>+</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Meal */}
      <div className="relative" style={{ flex: '1 1 0%', minWidth: 100 }}>
        <FieldShell open={openDrop === 'meal'} onClick={() => toggle('meal')}
          icon={iconImg(MealIcon, 'Meal')} placeholderActive={filters.mealPlans.length > 0}>
          {mealLabel}
        </FieldShell>
        {openDrop === 'meal' && (
          <div style={{ ...DROP_RIGHT, width: 200 }}>
            {MEAL_OPTIONS.map(opt => (
              <CheckboxOption key={opt.value} label={opt.label}
                active={filters.mealPlans.includes(opt.value)}
                onChange={() => setFilters(p => ({ ...p, mealPlans: toggleList(p.mealPlans, opt.value) as MealPlan[] }))} />
            ))}
          </div>
        )}
      </div>

      {/* Tour Type */}
      <div className="relative" style={{ flex: '1 1 0%', minWidth: 100 }}>
        <FieldShell open={openDrop === 'type'} onClick={() => toggle('type')}
          icon={iconImg(TourIcon, 'Tour type')} placeholderActive={filters.tourType.length > 0}>
          {filters.tourType.length === 0
            ? 'Tour type'
            : filters.tourType.map(t => TOUR_TYPE_OPTIONS.find(o => o.value === t)?.label).join(', ')}
        </FieldShell>
        {openDrop === 'type' && (
          <div style={{ ...DROP_RIGHT, width: 170 }}>
            {TOUR_TYPE_OPTIONS.map(tt => (
              <CheckboxOption key={tt.value} label={tt.label} active={filters.tourType.includes(tt.value)}
                onChange={() => setFilters(p => ({ ...p, tourType: toggleList(p.tourType, tt.value) as TourType[] }))} />
            ))}
          </div>
        )}
      </div>

      {/* Search */}
      <button type="button" onClick={() => { setOpenDrop(null); onSearch(filters); }}
        className="text-white transition-opacity hover:opacity-90"
        style={{ fontFamily: NUNITO, fontWeight: 700, fontSize: 14, background: C.primary, height: 48, padding: '0 24px', borderRadius: 8, flexShrink: 0 }}>
        Search
      </button>
    </div>
  );
};

export default FilterBar;
