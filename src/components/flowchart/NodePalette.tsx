import React, { useState, useMemo } from 'react';
import type { ProcessNodeType, AnnotationType } from '../../types';

// ============================================================================
// Types
// ============================================================================

interface NodeTypeInfo {
  type: ProcessNodeType | AnnotationType;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  category: 'flow-control' | 'process-steps' | 'advanced' | 'annotations';
}

interface NodePaletteProps {
  /** Optional className for additional styling */
  className?: string;
  /** Callback when a node type is dragged */
  onDragStart?: (nodeType: ProcessNodeType | AnnotationType, event: React.DragEvent) => void;
  /** Callback when a node type is clicked (optional alternative to drag) */
  onNodeClick?: (nodeType: ProcessNodeType | AnnotationType) => void;
}

// ============================================================================
// Node Type Definitions
// ============================================================================

const NODE_TYPES: NodeTypeInfo[] = [
  // Flow Control
  {
    type: 'start',
    name: 'Start',
    description: 'Beginning of the process flow',
    category: 'flow-control',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8" />
      </svg>
    ),
  },
  {
    type: 'end',
    name: 'End',
    description: 'Termination point of the process',
    category: 'flow-control',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4" fill="white" />
      </svg>
    ),
  },
  {
    type: 'terminator',
    name: 'Terminator',
    description: 'Entry or exit point within the flow',
    category: 'flow-control',
    color: 'text-rose-600',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-300',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="8" width="18" height="8" rx="4" />
      </svg>
    ),
  },
  {
    type: 'decision',
    name: 'Decision',
    description: 'Conditional branch point with multiple paths',
    category: 'flow-control',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2L22 12L12 22L2 12Z" />
      </svg>
    ),
  },
  {
    type: 'junction',
    name: 'Junction',
    description: 'Connection hub where multiple paths merge into one',
    category: 'flow-control',
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-300',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="8" />
        <text x="12" y="16" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">N</text>
      </svg>
    ),
  },
  {
    type: 'connector',
    name: 'Connector',
    description: 'Connects flowchart sections across pages',
    category: 'flow-control',
    color: 'text-teal-600',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-300',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="6" />
        <text x="12" y="15" textAnchor="middle" fontSize="8" fill="white" fontWeight="bold">A</text>
      </svg>
    ),
  },
  // Process Steps
  {
    type: 'process',
    name: 'Process',
    description: 'Standard processing step or activity',
    category: 'process-steps',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="6" width="18" height="12" rx="2" />
      </svg>
    ),
  },
  {
    type: 'manualProcess',
    name: 'Manual Process',
    description: 'Manual operation requiring human intervention',
    category: 'process-steps',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-300',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M4 6L20 6L18 18L2 18Z" />
      </svg>
    ),
  },
  {
    type: 'subprocess',
    name: 'Subprocess',
    description: 'Reusable process that can be expanded',
    category: 'process-steps',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <rect x="5" y="8" width="2" height="8" fill="white" opacity="0.5" />
        <rect x="17" y="8" width="2" height="8" fill="white" opacity="0.5" />
      </svg>
    ),
  },
  // Annotations
  {
    type: 'annotationRectangle',
    name: 'Rectangle',
    description: 'Resizable rectangle for highlighting areas',
    category: 'annotations',
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-300',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="3" y="5" width="18" height="14" rx="2" />
      </svg>
    ),
  },
  {
    type: 'annotationSquare',
    name: 'Square',
    description: 'Resizable square for highlighting elements',
    category: 'annotations',
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-300',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="4" y="4" width="16" height="16" rx="2" />
      </svg>
    ),
  },
  {
    type: 'annotationCircle',
    name: 'Circle',
    description: 'Resizable circle for highlighting elements',
    category: 'annotations',
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-300',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  {
    type: 'annotationLine',
    name: 'Line',
    description: 'Horizontal line for visual separation',
    category: 'annotations',
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-300',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <line x1="3" y1="12" x2="21" y2="12" />
      </svg>
    ),
  },
  {
    type: 'annotationTextBox',
    name: 'Text Box',
    description: 'Editable text box for annotations and labels',
    category: 'annotations',
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-300',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <line x1="7" y1="10" x2="17" y2="10" />
        <line x1="7" y1="14" x2="13" y2="14" />
      </svg>
    ),
  },
];

const CATEGORIES = [
  { id: 'flow-control', name: 'Flow Control' },
  { id: 'process-steps', name: 'Process Steps' },
  { id: 'annotations', name: 'Annotations' },
  { id: 'advanced', name: 'Advanced' },
] as const;

// ============================================================================
// Search Icon Component
// ============================================================================

const SearchIcon: React.FC = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

// ============================================================================
// Node Palette Item Component
// ============================================================================

interface NodePaletteItemProps {
  nodeInfo: NodeTypeInfo;
  onDragStart?: (nodeType: ProcessNodeType | AnnotationType, event: React.DragEvent) => void;
  onClick?: (nodeType: ProcessNodeType | AnnotationType) => void;
}

const NodePaletteItem: React.FC<NodePaletteItemProps> = ({
  nodeInfo,
  onDragStart,
  onClick,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/reactflow', nodeInfo.type);
    event.dataTransfer.setData('application/annotation', nodeInfo.type.startsWith('annotation') ? 'true' : 'false');
    event.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
    onDragStart?.(nodeInfo.type, event);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleClick = () => {
    onClick?.(nodeInfo.type);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      className={`
        flex items-center gap-3
        p-3
        rounded-lg
        border
        cursor-grab
        transition-all duration-150
        hover:shadow-md
        active:cursor-grabbing
        ${nodeInfo.bgColor}
        ${nodeInfo.borderColor}
        ${isDragging ? 'opacity-50 scale-95 shadow-lg' : 'hover:shadow-sm'}
      `}
      title={`Drag to add ${nodeInfo.name} node`}
    >
      {/* Icon */}
      <div
        className={`
          flex-shrink-0
          w-10 h-10
          rounded-md
          flex items-center justify-center
          ${nodeInfo.color}
          bg-white
          shadow-sm
        `}
      >
        {nodeInfo.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h4 className={`text-sm font-semibold ${nodeInfo.color}`}>
          {nodeInfo.name}
        </h4>
        <p className="text-xs text-gray-500 truncate">
          {nodeInfo.description}
        </p>
      </div>

      {/* Drag indicator */}
      <div className="flex-shrink-0 text-gray-300">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
        </svg>
      </div>
    </div>
  );
};

// ============================================================================
// Main NodePalette Component
// ============================================================================

export const NodePalette: React.FC<NodePaletteProps> = ({
  className = '',
  onDragStart,
  onNodeClick,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter nodes based on search query
  const filteredNodes = useMemo(() => {
    if (!searchQuery.trim()) {
      return NODE_TYPES;
    }

    const query = searchQuery.toLowerCase();
    return NODE_TYPES.filter(
      (node) =>
        node.name.toLowerCase().includes(query) ||
        node.description.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Group nodes by category
  const groupedNodes = useMemo(() => {
    const groups: Record<string, NodeTypeInfo[]> = {};

    CATEGORIES.forEach((category) => {
      const categoryNodes = filteredNodes.filter(
        (node) => node.category === category.id
      );
      if (categoryNodes.length > 0) {
        groups[category.id] = categoryNodes;
      }
    });

    return groups;
  }, [filteredNodes]);

  return (
    <div className={`h-full flex flex-col bg-white ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">
          Node Palette
        </h2>

        {/* Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <SearchIcon />
          </div>
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="
              w-full
              pl-10 pr-4 py-2
              text-sm
              border border-gray-300
              rounded-md
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
              placeholder-gray-400
            "
          />
        </div>
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredNodes.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg
                className="w-12 h-12 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No nodes found</p>
            <p className="text-xs text-gray-400 mt-1">
              Try a different search term
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {CATEGORIES.map((category) => {
              const categoryNodes = groupedNodes[category.id];
              if (!categoryNodes || categoryNodes.length === 0) return null;

              return (
                <div key={category.id}>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    {category.name}
                  </h3>
                  <div className="space-y-2">
                    {categoryNodes.map((node) => (
                      <NodePaletteItem
                        key={node.type}
                        nodeInfo={node}
                        onDragStart={onDragStart}
                        onClick={onNodeClick}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          Drag nodes to the canvas or click to add
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// Exports
// ============================================================================

export default NodePalette;

// Export node type info for use in other components if needed
export { NODE_TYPES };
export type { NodeTypeInfo };
