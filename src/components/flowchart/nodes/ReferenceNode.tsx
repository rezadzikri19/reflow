import { memo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import type { BaseNodeData, ProcessNodeData } from '../../../types/index';
import NodeTags from './NodeTags';
import { useFlowOrder } from '../../../contexts/FlowOrderContext';
import { useNodes } from '../../../stores/flowchartStore';
import HybridHandle from './HybridHandle';
import LockIndicator from './LockIndicator';

/**
 * ReferenceNode - Sky blue circular node that displays the flow order of a referenced node
 * Used to reference another node's flow order, helping avoid visual clutter from long
 * connection lines and preventing back-and-forth connections in complex flows.
 * The label is automatically synced with the referenced node's label.
 */
function ReferenceNode({ id, data, selected }: NodeProps) {
  const { tags, referencedNodeId, locked } = (data as BaseNodeData & { referencedNodeId?: string }) || {};
  const nodes = useNodes();

  // Get the referenced node
  const referencedNode = nodes.find(n => n.id === referencedNodeId);
  // Label is always the referenced node's label (auto-synced)
  const label = referencedNode ? (referencedNode.data as ProcessNodeData).label || 'Reference' : 'Reference';

  // Get the flow order of the referenced node (not this node)
  const referencedFlowOrder = useFlowOrder(referencedNodeId || '');

  return (
    <div className="relative">
      {/* Lock Indicator */}
      <LockIndicator locked={locked} />

      {/* Handles - Hybrid (can be input or output) */}
      <HybridHandle id="top" position={Position.Top} nodeId={id} nodeColor="blue" />
      <HybridHandle id="bottom" position={Position.Bottom} nodeId={id} nodeColor="blue" />
      <HybridHandle id="left" position={Position.Left} nodeId={id} nodeColor="blue" />

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
          ${locked ? 'border-dashed opacity-80' : ''}
        `}
      >
        <HybridHandle id="right" position={Position.Right} nodeId={id} nodeColor="blue" />

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
