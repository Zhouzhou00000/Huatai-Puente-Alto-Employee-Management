import React, { useState, useRef, useEffect } from 'react';

export default function ComboBox({ value, onChange, options, placeholder }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);
  const inputRef = useRef(null);

  // Sync display text when value changes externally
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setQuery(value || '');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [value]);

  const filtered = options.filter(o =>
    o.toLowerCase().includes(query.toLowerCase())
  );

  const handleInput = (e) => {
    setQuery(e.target.value);
    onChange(e.target.value);
    setOpen(true);
  };

  const select = (opt) => {
    onChange(opt);
    setQuery(opt);
    setOpen(false);
  };

  return (
    <div className="combobox-wrap" ref={ref}>
      <div className="combobox-input-wrap">
        <input
          ref={inputRef}
          className="combobox-input"
          value={query}
          onChange={handleInput}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
        />
        <button
          type="button"
          className="combobox-arrow"
          tabIndex={-1}
          onClick={() => { setOpen(o => !o); inputRef.current?.focus(); }}
        >
          ▾
        </button>
      </div>
      {open && filtered.length > 0 && (
        <ul className="combobox-dropdown">
          {filtered.map(opt => (
            <li
              key={opt}
              className={`combobox-option ${opt === value ? 'selected' : ''}`}
              onMouseDown={() => select(opt)}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
