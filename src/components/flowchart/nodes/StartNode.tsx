import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Play } from 'lucide-react';

/**
 * StartNode - Green circular start node with play icon
 * This node represents the starting point of a process flowchart
 */
function StartNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`
        flex items-center justify-center
        w-14 h-14 rounded-full
        bg-emerald-500 hover:bg-emerald-600
        border-2 border-emerald-700
        shadow-lg hover:shadow-xl
        transition-all duration-200
        cursor-pointer
        ${selected ? 'ring-2 ring-emerald-400 ring-offset-2' : ''}
      `}
    >
      {/* Source Handle - Right side for outgoing connections */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-emerald-300 !border-2 !border-emerald-700 hover:!bg-emerald-200"
      />

      {/* Play Icon */}
      <Play className="w-6 h-6 text-white fill-white" />
    </div>
  );
}

export default memo(StartNode);
