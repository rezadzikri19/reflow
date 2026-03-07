import React from 'react';
import { useFilterStore } from '../../stores/filterStore';
import FilterGroup from './FilterGroup';

// Icons
const FilterIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

const XIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

interface RuleBasedFilterProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const RuleBasedFilter: React.FC<RuleBasedFilterProps> = ({
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const {
    listFilterConfig,
    initializeFilter,
    addRuleToGroup,
    addGroupToGroup,
    updateRule,
    updateGroupOperator,
    removeRuleOrGroup,
    clearListFilter,
    countRules,
    isFilterActive,
  } = useFilterStore();

  const ruleCount = countRules();
  const hasActiveFilter = isFilterActive();

  // Initialize filter on first render if needed
  React.useEffect(() => {
    if (!listFilterConfig) {
      initializeFilter();
    }
  }, [listFilterConfig, initializeFilter]);

  if (!listFilterConfig) {
    return null;
  }

  if (isCollapsed) {
    return (
      <div className="bg-white rounded-lg shadow border border-gray-200 p-3">
        <button
          onClick={onToggleCollapse}
          className="flex items-center justify-between w-full"
        >
          <div className="flex items-center gap-2">
            <FilterIcon />
            <span className="text-sm font-medium text-gray-700">Advanced Filter</span>
            {hasActiveFilter && (
              <span className="px-2 py-0.5 text-xs bg-primary-100 text-primary-700 rounded-full">
                {ruleCount} rule{ruleCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <ChevronRightIcon />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-2 hover:text-primary-600 transition-colors"
        >
          <FilterIcon />
          <span className="text-sm font-medium text-gray-700">Advanced Filter</span>
          {hasActiveFilter && (
            <span className="px-2 py-0.5 text-xs bg-primary-100 text-primary-700 rounded-full">
              {ruleCount} rule{ruleCount !== 1 ? 's' : ''}
            </span>
          )}
          <ChevronDownIcon />
        </button>

        {hasActiveFilter && (
          <button
            onClick={clearListFilter}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            <XIcon />
            <span>Clear all</span>
          </button>
        )}
      </div>

      {/* Filter content */}
      <div className="p-3 max-h-[400px] overflow-y-auto">
        <FilterGroup
          group={listFilterConfig.rootGroup}
          onUpdateGroupOperator={updateGroupOperator}
          onAddRule={addRuleToGroup}
          onAddGroup={addGroupToGroup}
          onUpdateRule={updateRule}
          onDeleteRuleOrGroup={removeRuleOrGroup}
        />
      </div>

      {/* Footer with help text */}
      {hasActiveFilter && (
        <div className="px-3 py-2 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            <span className="font-medium text-blue-600">AND</span> groups require all rules to match.
            <span className="font-medium text-green-600"> OR</span> groups match any rule.
          </p>
        </div>
      )}
    </div>
  );
};

export default RuleBasedFilter;
