import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { X, ChevronDown, User } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface RoleSelectProps {
  /** Label for the input */
  label?: string;
  /** Current role value */
  value?: string;
  /** Callback when role changes */
  onChange: (role: string | undefined) => void;
  /** Autocomplete suggestions */
  suggestions?: string[];
  /** Placeholder text */
  placeholder?: string;
  /** Helper text below input */
  helperText?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Whether to allow creating new roles */
  allowCreate?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const RoleSelect: React.FC<RoleSelectProps> = ({
  label,
  value,
  onChange,
  suggestions = [],
  placeholder = 'Select a role...',
  helperText,
  disabled = false,
  allowCreate = true,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input
  const filteredSuggestions = useMemo(() => {
    if (!inputValue.trim()) return suggestions;
    return suggestions.filter((suggestion) =>
      suggestion.toLowerCase().includes(inputValue.toLowerCase())
    );
  }, [suggestions, inputValue]);

  // Check if input value matches an existing suggestion
  const exactMatch = useMemo(() => {
    return suggestions.some(
      (suggestion) => suggestion.toLowerCase() === inputValue.toLowerCase()
    );
  }, [suggestions, inputValue]);

  // Reset input when dropdown opens
  useEffect(() => {
    if (showDropdown) {
      setInputValue('');
      setSelectedIndex(0);
    }
  }, [showDropdown]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectRole = useCallback(
    (role: string) => {
      onChange(role);
      setInputValue('');
      setShowDropdown(false);
      setSelectedIndex(0);
    },
    [onChange]
  );

  const clearRole = useCallback(() => {
    onChange(undefined);
    setInputValue('');
  }, [onChange]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      setSelectedIndex(0);
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredSuggestions.length > 0 && selectedIndex < filteredSuggestions.length) {
          selectRole(filteredSuggestions[selectedIndex]);
        } else if (allowCreate && inputValue.trim()) {
          selectRole(inputValue.trim());
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        const maxIndex = filteredSuggestions.length > 0 ? filteredSuggestions.length - 1 : 0;
        setSelectedIndex((prev) => Math.min(prev + 1, maxIndex));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') {
        setShowDropdown(false);
        setInputValue('');
      } else if (e.key === 'Backspace' && !inputValue && value) {
        clearRole();
      }
    },
    [inputValue, value, filteredSuggestions, selectedIndex, selectRole, clearRole, allowCreate]
  );

  const handleFocus = useCallback(() => {
    if (!disabled) {
      setShowDropdown(true);
    }
  }, [disabled]);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      selectRole(suggestion);
      inputRef.current?.focus();
    },
    [selectRole]
  );

  const handleCreateNew = useCallback(() => {
    if (allowCreate && inputValue.trim()) {
      selectRole(inputValue.trim());
    }
  }, [allowCreate, inputValue, selectRole]);

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <div
        className={`
          relative min-h-[42px] rounded-md border bg-white
          transition-colors duration-150
          ${disabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-gray-400 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500'
          }
        `}
      >
        {/* Selected role chip or input */}
        <div className="flex items-center gap-2 px-3 py-2">
          {value ? (
            <>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded-full bg-purple-100 text-purple-800">
                <User className="w-3.5 h-3.5" />
                {value}
              </span>
              {!disabled && (
                <button
                  type="button"
                  onClick={clearRole}
                  className="inline-flex items-center justify-center w-5 h-5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none transition-colors"
                  title="Clear role"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          ) : (
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              placeholder={placeholder}
              disabled={disabled}
              className="flex-1 min-w-[120px] text-sm bg-transparent border-none outline-none placeholder-gray-400"
            />
          )}
          {!value && !disabled && (
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>

        {/* Dropdown */}
        {showDropdown && !disabled && !value && (
          <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
            {filteredSuggestions.length > 0 ? (
              <ul className="py-1">
                {filteredSuggestions.map((suggestion, index) => (
                  <li key={suggestion}>
                    <button
                      type="button"
                      onClick={() => handleSuggestionClick(suggestion)}
                      className={`
                        w-full text-left px-3 py-2 text-sm flex items-center gap-2
                        ${index === selectedIndex
                          ? 'bg-primary-50 text-primary-900'
                          : 'text-gray-700 hover:bg-gray-50'
                        }
                      `}
                    >
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      {suggestion}
                    </button>
                  </li>
                ))}
              </ul>
            ) : inputValue.trim() && allowCreate ? (
              <div className="py-2 px-3">
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="w-full text-left text-sm text-primary-600 hover:text-primary-700"
                >
                  Create "{inputValue.trim()}"
                </button>
              </div>
            ) : (
              <div className="py-3 px-3 text-sm text-gray-400 text-center">
                No roles found. Type to create a new one.
              </div>
            )}

            {/* Show "Create new" option if input doesn't match exactly and allowCreate is true */}
            {inputValue.trim() && !exactMatch && filteredSuggestions.length > 0 && allowCreate && (
              <div className="border-t border-gray-100 py-1">
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className={`
                    w-full text-left px-3 py-2 text-sm
                    ${selectedIndex === filteredSuggestions.length
                      ? 'bg-primary-50 text-primary-900'
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  Create "{inputValue.trim()}"
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {helperText && (
        <p className="mt-1.5 text-xs text-gray-500">{helperText}</p>
      )}
    </div>
  );
};

export default RoleSelect;
