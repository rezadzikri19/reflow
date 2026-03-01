import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { CircleDot } from 'lucide-react';
import type { BoundaryPortNodeData } from '../../../types/index';

// =============================================================================
// Types
// =============================================================================

export type { BoundaryPortNodeData } from '../../../types/index';

// =============================================================================
// BoundaryPortNode Component
// =============================================================================

function BoundaryPortNode({ data, selected }: NodeProps) {
  const { label, direction, isManual } = data as BoundaryPortNodeData;
  const isInput = direction === 'input';

  // Determine colors based on direction and whether it's manual
  const getColors = () => {
    if (isManual) {
      // Teal for manual ports
      return {
        bg: 'bg-teal-100',
        border: 'border-teal-400',
        text: 'text-teal-700',
        dot: 'bg-teal-500',
        handle: '!bg-teal-500 !border-teal-600 hover:!bg-teal-400',
      };
    }
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

  return (
    <div
      className={`
        flex items-center gap-1.5 px-2 py-1.5
        ${colors.bg} ${colors.border} ${colors.text}
        border-2 rounded-md
        shadow-sm
        transition-all duration-200
        min-w-[100px] max-w-[140px]
        ${selected ? 'ring-2 ring-offset-1 ring-purple-400' : ''}
        cursor-move
        ${isManual ? 'border-dashed' : ''}
      `}
      title={isManual ? `Manual port: ${label}` : undefined}
    >
      {/* Input: dot on left, text on right */}
      {/* Output: text on left, dot on right */}
      {isInput ? (
        <>
          {isManual ? (
            <CircleDot className="w-3 h-3 text-teal-500 shrink-0" />
          ) : (
            <div className={`w-2.5 h-2.5 ${colors.dot} rounded-full shrink-0`} />
          )}
          <span className="font-semibold text-xs truncate flex-1" title={label}>
            {label}
          </span>
          <Handle
            type="source"
            position={Position.Right}
            className={`!w-2 !h-2 ${colors.handle}`}
          />
        </>
      ) : (
        <>
          <Handle
            type="target"
            position={Position.Left}
            className={`!w-2 !h-2 ${colors.handle}`}
          />
          <span className="font-semibold text-xs truncate flex-1 text-right" title={label}>
            {label}
          </span>
          {isManual ? (
            <CircleDot className="w-3 h-3 text-teal-500 shrink-0" />
          ) : (
            <div className={`w-2.5 h-2.5 ${colors.dot} rounded-full shrink-0`} />
          )}
        </>
      )}
    </div>
  );
}

export default memo(BoundaryPortNode);
