import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Play } from 'lucide-react';
import type { BaseNodeData } from '../../../types/index';
import NodeTags from './NodeTags';

/**
 * StartNode - Green circular start node with play icon
 * This node represents the starting point of a process flowchart
 */
function StartNode({ data, selected }: NodeProps) {
  const { label = 'Start', tags } = (data as BaseNodeData) || {};

  return (
    <div className="relative">
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

      {/* Label below the node */}
      <div
        className="absolute whitespace-nowrap pointer-events-none"
        style={{ bottom: -20, left: '50%', transform: 'translateX(-50%)' }}
      >
        <span
          className="text-xs font-medium text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded truncate block text-center"
          title={label}
        >
          {label}
        </span>
      </div>

      {/* Tags indicator below label */}
      <div
        className="absolute pointer-events-none"
        style={{ bottom: -36, left: '50%', transform: 'translateX(-50%)' }}
      >
        <NodeTags tags={tags} />
      </div>
    </div>
  );
}

export default memo(StartNode);
