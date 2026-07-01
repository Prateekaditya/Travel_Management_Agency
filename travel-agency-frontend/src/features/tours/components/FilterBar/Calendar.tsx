import React, { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { C, NUNITO } from "../../constants/theme";

interface CalendarProps {
  startDate: string;
  endDate: string;
  onChange: (start: string, end: string) => void;
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const WEEKDAYS = ["M","T","W","T","F","S","S"];

const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

const sameDay = (a: Date, b: Date) =>
  a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();

const Calendar: React.FC<CalendarProps> = ({ startDate, endDate, onChange }) => {
  const initial = startDate ? new Date(startDate) : new Date();
  const [view, setView] = useState({ year: initial.getFullYear(), month: initial.getMonth() });
  const [hovered, setHovered] = useState<Date | null>(null);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const start = startDate ? new Date(startDate) : null;
  const end   = endDate   ? new Date(endDate)   : null;

  // Preview range end: use hovered date while selecting second date
  const rangeEnd = (start && !end && hovered) ? hovered : end;
  const effStart = start && rangeEnd && rangeEnd < start ? rangeEnd : start;
  const effEnd   = start && rangeEnd && rangeEnd < start ? start : rangeEnd;

  const firstOfMonth = new Date(view.year, view.month, 1);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const daysInPrev = new Date(view.year, view.month, 0).getDate();

  const cells: { day: number; date: Date; outside: boolean }[] = [];
  for (let i = 0; i < startWeekday; i++) {
    const day = daysInPrev - startWeekday + 1 + i;
    cells.push({ day, date: new Date(view.year, view.month - 1, day), outside: true });
  }
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ day: d, date: new Date(view.year, view.month, d), outside: false });
  while (cells.length < 42) {
    const d = cells.length - (startWeekday + daysInMonth) + 1;
    cells.push({ day: d, date: new Date(view.year, view.month + 1, d), outside: true });
  }

  const navigate = (delta: number) =>
    setView(v => {
      const m = v.month + delta;
      return { year: v.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });

  const handleClick = (date: Date) => {
    const iso = toIso(date);
    if (start && !end && sameDay(date, start)) {
      onChange("", "");
    } else if (!start || (start && end)) {
      onChange(iso, "");
    } else {
      if (date < start) { onChange(iso, toIso(start)); }
      else               { onChange(toIso(start), iso); }
    }
  };

  return (
    <div style={{ width: "clamp(180px, 40vw, 240px)" }}>
      <div className="flex items-center justify-between mb-2">
        <button type="button" onClick={() => navigate(-1)}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#E7F9FF]"
          aria-label="Previous month">
          <ChevronLeft size={16} color="#95cbf3" />
        </button>
        <span style={{ fontFamily: NUNITO, fontWeight: 700, fontSize: "clamp(11px,3vw,14px)", color: C.text }}>
          {MONTHS[view.month]} {view.year}
        </span>
        <button type="button" onClick={() => navigate(1)}
          className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#E7F9FF]"
          aria-label="Next month">
          <ChevronRight size={16} color="#3B6786" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-y-1 mb-1">
        {WEEKDAYS.map((w, i) => (
          <div key={i} className="text-center"
            style={{ fontFamily: NUNITO, fontSize: "clamp(9px,2.5vw,12px)", fontWeight: 700, color: C.textMuted }}>
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((c, idx) => {
          const isPast = c.date < today;
          const disabled = c.outside || isPast;
          const isStart = !disabled && !!start && sameDay(c.date, start);
          const isEnd   = !disabled && !!rangeEnd && sameDay(c.date, rangeEnd);
          const inRange = !disabled && !!effStart && !!effEnd && c.date > effStart && c.date < effEnd;
          const marker  = isStart || isEnd;
          const bgColor = (C as any).bgRange || "#E7F9FF";
          return (
            <div key={idx} className="relative h-8 flex items-center justify-center"
              style={{
                background: (inRange || marker) && !!rangeEnd ? bgColor : "transparent",
                borderTopLeftRadius:    isStart ? 999 : 0,
                borderBottomLeftRadius: isStart ? 999 : 0,
                borderTopRightRadius:   isEnd   ? 999 : 0,
                borderBottomRightRadius:isEnd   ? 999 : 0,
              }}>
              <button type="button" disabled={disabled}
                onClick={() => !disabled && handleClick(c.date)}
                onMouseEnter={() => !disabled && setHovered(c.date)}
                onMouseLeave={() => setHovered(null)}
                className="w-7 h-7 flex items-center justify-center rounded-full transition-colors"
                style={{
                  fontFamily: NUNITO, fontSize: "clamp(10px,2.5vw,13px)",
                  fontWeight: marker ? 800 : 500,
                  color: disabled ? "#C7D2DC" : marker ? "#FFFFFF" : C.text,
                  background: marker ? C.primary : "transparent",
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: isPast && !c.outside ? 0.38 : 1,
                }}
                onMouseOver={e => { if (!disabled && !marker) e.currentTarget.style.background = "#E7F9FF"; }}
                onMouseOut={e  => { if (!disabled && !marker) e.currentTarget.style.background = "transparent"; }}
              >
                {c.day}
              </button>
            </div>
          );
        })}
      </div>

      {(start || end) && (
        <div className="text-center mt-2">
          <button type="button" onClick={() => onChange("", "")}
            style={{ fontFamily: NUNITO, fontSize: 11, color: C.primary, textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}>
            Clear dates
          </button>
        </div>
      )}
    </div>
  );
};

export default Calendar;
