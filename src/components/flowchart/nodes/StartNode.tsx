import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Play } from 'lucide-react';
import type { BaseNodeData } from '../../../types/index';
import NodeTags from './NodeTags';
import FlowOrderBadge from './FlowOrderBadge';
import { useFlowOrder } from '../../../contexts/FlowOrderContext';

/**
 * StartNode - Green circular start node with play icon
 * This node represents the starting point of a process flowchart
 */
function StartNode({ id, data, selected }: NodeProps) {
  const { label = 'Start', tags } = (data as BaseNodeData) || {};
  const flowOrder = useFlowOrder(id);

  return (
    <div className="relative">
      {/* Flow Order Badge */}
      <FlowOrderBadge order={flowOrder} />

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
        className="absolute pointer-events-none"
        style={{ bottom: -20, left: '50%', transform: 'translateX(-50%)' }}
      >
        <span
          className="text-base font-medium text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded text-wrap block text-center max-w-[120px]"
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
