import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { BaseNodeData } from '../../../types/index';

/**
 * JunctionNode - Violet circular node that acts as a many-to-one connection hub
 * Multiple nodes can connect TO it, and it connects TO one other node.
 */
function JunctionNode({ data, selected }: NodeProps) {
  const { label = 'Junction' } = (data as BaseNodeData) || {};

  return (
    <div className="relative">
      {/* Target Handle - Left side for incoming connections */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-violet-300 !border-2 !border-violet-700 hover:!bg-violet-200"
      />

      <div
        className={`
          flex items-center justify-center
          w-6 h-6 rounded-full
          bg-violet-500 hover:bg-violet-600
          border-2 border-violet-700
          shadow-md hover:shadow-lg
          transition-all duration-200
          cursor-pointer
          ${selected ? 'ring-2 ring-violet-400 ring-offset-2' : ''}
        `}
      >
        {/* Source Handle - Right side for outgoing connection */}
        <Handle
          type="source"
          position={Position.Right}
          className="!w-2 !h-2 !bg-violet-300 !border-2 !border-violet-700 hover:!bg-violet-200"
        />
      </div>

      {/* Label below the node */}
      <div
        className="absolute pointer-events-none left-1/2 -translate-x-1/2 mt-1"
        style={{ top: '100%' }}
      >
        <span
          className="text-xs font-medium text-violet-800 bg-violet-100 px-1.5 py-0.5 rounded text-wrap block text-center max-w-[120px]"
          title={label}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

export default memo(JunctionNode);
