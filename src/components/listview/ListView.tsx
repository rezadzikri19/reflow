import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
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
  useFilterSheets,
  useSheets,
  useHighlightedNodeIds,
} from '../../stores/flowchartStore';
import { useNodeConnections } from '../../hooks/useNodeConnections';
import { useRuleFilter } from '../../hooks/useRuleFilter';
import { useFilterStore, useListFilterConfig } from '../../stores/filterStore';
import { NodeTable, type SortState, COLUMNS } from './NodeTable';
import { RuleBasedFilter } from '../filter';
import { AdvancedFilter } from '../flowchart/AdvancedFilter';
import { exportTableData, type ExportFormat } from '../../utils/tableExport';
import type { ProcessNodeType, FrequencyType, UnitType } from '../../types';
import {
  buildNodeTree,
  flattenTreeWithDepth,
  flattenTreeAllNodes,
  sortTreeNodes,
  filterTreeWithAncestors,
  getParentChain,
  getBreadcrumbPath,
} from '../../utils/nodeHierarchy';
import { useHierarchicalFlowOrderMap } from '../../contexts/FlowOrderContext';

// ============================================================================
// Icons
// ============================================================================

const FilterIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
  </svg>
);

const ExportIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const ExcelIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2zM6 4h7.5v4H18v12H6V4zm2 8v2h3v-2H8zm0 3v2h3v-2H8zm5-3v2h3v-2h-3zm0 3v2h3v-2h-3z" />
  </svg>
);

const CSVIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h2l2 3-2 3H8l2-3-2-3z" />
    <path d="M16 13v6" />
    <path d="M14 16h4" />
  </svg>
);

const JSONIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1" />
    <path d="M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1" />
  </svg>
);

const XMLIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 6l4 12 4-12" />
    <path d="M18 6l-4 12-4-12" />
    <path d="M22 6v12" />
    <path d="M20 6h4" />
  </svg>
);

// ============================================================================
// List View Component
// ============================================================================

export const ListView: React.FC = () => {
  // Get all sheets and create a combined nodes array with sheet info
  const sheets = useSheets();

  // Combine all nodes from all sheets with sheet info
  const nodes = useMemo(() => {
    return sheets.flatMap(sheet =>
      sheet.nodes.map(node => ({
        ...node,
        sheetId: sheet.id,
        sheetName: sheet.name,
      }))
    );
  }, [sheets]);

  // For connections, we need all edges from all sheets
  const allEdges = useMemo(() => {
    return sheets.flatMap(sheet => sheet.edges);
  }, [sheets]);

  const connections = useNodeConnections(nodes, allEdges);
  const setSelectedNode = useFlowchartStore((state) => state.setSelectedNode);

  // Get hierarchical flow order map for sorting by node number
  const flowOrderMap = useHierarchicalFlowOrderMap();

  // Global filter mode state
  const filterMode = useFilterMode();
  const setFilterMode = useFlowchartStore((state) => state.setFilterMode);

  // Filter state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  // Export state
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const exportButtonRef = useRef<HTMLButtonElement>(null);

  // Local state for sorting
  const [sort, setSort] = useState<SortState>({
    column: 'label',
    direction: 'asc',
  });

  // Expand/collapse state for tree view
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Get highlighted nodes from store (single source of truth for selection)
  const highlightedNodeIds = useHighlightedNodeIds();
  const setHighlightedNodes = useFlowchartStore((state) => state.setHighlightedNodes);
  const clearHighlightedNodes = useFlowchartStore((state) => state.clearHighlightedNodes);

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
  const filterSheets = useFilterSheets();

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

      // Check sheet filter
      if (filterSheets.length > 0) {
        const nodeSheetId = (node as any).sheetId;
        if (!nodeSheetId || !filterSheets.includes(nodeSheetId)) {
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
    filterSheets,
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
    return sortTreeNodes(nodeTree, sort.column, sort.direction, flowOrderMap);
  }, [nodeTree, sort.column, sort.direction, flowOrderMap]);

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

  // Toggle highlighted node in store
  const handleToggleSelection = useCallback((nodeId: string) => {
    const currentIds = useFlowchartStore.getState().highlightedNodeIds;
    const newIds = currentIds.includes(nodeId)
      ? currentIds.filter(id => id !== nodeId)
      : [...currentIds, nodeId];
    setHighlightedNodes(newIds);
  }, [setHighlightedNodes]);

  // Toggle select all / deselect all
  const handleToggleSelectAll = useCallback(() => {
    const currentIds = useFlowchartStore.getState().highlightedNodeIds;
    // If all visible nodes are selected, deselect all
    if (currentIds.length === nodesForTable.length) {
      clearHighlightedNodes();
    } else {
      // Otherwise, select all visible nodes
      setHighlightedNodes(nodesForTable.map(n => n.id));
    }
  }, [nodesForTable, setHighlightedNodes, clearHighlightedNodes]);

  // Handle double-click to navigate to flowchart
  const handleRowDoubleClick = useCallback((nodeId: string) => {
    // Set the selected node and navigate to flowchart
    setSelectedNode(nodeId);
    sessionStorage.setItem('navigateToView', 'flowchart');
    window.dispatchEvent(new StorageEvent('storage', { key: 'navigateToView', newValue: 'flowchart' }));
    window.dispatchEvent(new CustomEvent('navigateToFlowchart', { detail: { nodeId } }));
  }, [setSelectedNode]);

  // Clear selection handler
  const handleClearSelection = useCallback(() => {
    clearHighlightedNodes();
  }, [clearHighlightedNodes]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape: Clear selection
      if (e.key === 'Escape' && highlightedNodeIds.length > 0) {
        handleClearSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClearSelection, highlightedNodeIds.length]);

  // Toggle filter panel
  const toggleFilterOpen = useCallback(() => {
    setIsFilterOpen(!isFilterOpen);
  }, [isFilterOpen]);

  // Get ALL nodes for export (ignoring expansion state) with hierarchy info
  const allNodesForExport = useMemo(() => {
    return flattenTreeAllNodes(sortedTree);
  }, [sortedTree]);

  // Build hierarchy map for export (nodeId -> breadcrumb path)
  const hierarchyMap = useMemo(() => {
    const map = new Map<string, string>();
    allNodesForExport.forEach(({ node }) => {
      const breadcrumb = getBreadcrumbPath(node.id, nodes);
      map.set(node.id, breadcrumb);
    });
    return map;
  }, [allNodesForExport, nodes]);

  // Handle export - exports ALL nodes in expanded form with hierarchy
  const handleExport = useCallback((format: ExportFormat) => {
    const nodesToExport = allNodesForExport.map(item => item.node);
    exportTableData(nodesToExport, connections, COLUMNS, format, {
      hierarchyMap,
    });
    setIsExportMenuOpen(false);
  }, [allNodesForExport, connections, hierarchyMap]);

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

        {/* Action buttons - Filter and Export */}
        <div className="flex items-center gap-2">
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

          {/* Export button with dropdown */}
          <div className="relative">
            <button
              ref={exportButtonRef}
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              disabled={nodesForTable.length === 0}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                nodesForTable.length === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : isExportMenuOpen
                    ? 'bg-gray-200 text-gray-800'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <ExportIcon />
              <span>Export</span>
            </button>

            {/* Export Dropdown Menu */}
            {isExportMenuOpen && (
              <>
                {/* Click-outside overlay */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsExportMenuOpen(false)}
                />
                {/* Export dropdown panel */}
                <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-30 py-1">
                  <button
                    onClick={() => handleExport('xlsx')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <ExcelIcon />
                    <span>Excel (.xlsx)</span>
                  </button>
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <CSVIcon />
                    <span>CSV (.csv)</span>
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <JSONIcon />
                    <span>JSON (.json)</span>
                  </button>
                  <button
                    onClick={() => handleExport('xml')}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <XMLIcon />
                    <span>XML (.xml)</span>
                  </button>
                </div>
              </>
            )}
          </div>
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
          hierarchyMap={hierarchyMap}
          selectedNodeIds={new Set(highlightedNodeIds)}
          onSortChange={setSort}
          onRowDoubleClick={handleRowDoubleClick}
          onToggleSelection={handleToggleSelection}
          onToggleSelectAll={handleToggleSelectAll}
          onToggleExpand={toggleExpand}
        />
      </div>

      {/* Selection status bar */}
      {highlightedNodeIds.length > 0 ? (
        <div className="mt-3 flex items-center justify-between px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-blue-700">
              {highlightedNodeIds.length} node{highlightedNodeIds.length !== 1 ? 's' : ''} selected
            </span>
            <span className="text-xs text-blue-500">
              (highlighted in flowchart)
            </span>
          </div>
          <button
            onClick={handleClearSelection}
            className="px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 rounded transition-colors"
          >
            Clear Selection
          </button>
        </div>
      ) : (
        <p className="mt-3 text-xs text-gray-500">
          Use checkboxes to select nodes and highlight them in the flowchart. Double-click a row to navigate to that node.
          {filterActive && ' Use the filter above to refine the node list.'}
        </p>
      )}
    </div>
  );
};

export default ListView;
