import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { BaseNodeData, ProcessNodeData } from '../../../types/index';
import NodeTags from './NodeTags';
import { useFlowOrder } from '../../../contexts/FlowOrderContext';
import { useNodes } from '../../../stores/flowchartStore';

/**
 * ReferenceNode - Sky blue circular node that displays the flow order of a referenced node
 * Used to reference another node's flow order, helping avoid visual clutter from long
 * connection lines and preventing back-and-forth connections in complex flows.
 * The label is automatically synced with the referenced node's label.
 */
function ReferenceNode({ id: _id, data, selected }: NodeProps) {
  const { tags, referencedNodeId } = (data as BaseNodeData & { referencedNodeId?: string }) || {};
  const nodes = useNodes();

  // Get the referenced node
  const referencedNode = nodes.find(n => n.id === referencedNodeId);
  // Label is always the referenced node's label (auto-synced)
  const label = referencedNode ? (referencedNode.data as ProcessNodeData).label || 'Reference' : 'Reference';

  // Get the flow order of the referenced node (not this node)
  const referencedFlowOrder = useFlowOrder(referencedNodeId || '');

  return (
    <div className="relative">
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

        {/* Referenced node's flow order number */}
        <span className="text-white font-bold text-lg">
          {referencedFlowOrder || '?'}
        </span>
      </div>

      {/* Label below the node */}
      <div
        className="absolute pointer-events-none left-1/2 -translate-x-1/2 mt-1"
        style={{ top: '100%' }}
      >
        <span
          className="text-xs font-medium text-sky-800 bg-sky-100 px-2 py-0.5 rounded text-wrap block text-center max-w-[120px]"
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
        <NodeTags tags={tags} />
      </div>
    </div>
  );
}

export default memo(ReferenceNode);
