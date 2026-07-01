import { useState, useRef, useEffect } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  align?: 'left' | 'right'
  onOpen?: () => void
  forceClose?: boolean
}

const ChevronIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  align = 'left',
  onOpen,
  forceClose,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [highlighted, setHighlighted] = useState(-1)
  const ref = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Close when parent requests it
  useEffect(() => {
    if (forceClose) {
      setIsOpen(false)
      setHighlighted(-1)
    }
  }, [forceClose])

  const selectedOption = options.find(o => o.value === value)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false)
        setHighlighted(-1)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlighted(h => {
          const next = h < options.length - 1 ? h + 1 : 0;
          scrollToOption(next);
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlighted(h => {
          const prev = h > 0 ? h - 1 : options.length - 1;
          scrollToOption(prev);
          return prev;
        });
      } else if (e.key === 'Enter') {
        if (highlighted >= 0 && highlighted < options.length) {
          handleSelect(options[highlighted].value);
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        setHighlighted(-1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, highlighted, options]);

  const scrollToOption = (idx: number) => {
    if (!listRef.current) return;
    const optionEls = listRef.current.querySelectorAll('.cs__option');
    if (optionEls[idx]) {
      (optionEls[idx] as HTMLElement).scrollIntoView({ block: 'nearest' });
    }
  };

  const handleSelect = (val: string) => {
    onChange(val)
    setIsOpen(false)
    setHighlighted(-1)
  }

  const open = isOpen && !disabled

  return (
    <div className={`cs${open ? ' cs--open' : ''}${disabled ? ' cs--disabled' : ''}`} ref={ref}>
      <button
        type="button"
        className="cs__trigger"
        onClick={() => {
          if (!disabled) {
            const opening = !isOpen
            setIsOpen(v => !v)
            setHighlighted(options.findIndex(o => o.value === value))
            if (opening && onOpen) onOpen()
          }
        }}
        aria-expanded={open}
        aria-haspopup="listbox"
        disabled={disabled}
      >
        <span className={selectedOption ? 'cs__value' : 'cs__placeholder'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="cs__chevron"><ChevronIcon /></span>
      </button>

      {open && (
        <div
          className={`cs__dropdown${align === 'right' ? ' cs__dropdown--right' : ''}`}
          role="listbox"
          ref={listRef}
        >
          {options.map((option, idx) => (
            <button
              key={option.value}
              type="button"
              className={`cs__option${value === option.value ? ' cs__option--selected' : ''}${highlighted === idx ? ' cs__option--highlighted' : ''}`}
              onClick={() => handleSelect(option.value)}
              onMouseEnter={() => setHighlighted(idx)}
            >
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
