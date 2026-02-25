import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { StopIcon } from 'lucide-react';

/**
 * EndNode - Red circular end node with stop icon
 * This node represents the ending point of a process flowchart
 */
function EndNode({ data, selected }: NodeProps) {
  return (
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
      <StopIcon className="w-6 h-6 text-white" />
    </div>
  );
}

export default memo(EndNode);
