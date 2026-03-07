import React from 'react';
import type { FilterOperator, FilterableField } from '../../types/filter';
import { OPERATOR_LABELS, OPERATORS_BY_TYPE, FIELD_TYPES } from '../../types/filter';

interface OperatorSelectorProps {
  field: FilterableField;
  value: FilterOperator;
  onChange: (operator: FilterOperator) => void;
}

export const OperatorSelector: React.FC<OperatorSelectorProps> = ({ field, value, onChange }) => {
  const fieldType = FIELD_TYPES[field];
  const availableOperators = OPERATORS_BY_TYPE[fieldType];

  // Check if current value is valid for this field type
  const isValidOperator = availableOperators.includes(value);

  // Auto-select first valid operator if current is invalid
  React.useEffect(() => {
    if (!isValidOperator && availableOperators.length > 0) {
      onChange(availableOperators[0]);
    }
  }, [field, isValidOperator, availableOperators, onChange]);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as FilterOperator)}
      className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white min-w-[110px]"
    >
      {availableOperators.map((operator) => (
        <option key={operator} value={operator}>
          {OPERATOR_LABELS[operator]}
        </option>
      ))}
    </select>
  );
};

export default OperatorSelector;
