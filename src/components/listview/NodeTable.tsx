import React, { useMemo } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { FlowchartNode, ProcessNodeType, ProcessNodeData } from '../../types';
import type { NodeConnectionsMap } from '../../hooks/useNodeConnections';
import { useHierarchicalFlowOrderMap } from '../../contexts/FlowOrderContext';

// Type guard to check if node has ProcessNodeData
function hasProcessNodeData(node: FlowchartNode): node is FlowchartNode & { data: ProcessNodeData } {
  return node.type !== 'boundaryPort';
}

// ============================================================================
// Types
// ============================================================================

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  column: string;
  direction: SortDirection;
}

/** Context passed to column accessors for additional information */
export interface AccessorContext {
  /** Map of nodeId to breadcrumb path (e.g., "Subprocess A > Subprocess B") */
  hierarchyMap?: Map<string, string>;
}

interface NodeTableProps {
  nodes: FlowchartNode[];
  connections: NodeConnectionsMap;
  sort: SortState;
  nodeTypeFilter: ProcessNodeType | 'all';
  expandedIds: Set<string>;
  nodeDepths: Map<string, number>;
  hierarchyMap?: Map<string, string>;
  /** Currently selected node IDs for multi-selection */
  selectedNodeIds: Set<string>;
  onSortChange: (sort: SortState) => void;
  /** Called when a row is double-clicked to navigate to flowchart */
  onRowDoubleClick: (nodeId: string) => void;
  /** Called when checkbox is toggled */
  onToggleSelection: (nodeId: string) => void;
  /** Called when select all is toggled */
  onToggleSelectAll: () => void;
  onToggleExpand: (nodeId: string) => void;
}

// ============================================================================
// Column Definitions
// ============================================================================

export interface ColumnDef {
  key: string;
  label: string;
  defaultVisible: boolean;
  accessor: (node: FlowchartNode, connections: NodeConnectionsMap, context?: AccessorContext) => React.ReactNode;
  sortable: boolean;
  width?: string;
}

export const COLUMNS: ColumnDef[] = [
  {
    key: 'label',
    label: 'Label',
    defaultVisible: true,
    accessor: (node, _connections, context) => {
      const label = hasProcessNodeData(node) ? node.data.label : undefined;
      const nodeLabel = label || '-';

      // If hierarchy context is provided, prepend breadcrumb path
      if (context?.hierarchyMap) {
        const hierarchy = context.hierarchyMap.get(node.id);
        if (hierarchy) {
          return `${hierarchy} > ${nodeLabel}`;
        }
      }

      return nodeLabel;
    },
    sortable: true,
    width: '350px',
  },
  {
    key: 'sheet',
    label: 'Sheet',
    defaultVisible: true,
    accessor: (node) => {
      const sheetName = (node as any).sheetName;
      if (!sheetName) return '-';
      return (
        <span className="text-xs px-2 py-0.5 rounded bg-violet-100 text-violet-700">
          {sheetName}
        </span>
      );
    },
    sortable: true,
    width: '120px',
  },
  {
    key: 'nodeType',
    label: 'Type',
    defaultVisible: true,
    accessor: (node) => {
      const nodeType = node.type;
      return (
        <span
          className={`text-xs px-2 py-0.5 rounded ${
            nodeType === 'process'
              ? 'bg-blue-100 text-blue-700'
              : nodeType === 'subprocess'
                ? 'bg-purple-100 text-purple-700'
                : nodeType === 'decision'
                  ? 'bg-yellow-100 text-yellow-700'
                  : nodeType === 'start'
                    ? 'bg-green-100 text-green-700'
                    : nodeType === 'end'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700'
          }`}
        >
          {nodeType}
        </span>
      );
    },
    sortable: true,
    width: '100px',
  },
  {
    key: 'description',
    label: 'Description',
    defaultVisible: true,
    accessor: (node) => {
      const desc = hasProcessNodeData(node) ? node.data.description : undefined;
      if (!desc) return '-';
      return <span title={desc}>{desc.length > 60 ? desc.slice(0, 60) + '...' : desc}</span>;
    },
    sortable: true,
    width: '200px',
  },
  {
    key: 'role',
    label: 'Role',
    defaultVisible: true,
    accessor: (node) => {
      const role = hasProcessNodeData(node) ? node.data.role : undefined;
      if (!role) return '-';
      return (
        <span className="text-xs px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">
          {role}
        </span>
      );
    },
    sortable: true,
    width: '120px',
  },
  {
    key: 'tags',
    label: 'Tags',
    defaultVisible: true,
    accessor: (node) => {
      const tags = hasProcessNodeData(node) ? node.data.tags : undefined;
      if (!tags || tags.length === 0) return '-';
      return (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600"
            >
              {tag}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="text-xs text-gray-400">+{tags.length - 3}</span>
          )}
        </div>
      );
    },
    sortable: false,
    width: '150px',
  },
  {
    key: 'unitTimeMinutes',
    label: 'Unit Time',
    defaultVisible: true,
    accessor: (node) => {
      const time = hasProcessNodeData(node) ? node.data.unitTimeMinutes : undefined;
      if (time === undefined || time === null) return '-';
      return `${time} min`;
    },
    sortable: true,
    width: '80px',
  },
  {
    key: 'frequency',
    label: 'Frequency',
    defaultVisible: true,
    accessor: (node) => {
      const freq = hasProcessNodeData(node) ? node.data.frequency : undefined;
      return freq || '-';
    },
    sortable: true,
    width: '100px',
  },
  {
    key: 'requiresFTE',
    label: 'Requires FTE',
    defaultVisible: true,
    accessor: (node) => {
      const requiresFTE = hasProcessNodeData(node) ? node.data.requiresFTE : undefined;
      if (requiresFTE) {
        return (
          <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
            Yes
          </span>
        );
      }
      return (
        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-500">
          No
        </span>
      );
    },
    sortable: true,
    width: '100px',
  },
  {
    key: 'painPoints',
    label: 'Pain Points',
    defaultVisible: true,
    accessor: (node) => {
      const pain = hasProcessNodeData(node) ? node.data.painPoints : undefined;
      if (!pain) return '-';
      return <span title={pain}>{pain.length > 60 ? pain.slice(0, 60) + '...' : pain}</span>;
    },
    sortable: false,
    width: '200px',
  },
  {
    key: 'improvement',
    label: 'Improvement',
    defaultVisible: true,
    accessor: (node) => {
      const imp = hasProcessNodeData(node) ? node.data.improvement : undefined;
      if (!imp) return '-';
      return <span title={imp}>{imp.length > 60 ? imp.slice(0, 60) + '...' : imp}</span>;
    },
    sortable: false,
    width: '200px',
  },
  {
    key: 'documents',
    label: 'Documents',
    defaultVisible: true,
    accessor: (node) => {
      const docs = hasProcessNodeData(node) ? node.data.documents : undefined;
      if (!docs || docs.length === 0) return '-';
      return (
        <div className="flex flex-wrap gap-1">
          {docs.slice(0, 3).map((doc) => (
            <span
              key={doc}
              className="text-xs px-1.5 py-0.5 rounded bg-orange-100 text-orange-700"
            >
              {doc}
            </span>
          ))}
          {docs.length > 3 && (
            <span className="text-xs text-gray-400">+{docs.length - 3}</span>
          )}
        </div>
      );
    },
    sortable: false,
    width: '150px',
  },
  {
    key: 'data',
    label: 'Data',
    defaultVisible: true,
    accessor: (node) => {
      const dataElements = hasProcessNodeData(node) ? node.data.data : undefined;
      if (!dataElements || dataElements.length === 0) return '-';
      return (
        <div className="flex flex-wrap gap-1">
          {dataElements.slice(0, 3).map((item) => (
            <span
              key={item}
              className="text-xs px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-700"
            >
              {item}
            </span>
          ))}
          {dataElements.length > 3 && (
            <span className="text-xs text-gray-400">+{dataElements.length - 3}</span>
          )}
        </div>
      );
    },
    sortable: false,
    width: '150px',
  },
  {
    key: 'unitType',
    label: 'Unit Type',
    defaultVisible: true,
    accessor: (node) => {
      const unitType = hasProcessNodeData(node) ? node.data.unitType : undefined;
      return unitType || '-';
    },
    sortable: true,
    width: '100px',
  },
  {
    key: 'defaultQuantity',
    label: 'Default Qty',
    defaultVisible: true,
    accessor: (node) => {
      const qty = hasProcessNodeData(node) ? node.data.defaultQuantity : undefined;
      return qty !== undefined && qty !== null ? qty.toString() : '-';
    },
    sortable: true,
    width: '90px',
  },
  {
    key: 'ftePerUnit',
    label: 'FTE/Unit',
    defaultVisible: true,
    accessor: (node) => {
      const fte = hasProcessNodeData(node) ? node.data.ftePerUnit : undefined;
      return fte !== undefined && fte !== null ? fte.toString() : '-';
    },
    sortable: true,
    width: '80px',
  },
  {
    key: 'parallelCapacity',
    label: 'Parallel Cap.',
    defaultVisible: true,
    accessor: (node) => {
      const cap = hasProcessNodeData(node) ? node.data.parallelCapacity : undefined;
      return cap !== undefined && cap !== null ? cap.toString() : '-';
    },
    sortable: true,
    width: '90px',
  },
  {
    key: 'locked',
    label: 'Locked',
    defaultVisible: true,
    accessor: (node) => {
      const locked = hasProcessNodeData(node) ? node.data.locked : undefined;
      if (locked) {
        return (
          <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-700">
            Locked
          </span>
        );
      }
      return '-';
    },
    sortable: true,
    width: '70px',
  },
  {
    key: 'id',
    label: 'ID',
    defaultVisible: true,
    accessor: (node) => (
      <span className="text-xs font-mono text-gray-500">{node.id}</span>
    ),
    sortable: false,
    width: '200px',
  },
  {
    key: 'incoming',
    label: 'Incoming From',
    defaultVisible: true,
    accessor: (_node, connections) => {
      const conns = connections.get(_node.id);
      if (!conns || conns.incoming.length === 0) return '-';
      const labels = conns.incoming.map((n) => n.label).join(', ');
      return <span title={labels}>{labels.length > 60 ? labels.slice(0, 60) + '...' : labels}</span>;
    },
    sortable: false,
    width: '150px',
  },
  {
    key: 'outgoing',
    label: 'Outgoing To',
    defaultVisible: true,
    accessor: (_node, connections) => {
      const conns = connections.get(_node.id);
      if (!conns || conns.outgoing.length === 0) return '-';
      const labels = conns.outgoing.map((n) => n.label).join(', ');
      return <span title={labels}>{labels.length > 60 ? labels.slice(0, 60) + '...' : labels}</span>;
    },
    sortable: false,
    width: '150px',
  },
];

// ============================================================================
// Node Table Component
// ============================================================================

export const NodeTable: React.FC<NodeTableProps> = ({
  nodes,
  connections,
  sort,
  nodeTypeFilter,
  expandedIds,
  nodeDepths,
  hierarchyMap,
  selectedNodeIds,
  onSortChange,
  onRowDoubleClick,
  onToggleSelection,
  onToggleSelectAll,
  onToggleExpand,
}) => {
  // Get hierarchical flow order map from context (shared with Flowchart)
  const flowOrderMap = useHierarchicalFlowOrderMap();

  // Create accessor context with hierarchy info
  const accessorContext: AccessorContext = useMemo(() => ({
    hierarchyMap,
  }), [hierarchyMap]);

  // Filter visible columns
  const visibleColumns = COLUMNS.filter((col) => col.defaultVisible);

  // Filter nodes by type
  const filteredNodes = useMemo(() => {
    if (nodeTypeFilter === 'all') return nodes;
    return nodes.filter((node) => node.data.nodeType === nodeTypeFilter);
  }, [nodes, nodeTypeFilter]);

  // Note: Sorting is now handled at the tree level in ListView.tsx
  // The nodes prop is already sorted respecting the tree hierarchy
  const sortedNodes = filteredNodes;

  // Handle sort toggle
  const handleSort = (columnKey: string) => {
    // Special case: flowOrder is not in COLUMNS but is sortable
    const isFlowOrder = columnKey === 'flowOrder';
    const column = COLUMNS.find((c) => c.key === columnKey);
    if (!isFlowOrder && (!column || !column.sortable)) return;

    if (sort.column === columnKey) {
      onSortChange({
        column: columnKey,
        direction: sort.direction === 'asc' ? 'desc' : 'asc',
      });
    } else {
      onSortChange({
        column: columnKey,
        direction: 'asc',
      });
    }
  };

  // Sort indicator
  const SortIndicator: React.FC<{ columnKey: string }> = ({ columnKey }) => {
    if (sort.column !== columnKey) return null;
    return (
      <span className="ml-1">
        {sort.direction === 'asc' ? (
          <svg className="w-3 h-3 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        ) : (
          <svg className="w-3 h-3 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </span>
    );
  };

  if (sortedNodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <svg
          className="w-16 h-16 text-gray-400 mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p className="text-gray-500 text-lg">No nodes to display</p>
        <p className="text-gray-400 text-sm mt-2">
          {nodeTypeFilter !== 'all'
            ? `No ${nodeTypeFilter} nodes found`
            : 'Add nodes to the flowchart to see them here'}
        </p>
      </div>
    );
  }

  // Helper to render expand toggle
  const renderExpandToggle = (node: FlowchartNode) => {
    const depth = nodeDepths.get(node.id) || 0;
    const isSubprocess = node.type === 'subprocess';
    const childNodeIds = hasProcessNodeData(node) ? (node.data.childNodeIds || []) : [];
    const hasChildren = childNodeIds.length > 0;
    const isExpanded = expandedIds.has(node.id);

    // Cap visual depth at 4 levels to prevent excessive indentation
    const visualDepth = Math.min(depth, 4);

    // Render connector dots for depth levels
    const renderDepthIndicators = () => {
      if (depth === 0) return null;
      const indicators = [];
      for (let i = 0; i < visualDepth; i++) {
        indicators.push(
          <span key={i} className="text-gray-300 text-xs">·</span>
        );
      }
      return indicators;
    };

    if (!isSubprocess || !hasChildren) {
      // Non-subprocess or empty subprocess - just show indentation with depth indicators
      return (
        <div
          className="flex items-center h-6 gap-0.5 pl-1"
          style={{ minWidth: '40px' }}
        >
          {renderDepthIndicators()}
          <span className="text-gray-300 text-xs ml-auto mr-2">○</span>
        </div>
      );
    }

    // Expandable subprocess
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleExpand(node.id);
        }}
        className="flex items-center h-6 gap-0.5 pl-1 hover:bg-gray-200 rounded transition-colors"
        style={{ minWidth: '40px' }}
        title={isExpanded ? 'Collapse' : 'Expand'}
      >
        {renderDepthIndicators()}
        <span className="ml-auto">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-600" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-600" />
          )}
        </span>
      </button>
    );
  };

  return (
    <div className="h-full flex flex-col border border-gray-200 rounded-lg overflow-hidden">
      {/* Table container with both horizontal and vertical scroll */}
      <div className="flex-1 overflow-auto">
        <table className="border-collapse w-max">
          <thead className="bg-gray-50 sticky top-0 z-20">
            <tr>
              {/* Checkbox column header */}
              <th
                className="px-2 py-3 text-center bg-gray-50 border-b border-gray-200 sticky left-0 z-30"
                style={{ width: '40px', minWidth: '40px' }}
              >
                <input
                  type="checkbox"
                  checked={selectedNodeIds.size === sortedNodes.length && sortedNodes.length > 0}
                  ref={(el) => {
                    if (el) {
                      el.indeterminate = selectedNodeIds.size > 0 && selectedNodeIds.size < sortedNodes.length;
                    }
                  }}
                  onChange={onToggleSelectAll}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                  title={selectedNodeIds.size === sortedNodes.length ? 'Deselect all' : 'Select all'}
                />
              </th>
              {/* Expand toggle column header */}
              <th
                className="px-1 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-200"
                style={{ width: '40px', minWidth: '40px' }}
              >
                {/* Tree column */}
              </th>
              {/* Row number column header - sortable by flow order */}
              <th
                onClick={() => handleSort('flowOrder')}
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 select-none"
                style={{ width: '40px', minWidth: '40px' }}
              >
                <div className="flex items-center">
                  #
                  <SortIndicator columnKey="flowOrder" />
                </div>
              </th>
              {visibleColumns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => handleSort(column.key)}
                  className={`
                    px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap
                    ${column.sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''}
                    border-b border-gray-200
                  `}
                  style={{ width: column.width, minWidth: column.width }}
                >
                  <div className="flex items-center">
                    {column.label}
                    {column.sortable && <SortIndicator columnKey={column.key} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedNodes.map((node) => {
              const depth = nodeDepths.get(node.id) || 0;
              const isSubprocess = node.type === 'subprocess';
              const childCount = hasProcessNodeData(node) ? (node.data.childNodeIds?.length || 0) : 0;
              const isSelected = selectedNodeIds.has(node.id);

              // Calculate visual styles based on depth and selection
              const depthBackgroundClass = isSelected
                ? 'bg-blue-100'
                : depth === 0
                  ? 'bg-white'
                  : depth === 1
                    ? 'bg-gray-50/30'
                    : depth === 2
                      ? 'bg-gray-50/50'
                      : 'bg-gray-50/70';

              return (
                <tr
                  key={node.id}
                  onDoubleClick={() => onRowDoubleClick(node.id)}
                  className={`
                    hover:bg-blue-50 cursor-pointer transition-colors
                    ${isSelected ? 'bg-blue-100 hover:bg-blue-100' : ''}
                    ${depthBackgroundClass}
                  `}
                >
                  {/* Checkbox cell */}
                  <td
                    className={`px-2 py-3 text-center sticky left-0 ${isSelected ? 'bg-blue-100' : depthBackgroundClass} z-10 border-b border-gray-200`}
                    style={{ width: '40px', minWidth: '40px' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelection(node.id)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 cursor-pointer"
                    />
                  </td>
                  {/* Expand toggle cell */}
                  <td
                    className={`px-1 py-3 ${isSelected ? 'bg-blue-100' : depthBackgroundClass} border-b border-gray-200`}
                    style={{ width: '40px', minWidth: '40px' }}
                  >
                    {renderExpandToggle(node)}
                  </td>
                  {/* Row number cell - shows flow order from Flowchart */}
                  <td
                    className={`px-3 py-3 text-sm text-gray-500 text-center ${isSelected ? 'bg-blue-100' : depthBackgroundClass} border-b border-gray-200`}
                    style={{ width: '40px', minWidth: '40px' }}
                  >
                    {flowOrderMap.get(node.id) || ''}
                  </td>
                  {visibleColumns.map((column) => {
                    return (
                      <td
                        key={column.key}
                        className={`
                          px-4 py-3 text-sm text-gray-900 whitespace-nowrap
                          ${column.key === 'label' ? `${isSelected ? 'bg-blue-100' : depthBackgroundClass} font-medium` : ''}
                          border-b border-gray-200
                        `}
                        style={{
                          width: column.width,
                          minWidth: column.width,
                          // Add indentation to label column content
                          ...(column.key === 'label' && depth > 0 ? {
                            paddingLeft: `${8 + depth * 12}px`
                          } : {})
                        }}
                      >
                        {column.key === 'label' ? (
                          <span className="flex items-center gap-2">
                            {/* Show depth indicator prefix for nested nodes */}
                            {depth > 0 && (
                              <span className="text-gray-400 text-xs select-none">
                                {'→'.repeat(Math.min(depth, 3))}
                              </span>
                            )}
                            {column.accessor(node, connections, accessorContext)}
                            {isSubprocess && childCount > 0 && (
                              <span className="text-xs text-gray-400 font-normal">
                                ({childCount} {childCount === 1 ? 'node' : 'nodes'})
                              </span>
                            )}
                          </span>
                        ) : (
                          column.accessor(node, connections, accessorContext)
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NodeTable;
