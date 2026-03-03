import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { BaseNodeData } from '../../../types/index';
import NodeTags from './NodeTags';
import FlowOrderBadge from './FlowOrderBadge';
import { useFlowOrder } from '../../../contexts/FlowOrderContext';

/**
 * ConnectorNode - Teal circular node for connecting flowchart sections
 * Small circular node used to connect different parts of a flowchart,
 * typically used when a flow continues on another page or section
 */
function ConnectorNode({ id, data, selected }: NodeProps) {
  const { label = 'A' } = (data as BaseNodeData) || {};
  const flowOrder = useFlowOrder(id);

  return (
    <div className="relative">
      {/* Flow Order Badge */}
      <FlowOrderBadge order={flowOrder} />

      {/* Target Handle - Left side for incoming connections */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-teal-300 !border-2 !border-teal-700 hover:!bg-teal-200"
      />

      {/* Circle shape */}
      <div
        className={`
          flex items-center justify-center
          w-10 h-10 rounded-full
          bg-teal-500 hover:bg-teal-600
          border-2 border-teal-700
          shadow-md hover:shadow-lg
          transition-all duration-200
          cursor-pointer
          ${selected ? 'ring-2 ring-teal-400 ring-offset-2' : ''}
        `}
      >
        {/* Source Handle - Right side for outgoing connections */}
        <Handle
          type="source"
          position={Position.Right}
          className="!w-2 !h-2 !bg-teal-300 !border-2 !border-teal-700 hover:!bg-teal-200"
        />

        {/* Connector label (typically a letter or number) */}
        <span
          className="text-white font-bold text-sm"
          title={label}
        >
          {label}
        </span>
      </div>

      {/* Label below the node */}
      <div
        className="absolute pointer-events-none left-1/2 -translate-x-1/2 mt-1"
        style={{ top: '100%' }}
      >
        <span
          className="text-xs font-medium text-teal-800 bg-teal-100 px-1.5 py-0.5 rounded text-wrap block text-center max-w-[80px]"
          title={label}
        >
          {label}
        </span>
      </div>

      {/* Tags indicator below label */}
      <div
        className="absolute pointer-events-none left-1/2 -translate-x-1/2 mt-1"
        style={{ top: '100%', marginTop: '24px' }}
      >
        <NodeTags tags={(data as BaseNodeData)?.tags} />
      </div>
    </div>
  );
}

export default memo(ConnectorNode);
