import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ArrowUp, History, X, Command } from 'lucide-react';
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
  placeholder = "Ask about passive cooling, thermal mass, or site bioclimatics...",
  value: propValue,
  onChange: propOnChange,
  onSubmit,
  className,
  disabled,
  showHistory = false,
  historyKey = "radiant_input_history"
}: RadiantPromptInputProps) {
  const [internalValue, setInternalValue] = useState("");
  const [history, setHistory] = useState<string[]>(() => {
    if (showHistory) {
      try {
        const stored = localStorage.getItem(historyKey);
        if (stored) return JSON.parse(stored);
      } catch (err) {}
    }
    return [];
  });
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const isControlled = propValue !== undefined;
  const value = isControlled ? propValue : internalValue;

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
    const submitValue = (overrideValue || value).trim();
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
      <div 
        className={cn(
          "relative rounded-2xl bg-[#090d14]/95 backdrop-blur-xl transition-all duration-300 border shadow-2xl",
          isFocused 
            ? "border-[#FF5722]/80 shadow-[0_0_25px_rgba(255,87,34,0.18)]" 
            : "border-white/10 hover:border-white/20"
        )}
      >
        {/* Inner Content */}
        <div className="relative z-10 flex items-center gap-3 p-2 pl-4 pr-2 h-14 md:h-15">
          {/* Architectural Badge Icon */}
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#FF5722]/10 border border-[#FF5722]/20 text-[#FF5722] shrink-0">
            <Sparkles size={16} />
          </div>

          {/* Text Input */}
          <input
            type="text"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setIsFocused(true);
              if (showHistory && history.length > 0) setShowDropdown(true);
            }}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={disabled}
            className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-zinc-500 text-sm md:text-base font-normal tracking-normal h-full w-full min-w-0"
          />

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono text-zinc-500 uppercase px-2 py-1 rounded bg-white/5 border border-white/5">
              <span>Enter</span>
              <span>↵</span>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!value.trim() || disabled}
              className={cn(
                "flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-xl transition-all duration-200 cursor-pointer",
                value.trim() && !disabled
                  ? "bg-[#FF5722] hover:bg-[#FF7043] text-white shadow-[0_0_12px_rgba(255,87,34,0.4)] hover:scale-105 active:scale-95" 
                  : "bg-white/5 text-zinc-600 cursor-not-allowed border border-white/5"
              )}
              aria-label="Send architectural instruction"
              title="Submit Prompt"
            >
              <ArrowUp size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>

      {/* History Dropdown */}
      {showHistory && showDropdown && history.length > 0 && (
        <div className="absolute top-full left-0 w-full mt-2 bg-[#0c111a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-top-2 fade-in">
          <div className="p-3 border-b border-white/10 flex justify-between items-center bg-black/40">
            <div className="flex items-center gap-2 text-white/50 text-[11px] font-mono uppercase tracking-wider">
              <History size={13} className="text-[#FF5722]" /> Recent Architectural Queries
            </div>
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setHistory([]);
                localStorage.removeItem(historyKey);
                setShowDropdown(false);
              }}
              className="text-white/40 hover:text-white/80 text-xs transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>
          <ul className="max-h-56 overflow-y-auto p-1.5 divide-y divide-white/5">
            {history.map((h, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => {
                    if (!isControlled) setInternalValue(h);
                    propOnChange?.(h);
                    handleSubmit(h);
                  }}
                  className="w-full text-left px-3.5 py-2.5 hover:bg-white/5 rounded-xl text-zinc-300 hover:text-white text-xs md:text-sm transition-colors flex items-center gap-2.5 cursor-pointer"
                >
                  <History size={14} className="text-[#FF5722]/60 shrink-0" />
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
