import React, { useState, useRef, useEffect, useCallback } from 'react';

interface LocationSuggestion {
  city: string;
  state: string;
  lat: number;
  lon: number;
  display_name: string;
}

interface LocationAutocompleteProps {
  onLocationSelect: (location: LocationSuggestion) => void;
  initialValue?: string;
  placeholder?: string;
}

const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  onLocationSelect,
  initialValue = '',
  placeholder = 'Search city...'
}) => {
  const [query, setQuery] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [resolved, setResolved] = useState<LocationSuggestion | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const BACKEND_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

  // Debounced autocomplete fetch
  const fetchSuggestions = useCallback(async (q: string) => {
    if (q.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/geocode/autocomplete?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
        setIsOpen(data.suggestions?.length > 0);
      }
    } catch (err) {
      console.error('Autocomplete failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, [BACKEND_URL]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    setResolved(null);
    setSelectedIndex(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSelect = (suggestion: LocationSuggestion) => {
    setQuery(suggestion.display_name);
    setResolved(suggestion);
    setSuggestions([]);
    setIsOpen(false);
    onLocationSelect(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="location-autocomplete" ref={dropdownRef}>
      <div className="location-input-wrapper">
        <svg className="location-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className="location-input"
          autoComplete="off"
        />
        {isLoading && <div className="location-spinner" />}
        {resolved && (
          <div className="location-resolved-badge" title={`${resolved.lat.toFixed(2)}°N, ${resolved.lon.toFixed(2)}°E`}>
            ✓
          </div>
        )}
      </div>

      {isOpen && suggestions.length > 0 && (
        <ul className="location-dropdown">
          {suggestions.map((s, i) => (
            <li
              key={`${s.city}-${s.state}-${i}`}
              className={`location-option ${i === selectedIndex ? 'selected' : ''}`}
              onClick={() => handleSelect(s)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <svg className="option-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <div className="option-text">
                <span className="option-city">{s.city}</span>
                {s.state && <span className="option-state">{s.state}</span>}
              </div>
              <span className="option-coords">{s.lat.toFixed(1)}°, {s.lon.toFixed(1)}°</span>
            </li>
          ))}
        </ul>
      )}

      <style>{`
        .location-autocomplete {
          position: relative;
          width: 100%;
        }

        .location-input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }

        .location-icon {
          position: absolute;
          left: 12px;
          width: 18px;
          height: 18px;
          color: var(--text-muted, #94a3b8);
          pointer-events: none;
          z-index: 1;
        }

        .location-input {
          width: 100%;
          padding: 10px 40px 10px 38px;
          background: var(--surface-secondary, rgba(255,255,255,0.06));
          border: 1px solid var(--border-subtle, rgba(255,255,255,0.1));
          border-radius: 10px;
          color: var(--text-primary, #e2e8f0);
          font-size: 0.9rem;
          transition: border-color 0.2s, box-shadow 0.2s;
          outline: none;
        }

        .location-input:focus {
          border-color: var(--accent-primary, #6366f1);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
        }

        .location-input::placeholder {
          color: var(--text-muted, #64748b);
        }

        .location-spinner {
          position: absolute;
          right: 12px;
          width: 16px;
          height: 16px;
          border: 2px solid rgba(99, 102, 241, 0.3);
          border-top: 2px solid var(--accent-primary, #6366f1);
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        .location-resolved-badge {
          position: absolute;
          right: 12px;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--accent-success, #10b981);
          color: white;
          border-radius: 50%;
          font-size: 11px;
          cursor: help;
        }

        .location-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 0;
          right: 0;
          list-style: none;
          padding: 4px;
          margin: 0;
          background: var(--surface-elevated, #1e293b);
          border: 1px solid var(--border-subtle, rgba(255,255,255,0.1));
          border-radius: 12px;
          box-shadow: 0 12px 40px rgba(0,0,0,0.4);
          z-index: 100;
          max-height: 220px;
          overflow-y: auto;
          backdrop-filter: blur(20px);
        }

        .location-option {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          cursor: pointer;
          border-radius: 8px;
          transition: background 0.15s;
        }

        .location-option:hover,
        .location-option.selected {
          background: var(--surface-hover, rgba(99, 102, 241, 0.12));
        }

        .option-icon {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
          color: var(--accent-primary, #6366f1);
        }

        .option-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .option-city {
          color: var(--text-primary, #e2e8f0);
          font-weight: 500;
          font-size: 0.88rem;
        }

        .option-state {
          color: var(--text-muted, #64748b);
          font-size: 0.75rem;
          margin-top: 1px;
        }

        .option-coords {
          font-size: 0.7rem;
          color: var(--text-muted, #64748b);
          font-family: 'JetBrains Mono', monospace;
          flex-shrink: 0;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LocationAutocomplete;
