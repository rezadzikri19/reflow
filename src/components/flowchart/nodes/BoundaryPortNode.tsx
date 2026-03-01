import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { GripVertical } from 'lucide-react';
import type { BoundaryPortNodeData } from '../../../types/index';

// =============================================================================
// Types
// =============================================================================

export type { BoundaryPortNodeData } from '../../../types/index';

// =============================================================================
// BoundaryPortNode Component
// =============================================================================

function BoundaryPortNode({ data, selected }: NodeProps) {
  const { label, direction } = data as BoundaryPortNodeData;
  const isInput = direction === 'input';

  return (
    <div
      className={`
        flex items-center gap-1.5 px-2 py-1.5
        ${isInput ? 'bg-green-100 border-green-400 text-green-700' : 'bg-blue-100 border-blue-400 text-blue-700'}
        border-2 rounded-md
        shadow-sm
        transition-all duration-200
        min-w-[100px] max-w-[140px]
        ${selected ? 'ring-2 ring-offset-1 ring-purple-400' : ''}
        cursor-grab active:cursor-grabbing
        hover:shadow-md
      `}
    >
      {/* Input: dot on left, text on right */}
      {/* Output: text on left, dot on right */}
      {isInput ? (
        <>
          <GripVertical className="w-3 h-3 text-green-400 shrink-0" />
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full shrink-0" />
          <span className="font-semibold text-xs truncate flex-1" title={label}>
            {label}
          </span>
          <Handle
            type="source"
            position={Position.Right}
            className="!w-2 !h-2 !bg-green-500 !border-2 !border-green-600 hover:!bg-green-400"
          />
        </>
      ) : (
        <>
          <Handle
            type="target"
            position={Position.Left}
            className="!w-2 !h-2 !bg-blue-500 !border-2 !border-blue-600 hover:!bg-blue-400"
          />
          <span className="font-semibold text-xs truncate flex-1 text-right" title={label}>
            {label}
          </span>
          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shrink-0" />
          <GripVertical className="w-3 h-3 text-blue-400 shrink-0" />
        </>
      )}
    </div>
  );
}

export default memo(BoundaryPortNode);
