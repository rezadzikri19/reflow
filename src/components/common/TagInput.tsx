import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useTagColors } from '../../hooks/useTagColors';

// ============================================================================
// Types
// ============================================================================

export interface TagInputProps {
  /** Label for the input */
  label?: string;
  /** Current tags value */
  value: string[];
  /** Callback when tags change */
  onChange: (tags: string[]) => void;
  /** Autocomplete suggestions */
  suggestions?: string[];
  /** Placeholder text */
  placeholder?: string;
  /** Helper text below input */
  helperText?: string;
  /** Whether the input is disabled */
  disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const TagInput: React.FC<TagInputProps> = ({
  label,
  value = [],
  onChange,
  suggestions = [],
  placeholder = 'Add a tag...',
  helperText,
  disabled = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { getTagColor } = useTagColors();

  // Filter suggestions based on input and exclude already selected tags
  const filteredSuggestions = useMemo(() => {
    if (!inputValue.trim()) return [];
    return suggestions.filter(
      (suggestion) =>
        suggestion.toLowerCase().includes(inputValue.toLowerCase()) &&
        !value.includes(suggestion)
    );
  }, [suggestions, inputValue, value]);

  const addTag = useCallback(
    (tag: string) => {
      const trimmedTag = tag.trim();
      if (trimmedTag && !value.includes(trimmedTag)) {
        onChange([...value, trimmedTag]);
      }
      setInputValue('');
      setShowSuggestions(false);
      setSelectedIndex(0);
    },
    [value, onChange]
  );

  const removeTag = useCallback(
    (tagToRemove: string) => {
      onChange(value.filter((tag) => tag !== tagToRemove));
    },
    [value, onChange]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      setShowSuggestions(true);
      setSelectedIndex(0);
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        if (showSuggestions && filteredSuggestions.length > 0) {
          addTag(filteredSuggestions[selectedIndex]);
        } else if (inputValue.trim()) {
          addTag(inputValue);
        }
      } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
        removeTag(value[value.length - 1]);
      } else if (e.key === 'ArrowDown' && showSuggestions) {
        e.preventDefault();
        setSelectedIndex((prev) =>
          Math.min(prev + 1, filteredSuggestions.length - 1)
        );
      } else if (e.key === 'ArrowUp' && showSuggestions) {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    },
    [
      inputValue,
      value,
      showSuggestions,
      filteredSuggestions,
      selectedIndex,
      addTag,
      removeTag,
    ]
  );

  const handleFocus = useCallback(() => {
    if (inputValue.trim()) {
      setShowSuggestions(true);
    }
  }, [inputValue]);

  const handleBlur = useCallback(() => {
    // Delay to allow click on suggestion items
    setTimeout(() => {
      setShowSuggestions(false);
    }, 150);
  }, []);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      addTag(suggestion);
      inputRef.current?.focus();
    },
    [addTag]
  );

  return (
    <div className="w-full" ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {label}
        </label>
      )}
      <div
        className={`
          min-h-[42px] rounded-md border bg-white px-3 py-2
          transition-colors duration-150
          ${disabled
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : 'border-gray-300 hover:border-gray-400 focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500'
          }
        `}
      >
        <div className="flex flex-wrap gap-1.5 items-center">
          {/* Tag chips */}
          {value.map((tag) => {
            const color = getTagColor(tag);
            return (
              <span
                key={tag}
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${color.bg} ${color.text}`}
              >
                {tag}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className={`inline-flex items-center justify-center w-4 h-4 rounded-full ${color.hover} focus:outline-none`}
                  >
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                )}
              </span>
            );
          })}
          {/* Input field */}
          {!disabled && (
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={handleFocus}
              onBlur={handleBlur}
              placeholder={value.length === 0 ? placeholder : ''}
              className="flex-1 min-w-[120px] text-sm bg-transparent border-none outline-none placeholder-gray-400"
            />
          )}
        </div>
      </div>

      {/* Autocomplete dropdown */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-w-[250px] bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
          <ul className="py-1">
            {filteredSuggestions.map((suggestion, index) => (
              <li key={suggestion}>
                <button
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className={`
                    w-full text-left px-3 py-2 text-sm
                    ${index === selectedIndex
                      ? 'bg-primary-50 text-primary-900'
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {helperText && (
        <p className="mt-1.5 text-xs text-gray-500">{helperText}</p>
      )}
    </div>
  );
};

export default TagInput;
