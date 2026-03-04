import { memo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import type { BoundaryPortNodeData } from '../../../types/index';
import HybridHandle from './HybridHandle';
import LockIndicator from './LockIndicator';
import { useIsNodeMuted } from '../../../hooks/useNodeFilter';

// =============================================================================
// Types
// =============================================================================

export type { BoundaryPortNodeData } from '../../../types/index';

// =============================================================================
// BoundaryPortNode Component
// =============================================================================

function BoundaryPortNode({ id, data, selected }: NodeProps) {
  const { label, direction, isManual, locked } = data as BoundaryPortNodeData;
  const isInput = direction === 'input';
  // Note: Boundary port nodes are virtual nodes inside subprocesses
  // We still use the hook but don't apply muted styling (could be enabled later)
  useIsNodeMuted(id);

  // Determine colors based on direction (same for manual and auto-created ports)
  const getColors = () => {
    if (isInput) {
      // Green for input ports
      return {
        bg: 'bg-green-100',
        border: 'border-green-400',
        text: 'text-green-700',
        dot: 'bg-green-500',
        handle: '!bg-green-500 !border-green-600 hover:!bg-green-400',
      };
    }
    // Blue for output ports
    return {
      bg: 'bg-blue-100',
      border: 'border-blue-400',
      text: 'text-blue-700',
      dot: 'bg-blue-500',
      handle: '!bg-blue-500 !border-blue-600 hover:!bg-blue-400',
    };
  };

  const colors = getColors();

  // Boundary port nodes should not be muted (they are virtual nodes inside subprocesses)
  // But we still add the hook in case we want to filter them in the future
  return (
    <div
      className={`
        relative
        flex items-center gap-1.5 px-2 py-1.5
        ${colors.bg} ${colors.border} ${colors.text}
        border-2 rounded-md
        shadow-sm
        transition-all duration-200
        min-w-[100px] max-w-[140px]
        ${selected ? 'ring-2 ring-offset-1 ring-purple-400' : ''}
        cursor-move
        ${isManual ? 'border-dashed' : ''}
        ${locked ? 'opacity-80' : ''}
      `}
      title={label}
    >
      {/* Lock Indicator */}
      <LockIndicator locked={locked} />

      {/* Input: dot on left, text on right */}
      {/* Output: text on left, dot on right */}
      {isInput ? (
        <>
          <div className={`w-2.5 h-2.5 ${colors.dot} rounded-full shrink-0`} />
          <span className="font-semibold text-sm text-wrap flex-1" title={label}>
            {label}
          </span>
          <HybridHandle
            position={Position.Right}
            nodeId={id}
            nodeColor="green"
            forceType="source"
          />
        </>
      ) : (
        <>
          <HybridHandle
            position={Position.Left}
            nodeId={id}
            nodeColor="blue"
            forceType="target"
          />
          <span className="font-semibold text-sm text-wrap flex-1 text-right" title={label}>
            {label}
          </span>
          <div className={`w-2.5 h-2.5 ${colors.dot} rounded-full shrink-0`} />
        </>
      )}
    </div>
  );
}

export default memo(BoundaryPortNode);
