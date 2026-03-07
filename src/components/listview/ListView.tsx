import React, { useState, useCallback, useMemo } from 'react';
import { useNodes, useEdges, useFlowchartStore } from '../../stores/flowchartStore';
import { useNodeConnections } from '../../hooks/useNodeConnections';
import { NodeTable, type SortState } from './NodeTable';
import type { ProcessNodeType } from '../../types';

// ============================================================================
// Node Type Filter Options
// ============================================================================

const NODE_TYPE_OPTIONS: { value: ProcessNodeType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Types' },
  { value: 'process', label: 'Process' },
  { value: 'subprocess', label: 'Subprocess' },
  { value: 'decision', label: 'Decision' },
  { value: 'start', label: 'Start' },
  { value: 'end', label: 'End' },
  { value: 'junction', label: 'Junction' },
  { value: 'reference', label: 'Reference' },
  { value: 'manualProcess', label: 'Manual Process' },
  { value: 'connector', label: 'Connector' },
  { value: 'terminator', label: 'Terminator' },
];

// ============================================================================
// List View Component
// ============================================================================

export const ListView: React.FC = () => {
  const nodes = useNodes();
  const edges = useEdges();
  const connections = useNodeConnections(nodes, edges);
  const setSelectedNodeId = useFlowchartStore((state) => state.setSelectedNodeId);

  // Local state for sorting
  const [sort, setSort] = useState<SortState>({
    column: 'label',
    direction: 'asc',
  });

  // Local state for node type filter
  const [nodeTypeFilter, setNodeTypeFilter] = useState<ProcessNodeType | 'all'>('all');

  // Get node counts by type
  const nodeTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    nodes.forEach((node) => {
      const type = node.data.nodeType;
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [nodes]);

  // Handle row click - navigate to flowchart and select node
  const handleRowClick = useCallback(
    (nodeId: string) => {
      // Set the selected node and navigate to flowchart
      setSelectedNodeId(nodeId);
      // Store the view to navigate to in sessionStorage for App.tsx to pick up
      sessionStorage.setItem('navigateToView', 'flowchart');
      // Trigger a storage event for same-tab navigation
      window.dispatchEvent(new StorageEvent('storage', { key: 'navigateToView', newValue: 'flowchart' }));
      // Also set a flag that App.tsx can check
      window.dispatchEvent(new CustomEvent('navigateToFlowchart', { detail: { nodeId } }));
    },
    [setSelectedNodeId]
  );

  return (
    <div className="h-full flex flex-col p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Node List</h2>
          <p className="text-sm text-gray-500 mt-1">
            {nodes.length} node{nodes.length !== 1 ? 's' : ''} in flowchart
          </p>
        </div>

        {/* Node Type Filter */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Filter by type:</label>
          <select
            value={nodeTypeFilter}
            onChange={(e) => setNodeTypeFilter(e.target.value as ProcessNodeType | 'all')}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            {NODE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
                {option.value !== 'all' && nodeTypeCounts[option.value]
                  ? ` (${nodeTypeCounts[option.value]})`
                  : option.value === 'all'
                    ? ` (${nodes.length})`
                    : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <NodeTable
          nodes={nodes}
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
      </p>
    </div>
  );
};

export default ListView;
