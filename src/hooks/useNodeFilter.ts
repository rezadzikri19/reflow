import { useMemo, useCallback } from 'react';
import {
  useNodes,
  useFilterTags,
  useFilterRoles,
  useFilterDocuments,
  useFilterData,
  useFilterSearchText,
  useFilterNodeTypes,
  useFilterFrequencies,
  useFilterUnitTypes,
  useFilterLocked,
  useFilterRequiresFTE,
  useFilterHasPainPoints,
  useFilterHasImprovement,
  useFilterMode,
  useHighlightedNodeIds,
} from '../stores/flowchartStore';
import { useFlowchartFilterConfig } from '../stores/filterStore';
import { evaluateGroup } from './useRuleFilter';
import type { FlowchartNode, ProcessNodeType, FrequencyType, UnitType } from '../types';
import type { NodeDataForFilter as RuleNodeDataForFilter } from './useRuleFilter';

// =============================================================================
// Types
// =============================================================================

/**
 * Available filter options derived from all nodes
 */
export interface FilterOptions {
  tags: string[];
  roles: string[];
  documents: string[];
  data: string[];
  nodeTypes: ProcessNodeType[];
  frequencies: FrequencyType[];
  unitTypes: UnitType[];
}

/**
 * Return type for useNodeFilter hook
 */
export interface UseNodeFilterReturn {
  /** Available filter options derived from all nodes */
  filterOptions: FilterOptions;
  /** Current active filter values */
  activeFilters: {
    tags: string[];
    roles: string[];
    documents: string[];
    data: string[];
    searchText: string;
    nodeTypes: ProcessNodeType[];
    frequencies: FrequencyType[];
    unitTypes: UnitType[];
    locked: boolean | null;
    requiresFTE: boolean | null;
    hasPainPoints: boolean | null;
    hasImprovement: boolean | null;
  };
  /** Check if any filters are active */
  hasActiveFilters: boolean;
  /** Check if a specific node matches the current filter criteria */
  nodeMatchesFilter: (node: FlowchartNode) => boolean;
  /** Get all nodes that match the current filter */
  getFilteredNodes: () => FlowchartNode[];
  /** Check if a specific node ID matches the current filter */
  nodeIdMatchesFilter: (nodeId: string) => boolean;
}

/**
 * Node data interface for filtering
 */
interface NodeDataForFilter {
  label: string;
  description?: string;
  nodeType: ProcessNodeType;
  tags?: string[];
  documents?: string[];
  data?: string[];
  role?: string;
  locked?: boolean;
  painPoints?: string;
  improvement?: string;
  frequency?: FrequencyType;
  unitType?: UnitType;
  requiresFTE?: boolean;
}

/**
 * Hook to check if a specific node should be visually muted based on filter criteria.
 * This is a lightweight hook optimized for use in individual node components.
 *
 * @param nodeId - The ID of the node to check
 * @returns Whether the node should be muted (doesn't match filter criteria)
 *
 * @example
 * function MyNode({ id, data }: NodeProps) {
 *   const isMuted = useIsNodeMuted(id);
 *   return (
 *     <div className={isMuted ? 'opacity-30' : ''}>
 *       {data.label}
 *     </div>
 *   );
 * }
 */
export function useIsNodeMuted(nodeId: string): boolean {
  const filterTags = useFilterTags();
  const filterRoles = useFilterRoles();
  const filterDocuments = useFilterDocuments();
  const filterData = useFilterData();
  const filterSearchText = useFilterSearchText();
  const filterNodeTypes = useFilterNodeTypes();
  const filterFrequencies = useFilterFrequencies();
  const filterUnitTypes = useFilterUnitTypes();
  const filterLocked = useFilterLocked();
  const filterRequiresFTE = useFilterRequiresFTE();
  const filterHasPainPoints = useFilterHasPainPoints();
  const filterHasImprovement = useFilterHasImprovement();
  const nodes = useNodes();

  // Advanced filter state
  const filterMode = useFilterMode();
  const flowchartFilterConfig = useFlowchartFilterConfig();

  // Highlighted nodes state (from ListView selection)
  const highlightedNodeIds = useHighlightedNodeIds();

  return useMemo(() => {
    // Check if node is muted due to highlighting (ListView -> Flowchart filtering)
    if (highlightedNodeIds.length > 0 && !highlightedNodeIds.includes(nodeId)) {
      return true;
    }

    // Find the node
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) {
      return false;
    }

    // Use advanced filter if mode is 'advanced' and config exists
    if (filterMode === 'advanced' && flowchartFilterConfig && flowchartFilterConfig.rootGroup.rules.length > 0) {
      const nodeData = node.data as RuleNodeDataForFilter;
      return !evaluateGroup(nodeData, flowchartFilterConfig.rootGroup);
    }

    // Use simple filter (existing logic)
    const hasActiveFilters =
      filterTags.length > 0 ||
      filterRoles.length > 0 ||
      filterDocuments.length > 0 ||
      filterData.length > 0 ||
      filterSearchText.length > 0 ||
      filterNodeTypes.length > 0 ||
      filterFrequencies.length > 0 ||
      filterUnitTypes.length > 0 ||
      filterLocked !== null ||
      filterRequiresFTE !== null ||
      filterHasPainPoints !== null ||
      filterHasImprovement !== null;

    if (!hasActiveFilters) {
      return false;
    }

    return !nodeMatchesFilterCriteria(node.data as NodeDataForFilter, {
      filterTags,
      filterRoles,
      filterDocuments,
      filterData,
      filterSearchText,
      filterNodeTypes,
      filterFrequencies,
      filterUnitTypes,
      filterLocked,
      filterRequiresFTE,
      filterHasPainPoints,
      filterHasImprovement,
    });
  }, [
    nodeId,
    nodes,
    filterMode,
    flowchartFilterConfig,
    filterTags,
    filterRoles,
    filterDocuments,
    filterData,
    filterSearchText,
    filterNodeTypes,
    filterFrequencies,
    filterUnitTypes,
    filterLocked,
    filterRequiresFTE,
    filterHasPainPoints,
    filterHasImprovement,
    highlightedNodeIds,
  ]);
}

/**
 * Check if a node matches the filter criteria
 */
function nodeMatchesFilterCriteria(
  nodeData: NodeDataForFilter,
  filters: {
    filterTags: string[];
    filterRoles: string[];
    filterDocuments: string[];
    filterData: string[];
    filterSearchText: string;
    filterNodeTypes: ProcessNodeType[];
    filterFrequencies: FrequencyType[];
    filterUnitTypes: UnitType[];
    filterLocked: boolean | null;
    filterRequiresFTE: boolean | null;
    filterHasPainPoints: boolean | null;
    filterHasImprovement: boolean | null;
  }
): boolean {
  const {
    filterTags,
    filterRoles,
    filterDocuments,
    filterData,
    filterSearchText,
    filterNodeTypes,
    filterFrequencies,
    filterUnitTypes,
    filterLocked,
    filterRequiresFTE,
    filterHasPainPoints,
    filterHasImprovement,
  } = filters;

  // Check text search filter
  if (filterSearchText.length > 0) {
    const searchLower = filterSearchText.toLowerCase();
    const labelMatch = nodeData.label.toLowerCase().includes(searchLower);
    const descriptionMatch = nodeData.description?.toLowerCase().includes(searchLower) ?? false;
    const painPointsMatch = nodeData.painPoints?.toLowerCase().includes(searchLower) ?? false;
    const improvementMatch = nodeData.improvement?.toLowerCase().includes(searchLower) ?? false;

    if (!labelMatch && !descriptionMatch && !painPointsMatch && !improvementMatch) {
      return false;
    }
  }

  // Check node type filter
  if (filterNodeTypes.length > 0) {
    if (!filterNodeTypes.includes(nodeData.nodeType)) {
      return false;
    }
  }

  // Check tags filter (OR within category)
  if (filterTags.length > 0) {
    const nodeTags = nodeData.tags || [];
    const hasMatchingTag = filterTags.some((tag) => nodeTags.includes(tag));
    if (!hasMatchingTag) {
      return false;
    }
  }

  // Check roles filter
  if (filterRoles.length > 0) {
    const nodeRole = nodeData.role;
    if (!nodeRole || !filterRoles.includes(nodeRole)) {
      return false;
    }
  }

  // Check documents filter
  if (filterDocuments.length > 0) {
    const nodeDocuments = nodeData.documents || [];
    const hasMatchingDocument = filterDocuments.some((doc) => nodeDocuments.includes(doc));
    if (!hasMatchingDocument) {
      return false;
    }
  }

  // Check data filter
  if (filterData.length > 0) {
    const nodeDataElements = nodeData.data || [];
    const hasMatchingData = filterData.some((d) => nodeDataElements.includes(d));
    if (!hasMatchingData) {
      return false;
    }
  }

  // Check frequency filter
  if (filterFrequencies.length > 0) {
    if (!nodeData.frequency || !filterFrequencies.includes(nodeData.frequency)) {
      return false;
    }
  }

  // Check unit type filter
  if (filterUnitTypes.length > 0) {
    if (!nodeData.unitType || !filterUnitTypes.includes(nodeData.unitType)) {
      return false;
    }
  }

  // Check locked filter
  if (filterLocked !== null) {
    if (filterLocked && !nodeData.locked) {
      return false;
    }
    if (!filterLocked && nodeData.locked) {
      return false;
    }
  }

  // Check requiresFTE filter
  if (filterRequiresFTE !== null) {
    if (filterRequiresFTE && !nodeData.requiresFTE) {
      return false;
    }
    if (!filterRequiresFTE && nodeData.requiresFTE) {
      return false;
    }
  }

  // Check hasPainPoints filter
  if (filterHasPainPoints !== null) {
    const hasPainPoints = !!nodeData.painPoints && nodeData.painPoints.trim().length > 0;
    if (filterHasPainPoints && !hasPainPoints) {
      return false;
    }
    if (!filterHasPainPoints && hasPainPoints) {
      return false;
    }
  }

  // Check hasImprovement filter
  if (filterHasImprovement !== null) {
    const hasImprovement = !!nodeData.improvement && nodeData.improvement.trim().length > 0;
    if (filterHasImprovement && !hasImprovement) {
      return false;
    }
    if (!filterHasImprovement && hasImprovement) {
      return false;
    }
  }

  return true;
}

/**
 * Hook to manage node filtering functionality
 *
 * Filtering Logic:
 * - AND across categories: A node must match ALL active category filters
 * - OR within category: A node can match ANY value within a category
 * - Empty category filter = match all nodes for that category
 *
 * @example
 * // Filter: Tags = ["Critical", "Automation"], Role = "Finance"
 * // A node matches if:
 * // - It has either "Critical" OR "Automation" in its tags (if tags filter is active)
 * // - AND it has "Finance" as its role (if role filter is active)
 */
export function useNodeFilter(): UseNodeFilterReturn {
  const nodes = useNodes();
  const filterTags = useFilterTags();
  const filterRoles = useFilterRoles();
  const filterDocuments = useFilterDocuments();
  const filterData = useFilterData();
  const filterSearchText = useFilterSearchText();
  const filterNodeTypes = useFilterNodeTypes();
  const filterFrequencies = useFilterFrequencies();
  const filterUnitTypes = useFilterUnitTypes();
  const filterLocked = useFilterLocked();
  const filterRequiresFTE = useFilterRequiresFTE();
  const filterHasPainPoints = useFilterHasPainPoints();
  const filterHasImprovement = useFilterHasImprovement();

  // Derive available filter options from all nodes
  const filterOptions = useMemo<FilterOptions>(() => {
    const tags = new Set<string>();
    const roles = new Set<string>();
    const documents = new Set<string>();
    const dataElements = new Set<string>();
    const nodeTypes = new Set<ProcessNodeType>();
    const frequencies = new Set<FrequencyType>();
    const unitTypes = new Set<UnitType>();

    nodes.forEach((node) => {
      const nodeData = node.data as NodeDataForFilter;

      // Collect tags
      if (nodeData.tags) {
        nodeData.tags.forEach((tag) => tags.add(tag));
      }

      // Collect role
      if (nodeData.role) {
        roles.add(nodeData.role);
      }

      // Collect documents
      if (nodeData.documents) {
        nodeData.documents.forEach((doc) => documents.add(doc));
      }

      // Collect data elements
      if (nodeData.data) {
        nodeData.data.forEach((d) => dataElements.add(d));
      }

      // Collect node type
      if (nodeData.nodeType) {
        nodeTypes.add(nodeData.nodeType);
      }

      // Collect frequency
      if (nodeData.frequency) {
        frequencies.add(nodeData.frequency);
      }

      // Collect unit type
      if (nodeData.unitType) {
        unitTypes.add(nodeData.unitType);
      }
    });

    return {
      tags: Array.from(tags).sort(),
      roles: Array.from(roles).sort(),
      documents: Array.from(documents).sort(),
      data: Array.from(dataElements).sort(),
      nodeTypes: Array.from(nodeTypes).sort(),
      frequencies: Array.from(frequencies).sort(),
      unitTypes: Array.from(unitTypes).sort(),
    };
  }, [nodes]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filterTags.length > 0 ||
      filterRoles.length > 0 ||
      filterDocuments.length > 0 ||
      filterData.length > 0 ||
      filterSearchText.length > 0 ||
      filterNodeTypes.length > 0 ||
      filterFrequencies.length > 0 ||
      filterUnitTypes.length > 0 ||
      filterLocked !== null ||
      filterRequiresFTE !== null ||
      filterHasPainPoints !== null ||
      filterHasImprovement !== null
    );
  }, [
    filterTags,
    filterRoles,
    filterDocuments,
    filterData,
    filterSearchText,
    filterNodeTypes,
    filterFrequencies,
    filterUnitTypes,
    filterLocked,
    filterRequiresFTE,
    filterHasPainPoints,
    filterHasImprovement,
  ]);

  // Check if a node matches the filter criteria
  const nodeMatchesFilter = useCallback(
    (node: FlowchartNode): boolean => {
      // If no filters are active, all nodes match
      if (!hasActiveFilters) {
        return true;
      }

      return nodeMatchesFilterCriteria(node.data as NodeDataForFilter, {
        filterTags,
        filterRoles,
        filterDocuments,
        filterData,
        filterSearchText,
        filterNodeTypes,
        filterFrequencies,
        filterUnitTypes,
        filterLocked,
        filterRequiresFTE,
        filterHasPainPoints,
        filterHasImprovement,
      });
    },
    [
      hasActiveFilters,
      filterTags,
      filterRoles,
      filterDocuments,
      filterData,
      filterSearchText,
      filterNodeTypes,
      filterFrequencies,
      filterUnitTypes,
      filterLocked,
      filterRequiresFTE,
      filterHasPainPoints,
      filterHasImprovement,
    ]
  );

  // Get all filtered nodes
  const getFilteredNodes = useCallback((): FlowchartNode[] => {
    if (!hasActiveFilters) {
      return nodes;
    }
    return nodes.filter(nodeMatchesFilter);
  }, [nodes, hasActiveFilters, nodeMatchesFilter]);

  // Check if a node ID matches the filter
  const nodeIdMatchesFilter = useCallback(
    (nodeId: string): boolean => {
      if (!hasActiveFilters) {
        return true;
      }
      const node = nodes.find((n) => n.id === nodeId);
      return node ? nodeMatchesFilter(node) : true;
    },
    [nodes, hasActiveFilters, nodeMatchesFilter]
  );

  return {
    filterOptions,
    activeFilters: {
      tags: filterTags,
      roles: filterRoles,
      documents: filterDocuments,
      data: filterData,
      searchText: filterSearchText,
      nodeTypes: filterNodeTypes,
      frequencies: filterFrequencies,
      unitTypes: filterUnitTypes,
      locked: filterLocked,
      requiresFTE: filterRequiresFTE,
      hasPainPoints: filterHasPainPoints,
      hasImprovement: filterHasImprovement,
    },
    hasActiveFilters,
    nodeMatchesFilter,
    getFilteredNodes,
    nodeIdMatchesFilter,
  };
}

export default useNodeFilter;
