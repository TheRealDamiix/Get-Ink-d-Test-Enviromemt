import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { MapPin, Loader2 } from 'lucide-react';

interface Suggestion {
  display: string;
  lat: string;
  lon: string;
}

interface NominatimResult {
  address?: {
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    county?: string;
    municipality?: string;
    hamlet?: string;
    state?: string;
    country?: string;
  };
  lat: string;
  lon: string;
}

export interface LocationAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (suggestion: { display: string; lat: string; lon: string }) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  showIcon?: boolean;
  id?: string;
}

const LocationAutocomplete = ({
  value,
  onChange,
  onSelect,
  placeholder = 'City, State, or Zip...',
  className = '',
  inputClassName = '',
  showIcon = true,
  id,
}: LocationAutocompleteProps) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setIsLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query.trim())}&format=json&limit=7&addressdetails=1`;
      const res = await fetch(url, { signal: abortRef.current.signal });
      const data: NominatimResult[] = await res.json();

      const formatted = data
        .map(item => {
          const addr = item.address || {};
          const city =
            addr.city ||
            addr.town ||
            addr.village ||
            addr.suburb ||
            addr.county ||
            addr.municipality ||
            addr.hamlet;
          const state = addr.state;
          const country = addr.country;
          const parts = [city, state, country].filter(Boolean);
          return parts.length ? { display: parts.join(', '), lat: item.lat, lon: item.lon } : null;
        })
        .filter((item): item is Suggestion => item !== null);

      const seen = new Set<string>();
      const unique = formatted.filter(({ display }) => {
        if (seen.has(display)) return false;
        seen.add(display);
        return true;
      });

      setSuggestions(unique);
      setIsOpen(unique.length > 0);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setSuggestions([]);
        setIsOpen(false);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setActiveIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 320);
  };

  const handleSelect = (suggestion: Suggestion) => {
    onChange(suggestion.display);
    if (onSelect) onSelect(suggestion);
    setSuggestions([]);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  // Close dropdown on outside click — guarded for SSR compatibility
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        {showIcon && (
          <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/50 shrink-0 z-10" />
        )}
        {isLoading && (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground/40 z-10" />
        )}
        <Input
          id={id}
          type="text"
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => value && suggestions.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          autoComplete="off"
          className={`${showIcon ? 'pl-10' : ''} ${inputClassName}`}
        />
      </div>

      {isOpen && suggestions.length > 0 && (
        <div
          className="absolute z-[60] top-full left-0 right-0 mt-1.5 rounded-xl border border-border/50 overflow-hidden shadow-2xl shadow-black/50"
          style={{ background: 'rgba(18,18,18,0.97)', backdropFilter: 'blur(14px)' }}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 transition-colors border-b border-border/10 last:border-0 ${
                index === activeIndex
                  ? 'bg-primary/20 text-primary'
                  : 'text-foreground/75 hover:bg-white/5 hover:text-foreground'
              }`}
              onMouseDown={e => e.preventDefault()}
              onClick={() => handleSelect(suggestion)}
            >
              <MapPin className="w-3.5 h-3.5 text-primary/50 shrink-0" />
              <span className="truncate">{suggestion.display}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LocationAutocomplete;
