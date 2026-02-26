import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Square } from 'lucide-react';
import type { BaseNodeData } from '../../../types/index';

/**
 * EndNode - Red circular end node with stop icon
 * This node represents the ending point of a process flowchart
 */
function EndNode({ data, selected }: NodeProps<BaseNodeData>) {
  const { label = 'End' } = data || {};

  return (
    <div className="relative">
      <div
        className={`
          flex items-center justify-center
          w-14 h-14 rounded-full
          bg-red-500 hover:bg-red-600
          border-2 border-red-700
          shadow-lg hover:shadow-xl
          transition-all duration-200
          cursor-pointer
          ${selected ? 'ring-2 ring-red-400 ring-offset-2' : ''}
        `}
      >
        {/* Target Handle - Left side for incoming connections */}
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-red-300 !border-2 !border-red-700 hover:!bg-red-200"
        />

        {/* Stop Icon */}
        <Square className="w-6 h-6 text-white" />
      </div>

      {/* Label below the node */}
      <div
        className="absolute whitespace-nowrap pointer-events-none"
        style={{ bottom: -20, left: '50%', transform: 'translateX(-50%)' }}
      >
        <span
          className="text-xs font-medium text-red-800 bg-red-100 px-2 py-0.5 rounded truncate block text-center"
          title={label}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

export default memo(EndNode);
