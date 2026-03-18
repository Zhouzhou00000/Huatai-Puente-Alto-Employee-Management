import React, { useState, useRef, useEffect } from 'react';

const WEEKDAYS_ZH = ['日', '一', '二', '三', '四', '五', '六'];
const MONTHS_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function DatePicker({ value, onChange, placeholder = '选择日期' }) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const ref = useRef(null);

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value, open]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevDays = new Date(viewYear, viewMonth, 0).getDate();

  const cells = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevDays - i, type: 'prev' });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, type: 'current' });
  }
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    cells.push({ day: d, type: 'next' });
  }

  const selectedStr = value || '';
  const todayStr = new Date().toISOString().split('T')[0];

  const isSelected = (day) => {
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${viewYear}-${m}-${d}` === selectedStr;
  };

  const isToday = (day) => {
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${viewYear}-${m}-${d}` === todayStr;
  };

  const handleSelect = (day) => {
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onChange(`${viewYear}-${m}-${d}`);
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const displayValue = value
    ? (() => {
        const d = new Date(value);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      })()
    : '';

  return (
    <div className="dp-wrap" ref={ref}>
      <div className="dp-input" onClick={() => setOpen(!open)}>
        <span className={`dp-input-text ${!displayValue ? 'dp-placeholder' : ''}`}>
          {displayValue || placeholder}
        </span>
        <span className="dp-input-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </span>
      </div>

      {open && (
        <div className="dp-dropdown">
          <div className="dp-header">
            <button type="button" className="dp-nav-btn" onClick={prevMonth}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span className="dp-title">
              {viewYear} {MONTHS_ES[viewMonth]}
            </span>
            <button type="button" className="dp-nav-btn" onClick={nextMonth}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          <div className="dp-weekdays">
            {WEEKDAYS_ZH.map(d => <div key={d} className="dp-weekday">{d}</div>)}
          </div>

          <div className="dp-days">
            {cells.map((cell, i) => (
              <button
                key={i}
                type="button"
                className={`dp-day${cell.type !== 'current' ? ' dp-day-outside' : ''}${cell.type === 'current' && isSelected(cell.day) ? ' dp-day-selected' : ''}${cell.type === 'current' && isToday(cell.day) ? ' dp-day-today' : ''}`}
                onClick={() => {
                  if (cell.type === 'prev') { prevMonth(); }
                  else if (cell.type === 'next') { nextMonth(); }
                  else handleSelect(cell.day);
                }}
              >
                {cell.day}
              </button>
            ))}
          </div>

          <div className="dp-footer">
            <button type="button" className="dp-footer-btn dp-clear" onClick={() => { onChange(''); setOpen(false); }}>
              清除
            </button>
            <button type="button" className="dp-footer-btn dp-today" onClick={() => { onChange(todayStr); setOpen(false); }}>
              今天
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
