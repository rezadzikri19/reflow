import React from 'react';
import type { FilterRule as FilterRuleType, FilterableField, FilterOperator } from '../../types/filter';
import FieldSelector from './FieldSelector';
import OperatorSelector from './OperatorSelector';
import ValueInput from './ValueInput';

interface FilterRuleProps {
  rule: FilterRuleType;
  onUpdate: (updates: Partial<FilterRuleType>) => void;
  onDelete: () => void;
}

// Icons
const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export const FilterRule: React.FC<FilterRuleProps> = ({ rule, onUpdate, onDelete }) => {
  const handleFieldChange = (field: FilterableField) => {
    onUpdate({
      field,
      value: null,
    });
  };

  const handleOperatorChange = (operator: FilterOperator) => {
    onUpdate({
      operator,
      // Reset value when switching to empty/not empty operators
      value: operator === 'isEmpty' || operator === 'isNotEmpty' ? null : rule.value,
    });
  };

  const handleValueChange = (value: string | string[] | boolean | null) => {
    onUpdate({ value });
  };

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 bg-gray-50 rounded-md group hover:bg-gray-100 transition-colors">
      {/* Field selector */}
      <FieldSelector value={rule.field} onChange={handleFieldChange} />

      {/* Operator selector */}
      <OperatorSelector
        field={rule.field}
        value={rule.operator}
        onChange={handleOperatorChange}
      />

      {/* Value input */}
      <ValueInput
        field={rule.field}
        operator={rule.operator}
        value={rule.value}
        onChange={handleValueChange}
      />

      {/* Delete button */}
      <button
        onClick={onDelete}
        className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
        title="Delete rule"
      >
        <TrashIcon />
      </button>
    </div>
  );
};

export default FilterRule;
