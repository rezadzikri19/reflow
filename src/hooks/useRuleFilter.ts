import { useMemo } from 'react';
import type { FlowchartNode } from '../types';
import type { FilterConfiguration, FilterRule, FilterGroup } from '../types/filter';

/**
 * Node data interface for filtering
 */
export interface NodeDataForFilter {
  label: string;
  description?: string;
  nodeType: string;
  tags?: string[];
  documents?: string[];
  data?: string[];
  role?: string;
  locked?: boolean;
  painPoints?: string;
  improvement?: string;
  frequency?: string;
  unitType?: string;
  requiresFTE?: boolean;
  sheet?: string;
}

/**
 * Get field value from node data
 */
const getFieldValue = (nodeData: NodeDataForFilter, field: string): unknown => {
  switch (field) {
    case 'label':
      return nodeData.label || '';
    case 'description':
      return nodeData.description || '';
    case 'nodeType':
      return nodeData.nodeType || '';
    case 'tags':
      return nodeData.tags || [];
    case 'role':
      return nodeData.role || '';
    case 'documents':
      return nodeData.documents || [];
    case 'data':
      return nodeData.data || [];
    case 'frequency':
      return nodeData.frequency || '';
    case 'unitType':
      return nodeData.unitType || '';
    case 'locked':
      return nodeData.locked ?? false;
    case 'requiresFTE':
      return nodeData.requiresFTE ?? false;
    case 'hasPainPoints':
      return !!nodeData.painPoints && nodeData.painPoints.trim().length > 0;
    case 'hasImprovement':
      return !!nodeData.improvement && nodeData.improvement.trim().length > 0;
    case 'painPoints':
      return nodeData.painPoints || '';
    case 'improvement':
      return nodeData.improvement || '';
    case 'sheet':
      return nodeData.sheet || '';
    default:
      return null;
  }
};

/**
 * Helper functions for value comparison
 */
const isEmptyValue = (value: unknown): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'boolean') return false;
  return false;
};

const containsValue = (nodeValue: unknown, searchValue: string): boolean => {
  if (typeof nodeValue === 'string' && typeof searchValue === 'string') {
    return nodeValue.toLowerCase().includes(searchValue.toLowerCase());
  }
  if (Array.isArray(nodeValue)) {
    return nodeValue.some((item) =>
      String(item).toLowerCase().includes(searchValue.toLowerCase())
    );
  }
  return false;
};

const equalsValue = (nodeValue: unknown, searchValue: string | boolean): boolean => {
  if (typeof searchValue === 'boolean') {
    return nodeValue === searchValue;
  }
  if (typeof nodeValue === 'string' && typeof searchValue === 'string') {
    return nodeValue.toLowerCase() === searchValue.toLowerCase();
  }
  return nodeValue === searchValue;
};

const containsAnyValue = (nodeValue: unknown, searchValues: string[]): boolean => {
  if (!Array.isArray(nodeValue) || !Array.isArray(searchValues)) return false;
  return searchValues.some((search) =>
    nodeValue.some((item) => String(item).toLowerCase() === search.toLowerCase())
  );
};

const containsAllValue = (nodeValue: unknown, searchValues: string[]): boolean => {
  if (!Array.isArray(nodeValue) || !Array.isArray(searchValues)) return false;
  return searchValues.every((search) =>
    nodeValue.some((item) => String(item).toLowerCase() === search.toLowerCase())
  );
};

const inValue = (nodeValue: unknown, searchValues: string[]): boolean => {
  if (!Array.isArray(searchValues)) return false;
  if (typeof nodeValue === 'string') {
    return searchValues.some((v) => v.toLowerCase() === nodeValue.toLowerCase());
  }
  return searchValues.includes(nodeValue as string);
};

/**
 * Evaluate a single filter rule against node data
 */
const evaluateRule = (nodeData: NodeDataForFilter, rule: FilterRule): boolean => {
  const { field, operator, value } = rule;

  const nodeValue = getFieldValue(nodeData, field);

  // Handle empty/not empty operators first
  if (operator === 'isEmpty') {
    return isEmptyValue(nodeValue);
  }
  if (operator === 'isNotEmpty') {
    return !isEmptyValue(nodeValue);
  }

  // Handle based on operator
  switch (operator) {
    case 'contains':
      return containsValue(nodeValue, value as string);
    case 'notContains':
      return !containsValue(nodeValue, value as string);
    case 'equals':
      return equalsValue(nodeValue, value as string);
    case 'notEquals':
      return !equalsValue(nodeValue, value as string);
    case 'is':
      // Support multi-select: if value is array, check if nodeValue matches
      if (Array.isArray(value)) {
        // For array fields (tags, documents, data): check if node's array contains ANY of the selected values
        if (Array.isArray(nodeValue)) {
          return containsAnyValue(nodeValue, value);
        }
        // For single-value fields (role, nodeType, etc.): check if node's value is in the selected array
        return inValue(nodeValue, value);
      }
      return equalsValue(nodeValue, value as string | boolean);
    case 'isNot':
      // Support multi-select: if value is array, check if nodeValue does NOT match
      if (Array.isArray(value)) {
        // For array fields (tags, documents, data): check if node's array contains NONE of the selected values
        if (Array.isArray(nodeValue)) {
          return !containsAnyValue(nodeValue, value);
        }
        // For single-value fields (role, nodeType, etc.): check if node's value is NOT in the selected array
        return !inValue(nodeValue, value);
      }
      return !equalsValue(nodeValue, value as string | boolean);
    case 'containsAny':
      return containsAnyValue(nodeValue, value as string[]);
    case 'containsAll':
      return containsAllValue(nodeValue, value as string[]);
    case 'in':
      return inValue(nodeValue, value as string[]);
    case 'notIn':
      return !inValue(nodeValue, value as string[]);
    default:
      return true;
  }
};

/**
 * Evaluate a filter group recursively
 */
const evaluateGroup = (nodeData: NodeDataForFilter, group: FilterGroup): boolean => {
  const { logicalOperator, rules } = group;

  if (rules.length === 0) return true;

  const results = rules.map((rule) => {
    if ('field' in rule) {
      return evaluateRule(nodeData, rule);
    } else {
      return evaluateGroup(nodeData, rule);
    }
  });

  if (logicalOperator === 'AND') {
    return results.every(Boolean);
  } else {
    return results.some(Boolean);
  }
};

/**
 * Main hook for filtering nodes with rule-based logic
 *
 * @param nodes - Array of FlowchartNode to filter
 * @param config - Filter configuration with root group
 * @returns Filtered array of FlowchartNode
 */
export function useRuleFilter(
  nodes: FlowchartNode[],
  config: FilterConfiguration | null
): FlowchartNode[] {
  return useMemo(() => {
    if (!config || !nodes.length) {
      return nodes;
    }

    // Check if there are any rules
    if (config.rootGroup.rules.length === 0) {
      return nodes;
    }

    return nodes.filter((node) => {
      const nodeData = {
        ...(node.data as NodeDataForFilter),
        sheet: (node as any).sheetName || '',
      } as NodeDataForFilter;
      return evaluateGroup(nodeData, config.rootGroup);
    });
  }, [nodes, config]);
}

/**
 * Count rules in a filter configuration
 */
export function countFilterRules(config: FilterConfiguration | null): number {
  if (!config) return 0;

  const countInGroup = (group: FilterGroup): number => {
    let count = 0;
    for (const rule of group.rules) {
      if ('field' in rule) {
        count += 1;
      } else {
        count += countInGroup(rule);
      }
    }
    return count;
  };

  return countInGroup(config.rootGroup);
}

/**
 * Export evaluation functions for testing
 */
export { evaluateRule, evaluateGroup };
