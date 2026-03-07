import React from 'react';
import type { FilterGroup as FilterGroupType, FilterRule as FilterRuleType, LogicalOperator } from '../../types/filter';
import FilterRule from './FilterRule';

interface FilterGroupProps {
  group: FilterGroupType;
  depth?: number;
  onUpdateGroupOperator: (groupId: string, operator: LogicalOperator) => void;
  onAddRule: (groupId: string) => void;
  onAddGroup: (groupId: string) => void;
  onUpdateRule: (ruleId: string, updates: Partial<FilterRuleType>) => void;
  onDeleteRuleOrGroup: (id: string) => void;
}

// Icons
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const FolderPlusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
  </svg>
);

const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

export const FilterGroup: React.FC<FilterGroupProps> = ({
  group,
  depth = 0,
  onUpdateGroupOperator,
  onAddRule,
  onAddGroup,
  onUpdateRule,
  onDeleteRuleOrGroup,
}) => {
  const isRoot = depth === 0;
  const hasRules = group.rules.length > 0;

  // Determine connector line color based on operator
  const connectorColor = group.logicalOperator === 'AND' ? 'border-blue-300' : 'border-green-300';
  const operatorBgColor = group.logicalOperator === 'AND' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700';
  const operatorHoverColor = group.logicalOperator === 'AND' ? 'hover:bg-blue-200' : 'hover:bg-green-200';

  return (
    <div className={`relative ${!isRoot ? 'ml-4 pl-3 border-l-2 ' + connectorColor : ''}`}>
      {/* Group header with operator toggle and actions */}
      <div className="flex items-center gap-2 mb-2">
        {/* Operator toggle button */}
        <button
          onClick={() =>
            onUpdateGroupOperator(
              group.id,
              group.logicalOperator === 'AND' ? 'OR' : 'AND'
            )
          }
          className={`px-2 py-1 text-xs font-semibold rounded transition-colors ${operatorBgColor} ${operatorHoverColor}`}
          title={`Click to switch to ${group.logicalOperator === 'AND' ? 'OR' : 'AND'}`}
        >
          {group.logicalOperator}
        </button>

        {/* Add rule button */}
        <button
          onClick={() => onAddRule(group.id)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
          title="Add rule"
        >
          <PlusIcon />
          <span>Rule</span>
        </button>

        {/* Add group button */}
        <button
          onClick={() => onAddGroup(group.id)}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
          title="Add nested group"
        >
          <FolderPlusIcon />
          <span>Group</span>
        </button>

        {/* Delete group button (not for root) */}
        {!isRoot && (
          <button
            onClick={() => onDeleteRuleOrGroup(group.id)}
            className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
            title="Delete group"
          >
            <TrashIcon />
          </button>
        )}
      </div>

      {/* Rules and sub-groups */}
      <div className="space-y-1">
        {group.rules.map((item) => {
          if ('field' in item) {
            // It's a rule
            return (
              <FilterRule
                key={item.id}
                rule={item}
                onUpdate={(updates) => onUpdateRule(item.id, updates)}
                onDelete={() => onDeleteRuleOrGroup(item.id)}
              />
            );
          } else {
            // It's a sub-group
            return (
              <FilterGroup
                key={item.id}
                group={item}
                depth={depth + 1}
                onUpdateGroupOperator={onUpdateGroupOperator}
                onAddRule={onAddRule}
                onAddGroup={onAddGroup}
                onUpdateRule={onUpdateRule}
                onDeleteRuleOrGroup={onDeleteRuleOrGroup}
              />
            );
          }
        })}

        {/* Empty state */}
        {!hasRules && (
          <div className="text-xs text-gray-400 italic py-2 px-2">
            No rules yet. Click "Rule" to add a filter rule.
          </div>
        )}
      </div>
    </div>
  );
};

export default FilterGroup;
