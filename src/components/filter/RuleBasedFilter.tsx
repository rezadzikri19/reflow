import React from 'react';
import { useFilterStore } from '../../stores/filterStore';
import type { FilterConfiguration, FilterGroup as FilterGroupType, FilterRule, LogicalOperator } from '../../types/filter';
import { createFilterGroup, createFilterRule } from '../../types/filter';
import FilterGroupComponent from './FilterGroup';

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

// Helper function to count rules recursively
const countRulesInGroup = (group: FilterGroupType): number => {
  let count = 0;
  for (const item of group.rules) {
    if ('field' in item) {
      count += 1;
    } else {
      count += countRulesInGroup(item);
    }
  }
  return count;
};

// Helper function to find and modify group recursively
const findGroup = (group: FilterGroupType, groupId: string): FilterGroupType | null => {
  if (group.id === groupId) return group;
  for (const item of group.rules) {
    if ('logicalOperator' in item) {
      const found = findGroup(item, groupId);
      if (found) return found;
    }
  }
  return null;
};

// Helper function to remove rule/group recursively
const removeById = (group: FilterGroupType, id: string): boolean => {
  const index = group.rules.findIndex((item) => item.id === id);
  if (index !== -1) {
    group.rules.splice(index, 1);
    return true;
  }
  for (const item of group.rules) {
    if ('logicalOperator' in item) {
      if (removeById(item, id)) return true;
    }
  }
  return false;
};

// Helper function to update rule recursively
const updateRuleById = (group: FilterGroupType, ruleId: string, updates: Partial<FilterRule>): boolean => {
  for (const item of group.rules) {
    if ('field' in item && item.id === ruleId) {
      Object.assign(item, updates);
      return true;
    }
    if ('logicalOperator' in item) {
      if (updateRuleById(item, ruleId, updates)) return true;
    }
  }
  return false;
};

interface RuleBasedFilterProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  /** External config (for flowchart view) - if provided, uses this instead of store */
  config?: FilterConfiguration | null;
  /** Callback when config changes (for flowchart view) */
  onConfigChange?: (config: FilterConfiguration | null) => void;
  /** Callback to clear filter (for flowchart view) */
  onClear?: () => void;
}

export const RuleBasedFilter: React.FC<RuleBasedFilterProps> = ({
  isCollapsed = false,
  onToggleCollapse,
  config: externalConfig,
  onConfigChange,
  onClear,
}) => {
  // Get store values for list view (used when externalConfig is not provided)
  const storeActions = useFilterStore();
  const listFilterConfig = storeActions.listFilterConfig;

  // Determine if we're using external config (flowchart) or store (list view)
  const useExternalConfig = externalConfig !== undefined || onConfigChange !== undefined;
  const config = useExternalConfig ? externalConfig : listFilterConfig;

  // Helper to update config
  const updateConfig = React.useCallback((newConfig: FilterConfiguration | null) => {
    if (useExternalConfig && onConfigChange) {
      onConfigChange(newConfig);
    } else {
      storeActions.setListFilterConfig(newConfig);
    }
  }, [useExternalConfig, onConfigChange, storeActions]);

  // Initialize filter on first render if needed
  React.useEffect(() => {
    if (!config) {
      updateConfig({
        rootGroup: createFilterGroup('AND'),
      });
    }
  }, [config, updateConfig]);

  // Actions that work with either external or store config
  const handleAddRuleToGroup = React.useCallback((groupId: string, rule?: FilterRule) => {
    if (!config) return;
    const newConfig = { ...config, rootGroup: JSON.parse(JSON.stringify(config.rootGroup)) };
    const group = findGroup(newConfig.rootGroup, groupId);
    if (group) {
      group.rules.push(rule || createFilterRule());
    }
    updateConfig(newConfig);
  }, [config, updateConfig]);

  const handleAddGroupToGroup = React.useCallback((groupId: string, logicalOperator: LogicalOperator = 'AND') => {
    if (!config) return;
    const newConfig = { ...config, rootGroup: JSON.parse(JSON.stringify(config.rootGroup)) };
    const group = findGroup(newConfig.rootGroup, groupId);
    if (group) {
      group.rules.push(createFilterGroup(logicalOperator));
    }
    updateConfig(newConfig);
  }, [config, updateConfig]);

  const handleRemoveRuleOrGroup = React.useCallback((id: string) => {
    if (!config) return;
    const newConfig = { ...config, rootGroup: JSON.parse(JSON.stringify(config.rootGroup)) };
    removeById(newConfig.rootGroup, id);
    updateConfig(newConfig);
  }, [config, updateConfig]);

  const handleUpdateRule = React.useCallback((ruleId: string, updates: Partial<FilterRule>) => {
    if (!config) return;
    const newConfig = { ...config, rootGroup: JSON.parse(JSON.stringify(config.rootGroup)) };
    updateRuleById(newConfig.rootGroup, ruleId, updates);
    updateConfig(newConfig);
  }, [config, updateConfig]);

  const handleUpdateGroupOperator = React.useCallback((groupId: string, operator: LogicalOperator) => {
    if (!config) return;
    const newConfig = { ...config, rootGroup: JSON.parse(JSON.stringify(config.rootGroup)) };
    const group = findGroup(newConfig.rootGroup, groupId);
    if (group) {
      group.logicalOperator = operator;
    }
    updateConfig(newConfig);
  }, [config, updateConfig]);

  const handleClear = React.useCallback(() => {
    if (useExternalConfig && onClear) {
      onClear();
    } else {
      storeActions.clearListFilter();
    }
  }, [useExternalConfig, onClear, storeActions]);

  const ruleCount = config ? countRulesInGroup(config.rootGroup) : 0;
  const hasActiveFilter = config !== null && ruleCount > 0;

  if (!config) {
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
            onClick={handleClear}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            <XIcon />
            <span>Clear all</span>
          </button>
        )}
      </div>

      {/* Filter content */}
      <div className="p-3 max-h-[400px] overflow-y-auto">
        <FilterGroupComponent
          group={config.rootGroup}
          onUpdateGroupOperator={handleUpdateGroupOperator}
          onAddRule={handleAddRuleToGroup}
          onAddGroup={handleAddGroupToGroup}
          onUpdateRule={handleUpdateRule}
          onDeleteRuleOrGroup={handleRemoveRuleOrGroup}
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
