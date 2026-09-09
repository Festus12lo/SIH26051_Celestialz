import React, { useState, useEffect, useRef } from 'react';
import { Plus, Mic, ArrowUp, History, X } from 'lucide-react';
import clsx from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export interface RadiantPromptInputProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  className?: string;
  disabled?: boolean;
  showHistory?: boolean;
  historyKey?: string;
}

export function RadiantPromptInput({
  placeholder = "Ask anything...",
  value: propValue,
  onChange: propOnChange,
  onSubmit,
  className,
  disabled,
  showHistory = false,
  historyKey = "radiant_input_history"
}: RadiantPromptInputProps) {
  const [internalValue, setInternalValue] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const isControlled = propValue !== undefined;
  const value = isControlled ? propValue : internalValue;

  useEffect(() => {
    if (showHistory) {
      try {
        const stored = localStorage.getItem(historyKey);
        if (stored) {
          setHistory(JSON.parse(stored));
        }
      } catch (e) { }
    }
  }, [showHistory, historyKey]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) {
      setInternalValue(e.target.value);
    }
    propOnChange?.(e.target.value);
  };

  const handleSubmit = (overrideValue?: string) => {
    const submitValue = overrideValue || value;
    if (submitValue && !disabled) {
      if (showHistory) {
        const newHistory = [submitValue, ...history.filter(h => h !== submitValue)].slice(0, 5);
        setHistory(newHistory);
        localStorage.setItem(historyKey, JSON.stringify(newHistory));
      }
      onSubmit?.(submitValue);
      if (!isControlled) setInternalValue("");
      setShowDropdown(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div ref={wrapperRef} className={cn("relative w-full max-w-2xl mx-auto", className)}>
      {/* 
        Custom CSS for the gradient animation using @property which Tailwind doesn't fully support inline yet.
        We use a unique class scope 'radiant-input-wrapper' to avoid conflicts.
      */}
      <style>{`
        @property --rotation {
          syntax: '<angle>';
          inherits: false;
          initial-value: 0deg;
        }
        
        @keyframes rotate-gradient {
          to {
            --rotation: 360deg;
          }
        }

        .radiant-input-wrapper {
          --border-size: 3px;
          --gradient: conic-gradient(
            from var(--rotation) 
            at 50% 50% in oklab, 
            oklch(0.63 0.2 251.22) 27%, 
            oklch(0.67 0.21 25.81) 33%, 
            oklch(0.9 0.19 93.93) 41%, 
            oklch(0.79 0.25 150.49) 49%, 
            oklch(0.63 0.2 251.22) 65%, 
            oklch(0.72 0.21 150.89) 93%, 
            oklch(0.63 0.2 251.22)
          );
          animation: rotate-gradient 5s infinite linear;
        }

        /* The glowing border effect */
        .radiant-input-wrapper::before {
          content: '';
          position: absolute;
          inset: calc(var(--border-size) * -1);
          border-radius: inherit;
          background: var(--gradient);
          z-index: -1;
          filter: blur(8px);
          opacity: 0.6;
        }

        /* The sharp border mask */
        .radiant-input-border {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: var(--border-size);
          background: var(--gradient);
          -webkit-mask: 
            linear-gradient(#fff 0 0) content-box, 
            linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
        }
      `}</style>

      <div className="radiant-input-wrapper relative rounded-full bg-white dark:bg-zinc-900 group transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
        
        {/* Animated Gradient Border */}
        <div className="radiant-input-border rounded-full" />
        
        {/* Inner Content */}
        <div className="relative z-10 flex items-center gap-2 p-1.5 pl-4 pr-1.5 h-14 md:h-16">
          
          {/* Add Button */}
          <button 
            type="button"
            className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors"
            aria-label="Add attachment"
          >
            <Plus size={20} strokeWidth={2} />
          </button>

          {/* Text Input */}
          <input
            type="text"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => showHistory && history.length > 0 && setShowDropdown(true)}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-zinc-500 text-base md:text-lg font-light tracking-wide h-full w-full min-w-0"
          />

          {/* Right Actions */}
          <div className="flex items-center gap-1 md:gap-2">
            
            {/* Mic Button */}
            <button 
              type="button"
              className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 rounded-full text-zinc-500 hover:bg-zinc-800 hover:text-white transition-colors"
              aria-label="Use microphone"
            >
              <Mic size={20} strokeWidth={2} />
            </button>

            {/* Submit Button */}
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!value || disabled}
              className={cn(
                "flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full transition-all duration-300",
                value 
                  ? "bg-white text-black hover:scale-105 active:scale-95 shadow-md" 
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50"
              )}
              aria-label="Send message"
            >
              <ArrowUp size={22} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* History Dropdown */}
      {showHistory && showDropdown && history.length > 0 && (
        <div className="absolute top-full left-0 w-full mt-4 bg-zinc-900 border border-white/10 rounded-2xl shadow-xl overflow-hidden z-50 animate-in slide-in-from-top-2 fade-in">
          <div className="p-3 border-b border-white/10 flex justify-between items-center bg-black/20">
            <div className="flex items-center gap-2 text-white/50 text-xs font-medium uppercase tracking-wider">
              <History size={14} /> Recent Searches
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setHistory([]);
                localStorage.removeItem(historyKey);
                setShowDropdown(false);
              }}
              className="text-white/30 hover:text-white/70 text-xs transition-colors"
            >
              Clear
            </button>
          </div>
          <ul className="max-h-60 overflow-y-auto p-2">
            {history.map((h, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => {
                    if (!isControlled) setInternalValue(h);
                    propOnChange?.(h);
                    handleSubmit(h);
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-white/5 rounded-xl text-white/80 hover:text-white text-sm transition-colors flex items-center gap-3"
                >
                  <History size={16} className="text-white/30" />
                  <span className="truncate">{h}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default RadiantPromptInput;
