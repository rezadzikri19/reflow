import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  FilterConfiguration,
  FilterGroup,
  FilterRule,
  LogicalOperator,
} from '../types/filter';
import { createFilterRule, createFilterGroup, OPERATORS_BY_TYPE, FIELD_TYPES } from '../types/filter';

interface FilterState {
  listFilterConfig: FilterConfiguration | null;

  // Actions
  setListFilterConfig: (config: FilterConfiguration | null) => void;
  clearListFilter: () => void;
  initializeFilter: () => void;
  addRuleToGroup: (groupId: string, rule?: FilterRule) => void;
  addGroupToGroup: (groupId: string, logicalOperator?: LogicalOperator) => void;
  removeRuleOrGroup: (id: string) => void;
  updateRule: (ruleId: string, updates: Partial<FilterRule>) => void;
  updateGroupOperator: (groupId: string, operator: LogicalOperator) => void;
  countRules: () => number;
  isFilterActive: () => boolean;
}

// Helper function to find and modify group recursively
const findGroup = (group: FilterGroup, groupId: string): FilterGroup | null => {
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
const removeById = (group: FilterGroup, id: string): boolean => {
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
const updateRuleById = (group: FilterGroup, ruleId: string, updates: Partial<FilterRule>): boolean => {
  for (const item of group.rules) {
    if ('field' in item && item.id === ruleId) {
      Object.assign(item, updates);
      // Reset value if field type changed
      if (updates.field) {
        const newFieldType = FIELD_TYPES[updates.field];
        const currentOperator = item.operator;
        const validOperators = OPERATORS_BY_TYPE[newFieldType];
        if (!validOperators.includes(currentOperator)) {
          item.operator = validOperators[0];
          item.value = null;
        }
      }
      return true;
    }
    if ('logicalOperator' in item) {
      if (updateRuleById(item, ruleId, updates)) return true;
    }
  }
  return false;
};

// Helper function to count rules recursively
const countRulesInGroup = (group: FilterGroup): number => {
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

export const useFilterStore = create<FilterState>()(
  immer((set, get) => ({
    listFilterConfig: null,

    setListFilterConfig: (config) => {
      set((state) => {
        state.listFilterConfig = config;
      });
    },

    clearListFilter: () => {
      set((state) => {
        state.listFilterConfig = null;
      });
    },

    initializeFilter: () => {
      set((state) => {
        if (!state.listFilterConfig) {
          state.listFilterConfig = {
            rootGroup: createFilterGroup('AND'),
          };
        }
      });
    },

    addRuleToGroup: (groupId, rule) => {
      set((state) => {
        if (!state.listFilterConfig) {
          state.listFilterConfig = {
            rootGroup: createFilterGroup('AND'),
          };
        }
        const group = findGroup(state.listFilterConfig!.rootGroup, groupId);
        if (group) {
          const newRule = rule || createFilterRule();
          group.rules.push(newRule);
        }
      });
    },

    addGroupToGroup: (groupId, logicalOperator = 'AND') => {
      set((state) => {
        if (!state.listFilterConfig) {
          state.listFilterConfig = {
            rootGroup: createFilterGroup('AND'),
          };
        }
        const group = findGroup(state.listFilterConfig!.rootGroup, groupId);
        if (group) {
          const newGroup = createFilterGroup(logicalOperator);
          group.rules.push(newGroup);
        }
      });
    },

    removeRuleOrGroup: (id) => {
      set((state) => {
        if (!state.listFilterConfig) return;
        removeById(state.listFilterConfig.rootGroup, id);
      });
    },

    updateRule: (ruleId, updates) => {
      set((state) => {
        if (!state.listFilterConfig) return;
        updateRuleById(state.listFilterConfig.rootGroup, ruleId, updates);
      });
    },

    updateGroupOperator: (groupId, operator) => {
      set((state) => {
        if (!state.listFilterConfig) return;
        const group = findGroup(state.listFilterConfig.rootGroup, groupId);
        if (group) {
          group.logicalOperator = operator;
        }
      });
    },

    countRules: () => {
      const state = get();
      if (!state.listFilterConfig) return 0;
      return countRulesInGroup(state.listFilterConfig.rootGroup);
    },

    isFilterActive: () => {
      const state = get();
      return state.listFilterConfig !== null && countRulesInGroup(state.listFilterConfig.rootGroup) > 0;
    },
  }))
);

// Selector hooks for better performance
export const useListFilterConfig = () => useFilterStore((state) => state.listFilterConfig);
export const useFilterActions = () =>
  useFilterStore((state) => ({
    setListFilterConfig: state.setListFilterConfig,
    clearListFilter: state.clearListFilter,
    initializeFilter: state.initializeFilter,
    addRuleToGroup: state.addRuleToGroup,
    addGroupToGroup: state.addGroupToGroup,
    removeRuleOrGroup: state.removeRuleOrGroup,
    updateRule: state.updateRule,
    updateGroupOperator: state.updateGroupOperator,
  }));
