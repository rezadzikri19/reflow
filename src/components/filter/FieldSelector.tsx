import React from 'react';
import type { FilterableField } from '../../types/filter';
import { FIELD_LABELS } from '../../types/filter';

interface FieldSelectorProps {
  value: FilterableField;
  onChange: (field: FilterableField) => void;
}

// Group fields by category
const FIELD_GROUPS = {
  'Basic': ['label', 'description', 'nodeType', 'sheet'] as FilterableField[],
  'People & Resources': ['role', 'tags'] as FilterableField[],
  'Inputs & Outputs': ['documents', 'data', 'systems'] as FilterableField[],
  'Timing': ['frequency', 'unitType'] as FilterableField[],
  'Status': ['locked', 'requiresFTE', 'hasPainPoints', 'hasImprovement', 'hasRisk'] as FilterableField[],
  'Analysis': ['painPoints', 'improvement', 'risk'] as FilterableField[],
};

export const FieldSelector: React.FC<FieldSelectorProps> = ({ value, onChange }) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as FilterableField)}
      className="px-2 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white min-w-[120px]"
    >
      {Object.entries(FIELD_GROUPS).map(([groupName, fields]) => (
        <optgroup key={groupName} label={groupName}>
          {fields.map((field) => (
            <option key={field} value={field}>
              {FIELD_LABELS[field]}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
};

export default FieldSelector;
