import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Layers, ChevronRight } from 'lucide-react';
import type { BaseNodeData } from '../../../types/index';

/**
 * SubprocessNode - Purple rectangular node with nested process indicator
 * Represents a subprocess that can be expanded to show more detail
 */
function SubprocessNode({ data, selected }: NodeProps<BaseNodeData>) {
  const { label = 'Subprocess', description } = data || {};

  return (
    <div
      className={`
        flex flex-col gap-2
        min-w-[180px] max-w-[240px]
        bg-purple-500 hover:bg-purple-600
        rounded-lg
        border-2 border-purple-700
        shadow-lg hover:shadow-xl
        transition-all duration-200
        cursor-pointer
        p-3
        ${selected ? 'ring-2 ring-purple-400 ring-offset-2' : ''}
      `}
    >
      {/* Target Handle - Left side for incoming connections */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-purple-300 !border-2 !border-purple-700 hover:!bg-purple-200"
      />

      {/* Header with icon and label */}
      <div className="flex items-center gap-2">
        <Layers className="w-5 h-5 text-purple-200 shrink-0" />
        <span className="text-white font-semibold text-sm truncate flex-1" title={label}>
          {label}
        </span>
        <ChevronRight className="w-4 h-4 text-purple-200 shrink-0" />
      </div>

      {/* Nested process indicator */}
      <div className="flex items-center gap-1">
        <div className="flex gap-0.5">
          <div className="w-1 h-4 bg-purple-300 rounded-sm" />
          <div className="w-1 h-4 bg-purple-400 rounded-sm" />
          <div className="w-1 h-4 bg-purple-300 rounded-sm" />
        </div>
        <span className="text-purple-100 text-xs ml-2">Contains nested process</span>
      </div>

      {/* Description (if provided) */}
      {description && (
        <div className="border-t border-purple-400 pt-2 mt-1">
          <span
            className="text-purple-100 text-xs line-clamp-2"
            title={description}
          >
            {description}
          </span>
        </div>
      )}

      {/* Expand indicator */}
      <div className="flex items-center justify-end">
        <span className="text-purple-200 text-xs italic">Click to expand</span>
      </div>

      {/* Source Handle - Right side for outgoing connections */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-purple-300 !border-2 !border-purple-700 hover:!bg-purple-200"
      />
    </div>
  );
}

export default memo(SubprocessNode);
