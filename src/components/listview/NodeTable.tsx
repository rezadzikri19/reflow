import React, { useMemo } from 'react';
import type { FlowchartNode, ProcessNodeType } from '../../types';
import type { NodeConnectionsMap } from '../../hooks/useNodeConnections';

// ============================================================================
// Types
// ============================================================================

export type SortDirection = 'asc' | 'desc';

export interface SortState {
  column: string;
  direction: SortDirection;
}

interface NodeTableProps {
  nodes: FlowchartNode[];
  connections: NodeConnectionsMap;
  sort: SortState;
  nodeTypeFilter: ProcessNodeType | 'all';
  onSortChange: (sort: SortState) => void;
  onRowClick: (nodeId: string) => void;
}

// ============================================================================
// Column Definitions
// ============================================================================

interface ColumnDef {
  key: string;
  label: string;
  defaultVisible: boolean;
  accessor: (node: FlowchartNode, connections: NodeConnectionsMap) => React.ReactNode;
  sortable: boolean;
  width?: string;
}

const COLUMNS: ColumnDef[] = [
  {
    key: 'label',
    label: 'Label',
    defaultVisible: true,
    accessor: (node) => node.data.label || '-',
    sortable: true,
    width: '200px',
  },
  {
    key: 'nodeType',
    label: 'Type',
    defaultVisible: true,
    accessor: (node) => (
      <span
        className={`text-xs px-2 py-0.5 rounded ${
          node.data.nodeType === 'process'
            ? 'bg-blue-100 text-blue-700'
            : node.data.nodeType === 'subprocess'
              ? 'bg-purple-100 text-purple-700'
              : node.data.nodeType === 'decision'
                ? 'bg-yellow-100 text-yellow-700'
                : node.data.nodeType === 'start'
                  ? 'bg-green-100 text-green-700'
                  : node.data.nodeType === 'end'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-gray-100 text-gray-700'
        }`}
      >
        {node.data.nodeType}
      </span>
    ),
    sortable: true,
    width: '100px',
  },
  {
    key: 'description',
    label: 'Description',
    defaultVisible: true,
    accessor: (node) => {
      const desc = node.data.description;
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
      const role = node.data.role;
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
      const tags = node.data.tags as string[] | undefined;
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
      const time = node.data.unitTimeMinutes as number | undefined;
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
    accessor: (node) => node.data.frequency || '-',
    sortable: true,
    width: '100px',
  },
  {
    key: 'requiresFTE',
    label: 'Requires FTE',
    defaultVisible: true,
    accessor: (node) => {
      const requiresFTE = node.data.requiresFTE as boolean | undefined;
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
      const pain = node.data.painPoints as string | undefined;
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
      const imp = node.data.improvement as string | undefined;
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
      const docs = node.data.documents as string[] | undefined;
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
      const dataElements = node.data.data as string[] | undefined;
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
    accessor: (node) => node.data.unitType || '-',
    sortable: true,
    width: '100px',
  },
  {
    key: 'defaultQuantity',
    label: 'Default Qty',
    defaultVisible: true,
    accessor: (node) => {
      const qty = node.data.defaultQuantity;
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
      const fte = node.data.ftePerUnit;
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
      const cap = node.data.parallelCapacity;
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
      const locked = node.data.locked as boolean | undefined;
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
  onSortChange,
  onRowClick,
}) => {
  // Filter visible columns
  const visibleColumns = COLUMNS.filter((col) => col.defaultVisible);

  // Filter nodes by type
  const filteredNodes = useMemo(() => {
    if (nodeTypeFilter === 'all') return nodes;
    return nodes.filter((node) => node.data.nodeType === nodeTypeFilter);
  }, [nodes, nodeTypeFilter]);

  // Sort nodes
  const sortedNodes = useMemo(() => {
    const sorted = [...filteredNodes];
    const column = COLUMNS.find((c) => c.key === sort.column);
    if (!column || !column.sortable) return sorted;

    sorted.sort((a, b) => {
      const aVal = column.accessor(a, connections);
      const bVal = column.accessor(b, connections);

      // Handle string comparison
      const aStr = typeof aVal === 'string' ? aVal : String(aVal ?? '');
      const bStr = typeof bVal === 'string' ? bVal : String(bVal ?? '');

      const comparison = aStr.localeCompare(bStr, undefined, {
        numeric: true,
        sensitivity: 'base',
      });

      return sort.direction === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [filteredNodes, sort, connections]);

  // Handle sort toggle
  const handleSort = (columnKey: string) => {
    const column = COLUMNS.find((c) => c.key === columnKey);
    if (!column || !column.sortable) return;

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

  return (
    <div className="h-full flex flex-col border border-gray-200 rounded-lg overflow-hidden">
      {/* Table container with both horizontal and vertical scroll */}
      <div className="flex-1 overflow-auto">
        <table className="border-collapse" style={{ minWidth: '100%' }}>
          <thead className="bg-gray-50 sticky top-0 z-20">
            <tr>
              {/* Row number column header */}
              <th
                className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-30 border-b border-gray-200"
                style={{ width: '50px', minWidth: '50px' }}
              >
                #
              </th>
              {visibleColumns.map((column) => (
                <th
                  key={column.key}
                  onClick={() => handleSort(column.key)}
                  className={`
                    px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap
                    ${column.sortable ? 'cursor-pointer hover:bg-gray-100 select-none' : ''}
                    ${column.key === 'label' ? 'sticky left-[50px] bg-gray-50 z-20' : ''}
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
            {sortedNodes.map((node, index) => (
              <tr
                key={node.id}
                onClick={() => onRowClick(node.id)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                {/* Row number cell */}
                <td
                  className="px-3 py-3 text-sm text-gray-500 text-center sticky left-0 bg-white z-10 border-b border-gray-200"
                  style={{ width: '50px', minWidth: '50px' }}
                >
                  {index + 1}
                </td>
                {visibleColumns.map((column) => (
                  <td
                    key={column.key}
                    className={`
                      px-4 py-3 text-sm text-gray-900 whitespace-nowrap
                      ${column.key === 'label' ? 'sticky left-[50px] bg-white z-10 font-medium' : ''}
                      border-b border-gray-200
                    `}
                    style={{ width: column.width, minWidth: column.width }}
                  >
                    {column.accessor(node, connections)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default NodeTable;
