import React, { useState, useRef, useEffect } from 'react';

// value: comma-separated string, onChange: called with comma-separated string
export default function MultiSelect({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);
  const inputRef = useRef(null);

  const selected = value ? value.split(',').map(v => v.trim()).filter(Boolean) : [];

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(o =>
    o && o.toLowerCase().includes(query.toLowerCase()) && !selected.includes(o)
  );

  const add = (opt) => {
    if (!opt || selected.includes(opt)) return;
    onChange([...selected, opt].join(','));
    setQuery('');
    inputRef.current?.focus();
  };

  const remove = (opt) => {
    onChange(selected.filter(s => s !== opt).join(','));
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && query.trim()) {
      e.preventDefault();
      add(query.trim());
      setOpen(false);
    }
    if (e.key === 'Backspace' && !query && selected.length > 0) {
      remove(selected[selected.length - 1]);
    }
  };

  return (
    <div className="multiselect-wrap" ref={ref}>
      <div
        className={`multiselect-box ${open ? 'focused' : ''}`}
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
      >
        {selected.map(s => (
          <span key={s} className="multiselect-tag">
            {s}
            <button
              type="button"
              className="multiselect-tag-remove"
              onMouseDown={e => { e.stopPropagation(); remove(s); }}
            >×</button>
          </span>
        ))}
        <input
          ref={inputRef}
          className="multiselect-input"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder={selected.length === 0 ? placeholder : ''}
        />
        <button
          type="button"
          className="multiselect-arrow"
          tabIndex={-1}
          onMouseDown={e => { e.preventDefault(); setOpen(o => !o); }}
        >▾</button>
      </div>
      {open && filtered.length > 0 && (
        <ul className="combobox-dropdown">
          {filtered.map(opt => (
            <li
              key={opt}
              className="combobox-option"
              onMouseDown={() => add(opt)}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
