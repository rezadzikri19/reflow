import React from 'react';
import { useTagColors } from '../../hooks/useTagColors';
import { useRoleColors } from '../../hooks/useRoleColors';
import {
  useFlowchartStore,
  useFilterTags,
  useFilterRoles,
  useFilterDocuments,
  useFilterData,
  useHasActiveFilters,
} from '../../stores/flowchartStore';
import { useNodeFilter } from '../../hooks/useNodeFilter';
import type { TagColor } from '../../utils/tagColors';

// =============================================================================
// Types
// =============================================================================

interface FilterChipProps {
  label: string;
  isSelected: boolean;
  color: TagColor;
  onClick: () => void;
}

interface FilterCategoryProps {
  title: string;
  options: string[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  getColor: (value: string) => TagColor;
  emptyMessage?: string;
}

// =============================================================================
// Icon Components
// =============================================================================

const FilterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

// =============================================================================
// Sub-Components
// =============================================================================

const FilterChip: React.FC<FilterChipProps> = ({ label, isSelected, color, onClick }) => (
  <button
    onClick={onClick}
    className={`
      inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full
      transition-all duration-150
      ${isSelected
        ? `${color.solid} text-white shadow-sm`
        : `${color.bg} ${color.text} ${color.hover} border border-gray-200`
      }
    `}
  >
    {label}
    {isSelected && <CheckIcon />}
  </button>
);

const FilterCategory: React.FC<FilterCategoryProps> = ({
  title,
  options,
  selectedValues,
  onToggle,
  getColor,
  emptyMessage = 'None available',
}) => {
  if (options.length === 0) {
    return (
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          {title}
        </h4>
        <p className="text-xs text-gray-400 italic">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
        {title}
      </h4>
      <div className="flex flex-wrap gap-1.5">
        {options.map((option) => {
          const isSelected = selectedValues.includes(option);
          const color = getColor(option);
          return (
            <FilterChip
              key={option}
              label={option}
              isSelected={isSelected}
              color={color}
              onClick={() => onToggle(option)}
            />
          );
        })}
      </div>
    </div>
  );
};

// =============================================================================
// Main Component
// =============================================================================

export const AdvancedFilter: React.FC = () => {
  const { filterOptions } = useNodeFilter();
  const { getTagColor } = useTagColors();
  const { getRoleColor } = useRoleColors();

  const filterTags = useFilterTags();
  const filterRoles = useFilterRoles();
  const filterDocuments = useFilterDocuments();
  const filterData = useFilterData();
  const hasActiveFilters = useHasActiveFilters();

  const setFilterTags = useFlowchartStore((state) => state.setFilterTags);
  const setFilterRoles = useFlowchartStore((state) => state.setFilterRoles);
  const setFilterDocuments = useFlowchartStore((state) => state.setFilterDocuments);
  const setFilterData = useFlowchartStore((state) => state.setFilterData);
  const clearAllFilters = useFlowchartStore((state) => state.clearAllFilters);

  // Toggle handlers
  const toggleTag = (tag: string) => {
    if (filterTags.includes(tag)) {
      setFilterTags(filterTags.filter((t) => t !== tag));
    } else {
      setFilterTags([...filterTags, tag]);
    }
  };

  const toggleRole = (role: string) => {
    if (filterRoles.includes(role)) {
      setFilterRoles(filterRoles.filter((r) => r !== role));
    } else {
      setFilterRoles([...filterRoles, role]);
    }
  };

  const toggleDocument = (document: string) => {
    if (filterDocuments.includes(document)) {
      setFilterDocuments(filterDocuments.filter((d) => d !== document));
    } else {
      setFilterDocuments([...filterDocuments, document]);
    }
  };

  const toggleData = (data: string) => {
    if (filterData.includes(data)) {
      setFilterData(filterData.filter((d) => d !== data));
    } else {
      setFilterData([...filterData, data]);
    }
  };

  // Get document color (use a neutral color for documents)
  const getDocumentColor = (_doc: string): TagColor => {
    return {
      bg: 'bg-purple-100',
      text: 'text-purple-800',
      solid: 'bg-purple-500',
      hover: 'hover:bg-purple-200',
      border: 'border-purple-500',
    };
  };

  // Get data color (use a different neutral color for data)
  const getDataColor = (_data: string): TagColor => {
    return {
      bg: 'bg-cyan-100',
      text: 'text-cyan-800',
      solid: 'bg-cyan-500',
      hover: 'hover:bg-cyan-200',
      border: 'border-cyan-500',
    };
  };

  // Count active filters
  const activeFilterCount =
    filterTags.length + filterRoles.length + filterDocuments.length + filterData.length;

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 min-w-[280px] max-w-[320px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <FilterIcon />
          <h3 className="text-sm font-semibold text-gray-800">Filter Nodes</h3>
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-xs text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1"
          >
            Clear all
            <XIcon />
          </button>
        )}
      </div>

      {/* Active Filter Summary */}
      {hasActiveFilters && (
        <div className="mb-4 px-2 py-1.5 bg-primary-50 rounded text-xs text-primary-700">
          {activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active
        </div>
      )}

      {/* Filter Categories */}
      <div className="space-y-1">
        <FilterCategory
          title="Tags"
          options={filterOptions.tags}
          selectedValues={filterTags}
          onToggle={toggleTag}
          getColor={getTagColor}
          emptyMessage="No tags in flowchart"
        />

        <FilterCategory
          title="Roles"
          options={filterOptions.roles}
          selectedValues={filterRoles}
          onToggle={toggleRole}
          getColor={getRoleColor}
          emptyMessage="No roles in flowchart"
        />

        <FilterCategory
          title="Documents"
          options={filterOptions.documents}
          selectedValues={filterDocuments}
          onToggle={toggleDocument}
          getColor={getDocumentColor}
          emptyMessage="No documents in flowchart"
        />

        <FilterCategory
          title="Data"
          options={filterOptions.data}
          selectedValues={filterData}
          onToggle={toggleData}
          getColor={getDataColor}
          emptyMessage="No data elements in flowchart"
        />
      </div>

      {/* Filter Logic Explanation */}
      {hasActiveFilters && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Nodes must match <span className="font-medium">all</span> category filters.
            Within each category, nodes match <span className="font-medium">any</span> selected value.
          </p>
        </div>
      )}
    </div>
  );
};

export default AdvancedFilter;
