import { useMemo, useCallback } from 'react';
import { useNodes, useFilterTags, useFilterRoles, useFilterDocuments, useFilterData } from '../stores/flowchartStore';
import type { FlowchartNode } from '../types';

/**
 * Available filter options derived from all nodes
 */
export interface FilterOptions {
  tags: string[];
  roles: string[];
  documents: string[];
  data: string[];
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
  const nodes = useNodes();

  return useMemo(() => {
    // If no filters are active, nothing is muted
    const hasActiveFilters =
      filterTags.length > 0 ||
      filterRoles.length > 0 ||
      filterDocuments.length > 0 ||
      filterData.length > 0;

    if (!hasActiveFilters) {
      return false;
    }

    // Find the node
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) {
      return false;
    }

    const nodeData = node.data as {
      tags?: string[];
      role?: string;
      documents?: string[];
      data?: string[];
    };

    // Check tags filter (OR within category)
    if (filterTags.length > 0) {
      const nodeTags = nodeData.tags || [];
      const hasMatchingTag = filterTags.some((tag) => nodeTags.includes(tag));
      if (!hasMatchingTag) {
        return true; // Muted - doesn't match tag filter
      }
    }

    // Check roles filter
    if (filterRoles.length > 0) {
      const nodeRole = nodeData.role;
      if (!nodeRole || !filterRoles.includes(nodeRole)) {
        return true; // Muted - doesn't match role filter
      }
    }

    // Check documents filter
    if (filterDocuments.length > 0) {
      const nodeDocuments = nodeData.documents || [];
      const hasMatchingDocument = filterDocuments.some((doc) =>
        nodeDocuments.includes(doc)
      );
      if (!hasMatchingDocument) {
        return true; // Muted - doesn't match document filter
      }
    }

    // Check data filter
    if (filterData.length > 0) {
      const nodeDataElements = nodeData.data || [];
      const hasMatchingData = filterData.some((d) =>
        nodeDataElements.includes(d)
      );
      if (!hasMatchingData) {
        return true; // Muted - doesn't match data filter
      }
    }

    return false; // Not muted - matches all active filters
  }, [nodeId, nodes, filterTags, filterRoles, filterDocuments, filterData]);
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

  // Derive available filter options from all nodes
  const filterOptions = useMemo<FilterOptions>(() => {
    const tags = new Set<string>();
    const roles = new Set<string>();
    const documents = new Set<string>();
    const dataElements = new Set<string>();

    nodes.forEach((node) => {
      const nodeData = node.data as {
        tags?: string[];
        role?: string;
        documents?: string[];
        data?: string[];
      };

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
    });

    return {
      tags: Array.from(tags).sort(),
      roles: Array.from(roles).sort(),
      documents: Array.from(documents).sort(),
      data: Array.from(dataElements).sort(),
    };
  }, [nodes]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      filterTags.length > 0 ||
      filterRoles.length > 0 ||
      filterDocuments.length > 0 ||
      filterData.length > 0
    );
  }, [filterTags, filterRoles, filterDocuments, filterData]);

  // Check if a node matches the filter criteria
  const nodeMatchesFilter = useCallback(
    (node: FlowchartNode): boolean => {
      // If no filters are active, all nodes match
      if (!hasActiveFilters) {
        return true;
      }

      const nodeData = node.data as {
        tags?: string[];
        role?: string;
        documents?: string[];
        data?: string[];
      };

      // Check tags filter (OR within category)
      if (filterTags.length > 0) {
        const nodeTags = nodeData.tags || [];
        const hasMatchingTag = filterTags.some((tag) => nodeTags.includes(tag));
        if (!hasMatchingTag) {
          return false;
        }
      }

      // Check roles filter (OR within category - role is single value, so check if it's in the list)
      if (filterRoles.length > 0) {
        const nodeRole = nodeData.role;
        if (!nodeRole || !filterRoles.includes(nodeRole)) {
          return false;
        }
      }

      // Check documents filter (OR within category)
      if (filterDocuments.length > 0) {
        const nodeDocuments = nodeData.documents || [];
        const hasMatchingDocument = filterDocuments.some((doc) =>
          nodeDocuments.includes(doc)
        );
        if (!hasMatchingDocument) {
          return false;
        }
      }

      // Check data filter (OR within category)
      if (filterData.length > 0) {
        const nodeDataElements = nodeData.data || [];
        const hasMatchingData = filterData.some((d) =>
          nodeDataElements.includes(d)
        );
        if (!hasMatchingData) {
          return false;
        }
      }

      return true;
    },
    [hasActiveFilters, filterTags, filterRoles, filterDocuments, filterData]
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
    },
    hasActiveFilters,
    nodeMatchesFilter,
    getFilteredNodes,
    nodeIdMatchesFilter,
  };
}

export default useNodeFilter;
