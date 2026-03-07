import React, { useState, useCallback, useMemo } from 'react';
import { useNodes, useEdges, useFlowchartStore } from '../../stores/flowchartStore';
import { useNodeConnections } from '../../hooks/useNodeConnections';
import { useRuleFilter } from '../../hooks/useRuleFilter';
import { useFilterStore } from '../../stores/filterStore';
import { NodeTable, type SortState } from './NodeTable';
import { RuleBasedFilter } from '../filter';
import type { ProcessNodeType } from '../../types';

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

  // Filter state
  const [isFilterCollapsed, setIsFilterCollapsed] = useState(false);

  // Local state for sorting
  const [sort, setSort] = useState<SortState>({
    column: 'label',
    direction: 'asc',
  });

  // Node type filter (legacy - kept for compatibility, but we use 'all' since we filter with rules)
  const nodeTypeFilter: ProcessNodeType | 'all' = 'all';

  // Get filter state from store
  const isFilterActive = useFilterStore((state) => state.isFilterActive);
  const countRules = useFilterStore((state) => state.countRules);
  const listFilterConfig = useFilterStore((state) => state.listFilterConfig);

  // Apply rule-based filter
  const filteredNodes = useRuleFilter(nodes, listFilterConfig);

  // Check if filter is active
  const filterActive = isFilterActive();
  const ruleCount = countRules();

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
  const toggleFilterCollapse = useCallback(() => {
    setIsFilterCollapsed(!isFilterCollapsed);
  }, [isFilterCollapsed]);

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Node List</h2>
          <p className="text-sm text-gray-500 mt-1">
            {filterActive ? (
              <>
                Showing {filteredNodes.length} of {nodes.length} nodes
                <span className="ml-2 px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded text-xs">
                  {ruleCount} rule{ruleCount !== 1 ? 's' : ''}
                </span>
              </>
            ) : (
              <>
                {nodes.length} node{nodes.length !== 1 ? 's' : ''} in flowchart
              </>
            )}
          </p>
        </div>

        {/* Filter toggle button */}
        <button
          onClick={toggleFilterCollapse}
          className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
            filterActive
              ? 'bg-primary-100 text-primary-700 hover:bg-primary-200'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <FilterIcon />
          <span>Filter</span>
          {filterActive && (
            <span className="flex items-center justify-center w-5 h-5 bg-primary-500 text-white rounded-full text-xs">
              {ruleCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      <div className="mb-4">
        <RuleBasedFilter
          isCollapsed={isFilterCollapsed}
          onToggleCollapse={toggleFilterCollapse}
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <NodeTable
          nodes={filteredNodes}
          connections={connections}
          sort={sort}
          nodeTypeFilter={nodeTypeFilter}
          onSortChange={setSort}
          onRowClick={handleRowClick}
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
