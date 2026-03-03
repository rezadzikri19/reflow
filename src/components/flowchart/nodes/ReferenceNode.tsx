import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { BaseNodeData } from '../../../types/index';
import NodeTags from './NodeTags';
import FlowOrderBadge from './FlowOrderBadge';
import { useFlowOrder } from '../../../contexts/FlowOrderContext';

/**
 * ReferenceNode - Sky blue circular node that displays a configurable reference number
 * Used to reference another node's flow order, helping avoid visual clutter from long
 * connection lines and preventing back-and-forth connections in complex flows.
 */
function ReferenceNode({ id, data, selected }: NodeProps) {
  const { label = 'Reference', tags, referenceNumber = 1 } = (data as BaseNodeData & { referenceNumber?: number }) || {};
  const flowOrder = useFlowOrder(id);

  return (
    <div className="relative">
      {/* Flow Order Badge */}
      <FlowOrderBadge order={flowOrder} />

      {/* Target Handle - Left side for incoming connections */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-sky-300 !border-2 !border-sky-700 hover:!bg-sky-200"
      />

      <div
        className={`
          flex items-center justify-center
          w-12 h-12 rounded-full
          bg-sky-500 hover:bg-sky-600
          border-2 border-sky-700
          shadow-lg hover:shadow-xl
          transition-all duration-200
          cursor-pointer
          ${selected ? 'ring-2 ring-sky-400 ring-offset-2' : ''}
        `}
      >
        {/* Source Handle - Right side for outgoing connection */}
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-sky-300 !border-2 !border-sky-700 hover:!bg-sky-200"
        />

        {/* Reference number */}
        <span className="text-white font-bold text-lg">
          {referenceNumber}
        </span>
      </div>

      {/* Label below the node */}
      <div
        className="absolute whitespace-nowrap pointer-events-none"
        style={{ bottom: -20, left: '50%', transform: 'translateX(-50%)' }}
      >
        <span
          className="text-xs font-medium text-sky-800 bg-sky-100 px-2 py-0.5 rounded truncate block text-center"
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

export default memo(ReferenceNode);
