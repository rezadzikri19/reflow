import React, { useState, useRef, useEffect } from 'react';
import type { FilterOperator, FilterableField } from '../../types/filter';
import { FIELD_TYPES } from '../../types/filter';
import { useNodeFilter } from '../../hooks/useNodeFilter';
import { useSheets } from '../../stores/flowchartStore';

interface ValueInputProps {
  field: FilterableField;
  operator: FilterOperator;
  value: string | string[] | boolean | null;
  onChange: (value: string | string[] | boolean | null) => void;
}

// Node type options
const NODE_TYPE_OPTIONS = [
  'process',
  'subprocess',
  'decision',
  'start',
  'end',
  'junction',
  'reference',
  'manualProcess',
  'connector',
  'terminator',
];

// Frequency options
const FREQUENCY_OPTIONS = [
  'hourly',
  'daily',
  'weekly',
  'biweekly',
  'monthly',
  'quarterly',
  'yearly',
  'asNeeded',
];

// Unit type options
const UNIT_TYPE_OPTIONS = [
  'documents',
  'applications',
  'cases',
  'customers',
  'transactions',
  'custom',
];

export const ValueInput: React.FC<ValueInputProps> = ({ field, operator, value, onChange }) => {
  const { filterOptions } = useNodeFilter();
  const sheets = useSheets();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle empty operators - no value needed
  if (operator === 'isEmpty' || operator === 'isNotEmpty') {
    return (
      <span className="text-xs text-gray-400 italic px-2 py-1.5">-</span>
    );
  }

  const fieldType = FIELD_TYPES[field];

  // Boolean field
  if (fieldType === 'boolean') {
    return (
      <select
        value={value === null ? '' : String(value)}
        onChange={(e) => onChange(e.target.value === 'true')}
        className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white min-w-[80px]"
      >
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  }

  // Select field - use multi-select for is/isNot operators, single select otherwise
  if (fieldType === 'select') {
    let options: string[] = [];

    switch (field) {
      case 'nodeType':
        options = NODE_TYPE_OPTIONS;
        break;
      case 'frequency':
        options = FREQUENCY_OPTIONS;
        break;
      case 'unitType':
        options = UNIT_TYPE_OPTIONS;
        break;
      case 'role':
        options = filterOptions.roles;
        break;
      case 'sheet':
        options = sheets.map(s => s.name);
        break;
      default:
        options = [];
    }

    // Use multi-select UI for is/isNot operators
    if (operator === 'is' || operator === 'isNot') {
      const selectedValues = Array.isArray(value) ? value : (value ? [value as string] : []);
      const filteredOptions = options.filter((opt) =>
        opt.toLowerCase().includes(searchTerm.toLowerCase())
      );

      const toggleValue = (opt: string) => {
        if (selectedValues.includes(opt)) {
          onChange(selectedValues.filter((v) => v !== opt));
        } else {
          onChange([...selectedValues, opt]);
        }
      };

      const removeValue = (opt: string) => {
        onChange(selectedValues.filter((v) => v !== opt));
      };

      return (
        <div className="relative" ref={dropdownRef}>
          <div
            onClick={() => setIsOpen(!isOpen)}
            className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white min-w-[150px] max-w-[250px] cursor-pointer flex items-center gap-1 flex-wrap"
          >
            {selectedValues.length === 0 ? (
              <span className="text-gray-400">Select...</span>
            ) : (
              selectedValues.map((v) => (
                <span
                  key={v}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded text-xs"
                >
                  {v}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeValue(v);
                    }}
                    className="hover:text-primary-900"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              ))
            )}
            <svg className="w-3 h-3 ml-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {isOpen && (
            <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-auto">
              <div className="sticky top-0 bg-white p-1 border-b border-gray-200">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-xs text-gray-500">No options available</div>
              ) : (
                filteredOptions.map((opt) => (
                  <div
                    key={opt}
                    onClick={() => toggleValue(opt)}
                    className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-gray-100 flex items-center gap-2 ${
                      selectedValues.includes(opt) ? 'bg-primary-50' : ''
                    }`}
                  >
                    <span
                      className={`w-4 h-4 border rounded flex items-center justify-center ${
                        selectedValues.includes(opt)
                          ? 'bg-primary-500 border-primary-500 text-white'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedValues.includes(opt) && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    {opt}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      );
    }

    // Single select for other operators
    return (
      <select
        value={(value as string) || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white min-w-[120px] max-w-[200px]"
      >
        <option value="">Select...</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  // Multiselect field
  if (fieldType === 'multiselect') {
    let options: string[] = [];

    switch (field) {
      case 'tags':
        options = filterOptions.tags;
        break;
      case 'documents':
        options = filterOptions.documents;
        break;
      case 'data':
        options = filterOptions.data;
        break;
      default:
        options = [];
    }

    const selectedValues = (value as string[]) || [];
    const filteredOptions = options.filter((opt) =>
      opt.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleValue = (opt: string) => {
      if (selectedValues.includes(opt)) {
        onChange(selectedValues.filter((v) => v !== opt));
      } else {
        onChange([...selectedValues, opt]);
      }
    };

    const removeValue = (opt: string) => {
      onChange(selectedValues.filter((v) => v !== opt));
    };

    return (
      <div className="relative" ref={dropdownRef}>
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white min-w-[150px] max-w-[250px] cursor-pointer flex items-center gap-1 flex-wrap"
        >
          {selectedValues.length === 0 ? (
            <span className="text-gray-400">Select...</span>
          ) : (
            selectedValues.map((v) => (
              <span
                key={v}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded text-xs"
              >
                {v}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeValue(v);
                  }}
                  className="hover:text-primary-900"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))
          )}
          <svg className="w-3 h-3 ml-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {isOpen && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-auto">
            <div className="sticky top-0 bg-white p-1 border-b border-gray-200">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-500">No options available</div>
            ) : (
              filteredOptions.map((opt) => (
                <div
                  key={opt}
                  onClick={() => toggleValue(opt)}
                  className={`px-3 py-1.5 text-xs cursor-pointer hover:bg-gray-100 flex items-center gap-2 ${
                    selectedValues.includes(opt) ? 'bg-primary-50' : ''
                  }`}
                >
                  <span
                    className={`w-4 h-4 border rounded flex items-center justify-center ${
                      selectedValues.includes(opt)
                        ? 'bg-primary-500 border-primary-500 text-white'
                        : 'border-gray-300'
                    }`}
                  >
                    {selectedValues.includes(opt) && (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  {opt}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    );
  }

  // Text field (default)
  return (
    <input
      type="text"
      value={(value as string) || ''}
      onChange={(e) => onChange(e.target.value || null)}
      placeholder="Enter value..."
      className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white min-w-[120px] max-w-[200px]"
    />
  );
};

export default ValueInput;
