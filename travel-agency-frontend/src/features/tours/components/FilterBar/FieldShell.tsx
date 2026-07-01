import React from 'react';
import { ChevronDown } from 'lucide-react';
import { C, NUNITO } from '../../constants/theme';

interface FieldShellProps {
  open: boolean;
  onClick?: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  showChevron?: boolean;
  placeholderActive: boolean;
}

const FieldShell: React.FC<FieldShellProps> = ({
  open, onClick, icon, children, showChevron = true, placeholderActive,
}) => (
  <div
    onClick={onClick}
    className="flex items-center gap-2 px-3 bg-white rounded-lg cursor-pointer select-none"
    style={{
      height: 48,
      border: `1px solid ${open || placeholderActive ? C.primary : C.border}`,
      boxShadow: open ? `0 0 0 1px ${C.primary}, 0 4px 16px rgba(11,56,87,0.18)` : 'none',
      transition: 'box-shadow 0.18s ease, border-color 0.18s ease',
      minWidth: 0,
    }}
    onMouseEnter={e => {
      if (!open) (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(11,56,87,0.18)';
    }}
    onMouseLeave={e => {
      if (!open) (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
    }}
  >
    {icon}
    <span
      className="flex-1 truncate"
      style={{
        fontFamily: NUNITO,
        fontWeight: 400,
        fontStyle: 'normal',
        fontSize: 14,
        lineHeight: '24px',
        letterSpacing: 0,
        textAlign: 'center',
        verticalAlign: 'middle',
        color: placeholderActive ? '#0B3857' : C.placeholder,
      }}
    >
      {children}
    </span>
    {showChevron && (
      <ChevronDown
        size={16}
        color="#3B6786"
        className={`flex-shrink-0 transition-transform ${open || placeholderActive ? 'rotate-180' : ''}`}
      />
    )}
  </div>
);

export default FieldShell;
