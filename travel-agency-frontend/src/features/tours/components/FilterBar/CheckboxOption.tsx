import React from 'react';
import { Check } from 'lucide-react';
import { C, NUNITO } from '../../constants/theme';

interface CheckboxOptionProps {
  label: string;
  active: boolean;
  onChange: () => void;
}

const CheckboxOption: React.FC<CheckboxOptionProps> = ({ label, active, onChange }) => (
  <label
    className="flex items-center gap-2 cursor-pointer px-2 py-1.5 rounded transition-all"
    style={{ background: active ? '#E7F9FF' : undefined }}
    onMouseOver={e => { if (!active) (e.currentTarget as HTMLElement).style.background = '#EDF4FA'; }}
    onMouseOut={e => { if (!active) (e.currentTarget as HTMLElement).style.background = ''; }}
  >
    <span
      className="flex items-center justify-center flex-shrink-0"
      style={{
        width: 18,
        height: 18,
        border: `1.5px solid ${active ? C.primary : C.border}`,
        borderRadius: 4,
        background: active ? C.primary : '#fff',
      }}
    >
      {active && <Check size={11} color="#fff" strokeWidth={3} />}
    </span>
    <input type="checkbox" className="hidden" checked={active} onChange={onChange} />
    <span style={{ fontFamily: NUNITO, fontWeight: 400, fontSize: 14, lineHeight: '24px', letterSpacing: 0, color: '#0B3857' }}>
      {label}
    </span>
  </label>
);

export default CheckboxOption;
