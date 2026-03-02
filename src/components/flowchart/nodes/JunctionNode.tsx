import { memo } from 'react';
import { Handle, Position, type NodeProps, useEdges } from '@xyflow/react';
import type { BaseNodeData } from '../../../types/index';
import NodeTags from './NodeTags';
import FlowOrderBadge from './FlowOrderBadge';
import { useFlowOrder } from '../../../contexts/FlowOrderContext';

/**
 * JunctionNode - Violet circular node that acts as a many-to-one connection hub
 * Multiple nodes can connect TO it, and it connects TO one other node.
 * The number in the circle displays the count of incoming connections.
 */
function JunctionNode({ id, data, selected }: NodeProps) {
  const { label = 'Junction', tags } = (data as BaseNodeData) || {};
  const flowOrder = useFlowOrder(id);
  const edges = useEdges();

  // Count incoming connections to this node
  const incomingCount = edges.filter(edge => edge.target === id).length;

  return (
    <div className="relative">
      {/* Flow Order Badge */}
      <FlowOrderBadge order={flowOrder} />

      {/* Target Handle - Left side for incoming connections */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-violet-300 !border-2 !border-violet-700 hover:!bg-violet-200"
      />

      <div
        className={`
          flex items-center justify-center
          w-12 h-12 rounded-full
          bg-violet-500 hover:bg-violet-600
          border-2 border-violet-700
          shadow-lg hover:shadow-xl
          transition-all duration-200
          cursor-pointer
          ${selected ? 'ring-2 ring-violet-400 ring-offset-2' : ''}
        `}
      >
        {/* Source Handle - Right side for outgoing connection */}
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-violet-300 !border-2 !border-violet-700 hover:!bg-violet-200"
        />

        {/* Connection count number */}
        <span className="text-white font-bold text-lg">
          {incomingCount}
        </span>
      </div>

      {/* Label below the node */}
      <div
        className="absolute whitespace-nowrap pointer-events-none"
        style={{ bottom: -20, left: '50%', transform: 'translateX(-50%)' }}
      >
        <span
          className="text-xs font-medium text-violet-800 bg-violet-100 px-2 py-0.5 rounded truncate block text-center"
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

export default memo(JunctionNode);
