import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  useNodes,
  useEdges,
  useFlowchartStore,
  useFilterMode,
  useHasActiveFilters,
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
} from '../../stores/flowchartStore';
import { useNodeConnections } from '../../hooks/useNodeConnections';
import { useRuleFilter } from '../../hooks/useRuleFilter';
import { useFilterStore, useListFilterConfig } from '../../stores/filterStore';
import { NodeTable, type SortState } from './NodeTable';
import { RuleBasedFilter } from '../filter';
import { AdvancedFilter } from '../flowchart/AdvancedFilter';
import type { ProcessNodeType, FrequencyType, UnitType } from '../../types';
import {
  buildNodeTree,
  flattenTreeWithDepth,
  sortTreeNodes,
  filterTreeWithAncestors,
  getParentChain,
} from '../../utils/nodeHierarchy';

// ============================================================================
// Icons
// ============================================================================

const FilterIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

// ============================================================================
// List View Component
// ============================================================================

export const ListView: React.FC = () => {
  const nodes = useNodes();
  const edges = useEdges();
  const connections = useNodeConnections(nodes, edges);
  const setSelectedNode = useFlowchartStore((state) => state.setSelectedNode);

  // Global filter mode state
  const filterMode = useFilterMode();
  const setFilterMode = useFlowchartStore((state) => state.setFilterMode);

  // Filter state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  // Local state for sorting
  const [sort, setSort] = useState<SortState>({
    column: 'label',
    direction: 'asc',
  });

  // Expand/collapse state for tree view
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Node type filter (legacy - kept for compatibility, but we use 'all' since we filter with rules)
  const nodeTypeFilter: ProcessNodeType | 'all' = 'all';

  // Toggle expand/collapse for a subprocess
  const toggleExpand = useCallback((nodeId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Get filter state from stores
  const isAdvancedFilterActive = useFilterStore((state) => state.isFilterActive);
  const countRules = useFilterStore((state) => state.countRules);
  const listFilterConfig = useListFilterConfig();

  // Check if simple filters are active
  const hasSimpleFilters = useHasActiveFilters();

  // Subscribe to all simple filter values for proper reactivity
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

  // Apply rule-based filter for advanced mode
  const advancedFilteredNodes = useRuleFilter(nodes, listFilterConfig);

  // Apply simple filter logic (same as useIsNodeMuted but inverted for filtering)
  const simpleFilteredNodes = useMemo(() => {
    // If no simple filters are active, return all nodes
    if (!hasSimpleFilters) {
      return nodes;
    }

    return nodes.filter((node) => {
      const nodeData = node.data as {
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
      };

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
    });
  }, [
    nodes,
    hasSimpleFilters,
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

  // Select filtered nodes based on mode
  const filteredNodes = filterMode === 'advanced' ? advancedFilteredNodes : simpleFilteredNodes;

  // Check if filter is active based on mode (must be declared before visibleNodeIds)
  const filterActive = filterMode === 'advanced' ? isAdvancedFilterActive() : hasSimpleFilters;
  const ruleCount = filterMode === 'advanced' ? countRules() : 0;

  // Build tree structure from all nodes
  const nodeTree = useMemo(() => {
    return buildNodeTree(nodes);
  }, [nodes]);

  // When filtering, include ancestor chain for matching nodes
  const visibleNodeIds = useMemo(() => {
    if (!filterActive) return null;

    const matchingIds = new Set(filteredNodes.map((n) => n.id));
    return filterTreeWithAncestors(nodes, matchingIds);
  }, [filterActive, filteredNodes, nodes]);

  // Sort tree respecting hierarchy
  const sortedTree = useMemo(() => {
    return sortTreeNodes(nodeTree, sort.column, sort.direction);
  }, [nodeTree, sort.column, sort.direction]);

  // Auto-expand ancestors when filtering
  const effectiveExpandedIds = useMemo(() => {
    if (!visibleNodeIds) return expandedIds;

    // When filtering, auto-expand all ancestors of matching nodes
    const autoExpanded = new Set(expandedIds);
    filteredNodes.forEach((node) => {
      const ancestors = getParentChain(node.id, nodes);
      ancestors.forEach((ancestor) => autoExpanded.add(ancestor.id));
    });
    return autoExpanded;
  }, [expandedIds, visibleNodeIds, filteredNodes, nodes]);

  // Flatten tree with depth info for display
  const flattenedNodes = useMemo(() => {
    return flattenTreeWithDepth(sortedTree, effectiveExpandedIds);
  }, [sortedTree, effectiveExpandedIds]);

  // Filter flattened nodes if we have a visibility filter
  const displayNodes = useMemo(() => {
    if (!visibleNodeIds) return flattenedNodes;
    return flattenedNodes.filter((item) => visibleNodeIds.has(item.node.id));
  }, [flattenedNodes, visibleNodeIds]);

  // Create depth map for NodeTable
  const nodeDepths = useMemo(() => {
    const depths = new Map<string, number>();
    displayNodes.forEach(({ node, depth }) => {
      depths.set(node.id, depth);
    });
    return depths;
  }, [displayNodes]);

  // Get nodes array for display
  const nodesForTable = useMemo(() => {
    return displayNodes.map((item) => item.node);
  }, [displayNodes]);

  // Handle row click - navigate to flowchart and select node
  const handleRowClick = useCallback(
    (nodeId: string) => {
      // Set the selected node and navigate to flowchart
      setSelectedNode(nodeId);
      // Store the view to navigate to in sessionStorage for App.tsx to pick up
      sessionStorage.setItem('navigateToView', 'flowchart');
      // Trigger a storage event for same-tab navigation
      window.dispatchEvent(new StorageEvent('storage', { key: 'navigateToView', newValue: 'flowchart' }));
      // Also set a flag that App.tsx can check
      window.dispatchEvent(new CustomEvent('navigateToFlowchart', { detail: { nodeId } }));
    },
    [setSelectedNode]
  );

  // Toggle filter panel
  const toggleFilterOpen = useCallback(() => {
    setIsFilterOpen(!isFilterOpen);
  }, [isFilterOpen]);

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Node List</h2>
          <p className="text-sm text-gray-500 mt-1">
            {filterActive ? (
              <>
                Showing {filteredNodes.length} of {nodes.length} nodes
                {filterMode === 'advanced' && ruleCount > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded text-xs">
                    {ruleCount} rule{ruleCount !== 1 ? 's' : ''}
                  </span>
                )}
                {filterMode === 'simple' && (
                  <span className="ml-2 px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded text-xs">
                    filtered
                  </span>
                )}
              </>
            ) : (
              <>
                {nodes.length} node{nodes.length !== 1 ? 's' : ''} in flowchart
              </>
            )}
          </p>
        </div>

        {/* Filter toggle button with popup */}
        <div className="relative">
          <button
            ref={filterButtonRef}
            onClick={toggleFilterOpen}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              filterActive
                ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
                : isFilterOpen
                  ? 'bg-gray-200 text-gray-800'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FilterIcon />
            <span>Filter</span>
            {filterActive && filterMode === 'advanced' && ruleCount > 0 && (
              <span className="flex items-center justify-center w-5 h-5 bg-primary-500 text-white rounded-full text-xs">
                {ruleCount}
              </span>
            )}
            {filterActive && filterMode === 'simple' && (
              <span className="flex items-center justify-center w-5 h-5 bg-primary-500 text-white rounded-full text-xs">
                *
              </span>
            )}
          </button>

          {/* Filter Popup Dropdown */}
          {isFilterOpen && (
            <>
              {/* Click-outside overlay */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setIsFilterOpen(false)}
              />
              {/* Filter dropdown panel */}
              <div
                ref={filterPanelRef}
                className="absolute right-0 mt-2 z-30"
              >
                {/* Filter Mode Toggle */}
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 mb-0 p-1 flex gap-1">
                  <button
                    onClick={() => setFilterMode('simple')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      filterMode === 'simple'
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Simple
                  </button>
                  <button
                    onClick={() => setFilterMode('advanced')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      filterMode === 'advanced'
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Advanced
                  </button>
                </div>

                {/* Filter Content */}
                {filterMode === 'simple' ? (
                  <AdvancedFilter />
                ) : (
                  <RuleBasedFilter
                    isCollapsed={false}
                    onToggleCollapse={() => setIsFilterOpen(false)}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0">
        <NodeTable
          nodes={nodesForTable}
          connections={connections}
          sort={sort}
          nodeTypeFilter={nodeTypeFilter}
          expandedIds={effectiveExpandedIds}
          nodeDepths={nodeDepths}
          onSortChange={setSort}
          onRowClick={handleRowClick}
          onToggleExpand={toggleExpand}
        />
      </div>

      {/* Help text */}
      <p className="mt-3 text-xs text-gray-500">
        Click on a row to view the node in the flowchart. Click column headers to sort.
        {filterActive && ' Use the filter above to refine the node list.'}
      </p>
    </div>
  );
};

export default ListView;
