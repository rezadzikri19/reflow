export type FilterableField =
  | 'label'
  | 'description'
  | 'nodeType'
  | 'tags'
  | 'role'
  | 'documents'
  | 'data'
  | 'systems'
  | 'frequency'
  | 'unitType'
  | 'locked'
  | 'requiresFTE'
  | 'hasPainPoints'
  | 'hasImprovement'
  | 'hasRisk'
  | 'painPoints'
  | 'improvement'
  | 'risk'
  | 'sheet';

export type FilterOperator =
  | 'contains'
  | 'notContains'
  | 'equals'
  | 'notEquals'
  | 'containsAny'
  | 'containsAll'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'is'
  | 'isNot'
  | 'in'
  | 'notIn';

export type LogicalOperator = 'AND' | 'OR';

export interface FilterRule {
  id: string;
  field: FilterableField;
  operator: FilterOperator;
  value: string | string[] | boolean | null;
}

export interface FilterGroup {
  id: string;
  logicalOperator: LogicalOperator;
  rules: (FilterRule | FilterGroup)[];
}

export interface FilterConfiguration {
  rootGroup: FilterGroup;
}

// Field type mappings for UI
export type FieldType = 'text' | 'select' | 'multiselect' | 'boolean';

export const FIELD_TYPES: Record<FilterableField, FieldType> = {
  label: 'text',
  description: 'text',
  nodeType: 'select',
  tags: 'multiselect',
  role: 'select',
  documents: 'multiselect',
  data: 'multiselect',
  systems: 'multiselect',
  frequency: 'select',
  unitType: 'select',
  locked: 'boolean',
  requiresFTE: 'boolean',
  hasPainPoints: 'boolean',
  hasImprovement: 'boolean',
  hasRisk: 'boolean',
  painPoints: 'text',
  improvement: 'text',
  risk: 'text',
  sheet: 'select',
};

// Operators available for each field type
export const OPERATORS_BY_TYPE: Record<FieldType, FilterOperator[]> = {
  text: ['contains', 'notContains', 'equals', 'notEquals', 'isEmpty', 'isNotEmpty'],
  select: ['is', 'isNot', 'isEmpty', 'isNotEmpty'],
  multiselect: ['is', 'isNot', 'containsAny', 'containsAll', 'isEmpty', 'isNotEmpty'],
  boolean: ['is'],
};

// Field labels for display
export const FIELD_LABELS: Record<FilterableField, string> = {
  label: 'Label',
  description: 'Description',
  nodeType: 'Node Type',
  tags: 'Tags',
  role: 'Role',
  documents: 'Documents',
  data: 'Data',
  systems: 'Systems',
  frequency: 'Frequency',
  unitType: 'Unit Type',
  locked: 'Locked',
  requiresFTE: 'Requires FTE',
  hasPainPoints: 'Has Pain Points',
  hasImprovement: 'Has Improvement',
  hasRisk: 'Has Risk',
  painPoints: 'Pain Points',
  improvement: 'Improvement',
  risk: 'Risk',
  sheet: 'Sheet',
};

// Operator labels for display
export const OPERATOR_LABELS: Record<FilterOperator, string> = {
  contains: 'Contains',
  notContains: 'Does not contain',
  equals: 'Equals',
  notEquals: 'Does not equal',
  containsAny: 'Contains any of',
  containsAll: 'Contains all of',
  isEmpty: 'Is empty',
  isNotEmpty: 'Is not empty',
  is: 'Is',
  isNot: 'Is not',
  in: 'In',
  notIn: 'Not in',
};

// Helper to create a new filter rule
export const createFilterRule = (field: FilterableField = 'label'): FilterRule => ({
  id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  field,
  operator: OPERATORS_BY_TYPE[FIELD_TYPES[field]][0],
  value: null,
});

// Helper to create a new filter group
export const createFilterGroup = (logicalOperator: LogicalOperator = 'AND'): FilterGroup => ({
  id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  logicalOperator,
  rules: [],
});
