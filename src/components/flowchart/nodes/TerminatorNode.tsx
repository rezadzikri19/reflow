import { memo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import type { BaseNodeData } from '../../../types/index';
import NodeTags from './NodeTags';
import NodeRole from './NodeRole';
import FlowOrderBadge from './FlowOrderBadge';
import { useFlowOrder } from '../../../contexts/FlowOrderContext';
import HybridHandle from './HybridHandle';
import LockIndicator from './LockIndicator';
import { useIsNodeMuted } from '../../../hooks/useNodeFilter';

/**
 * TerminatorNode - Rose elongated circle (stadium/pill shape) node
 * Represents a terminator point in standard flowchart notation
 * Used to indicate entry/exit points, or the start/end of a process
 * Different from Start/End nodes - terminators are for entry/exit points within a flow
 */
function TerminatorNode({ id, data, selected }: NodeProps) {
  const { label = 'Terminator', tags, role, locked } = (data as BaseNodeData) || {};
  const flowOrder = useFlowOrder(id);
  const isMuted = useIsNodeMuted(id);

  return (
    <div className={`relative transition-opacity duration-200 ${isMuted ? 'opacity-30 grayscale' : ''}`}>
      {/* Lock Indicator */}
      <LockIndicator locked={locked} />

      {/* Flow Order Badge */}
      <FlowOrderBadge order={flowOrder} />

      {/* Handles - Hybrid (can be input or output) */}
      <HybridHandle id="top" position={Position.Top} nodeId={id} nodeColor="red" />
      <HybridHandle id="bottom" position={Position.Bottom} nodeId={id} nodeColor="red" />
      <HybridHandle id="left" position={Position.Left} nodeId={id} nodeColor="red" />
      <div
        className={`
          flex items-center justify-center
          min-w-[120px] max-w-[180px]
          h-10
          rounded-full
          bg-rose-500 hover:bg-rose-600
          border-2 border-rose-700
          shadow-lg hover:shadow-xl
          transition-all duration-200
          cursor-pointer
          px-4
          ${selected ? 'ring-2 ring-rose-400 ring-offset-2' : ''}
          ${locked ? 'border-dashed opacity-80' : ''}
        `}
      >
        {/* Right Handle - Hybrid (can be input or output) */}
        <HybridHandle
          id="right"
          position={Position.Right}
          nodeId={id}
          nodeColor="red"
        />

        {/* Label */}
        <span
          className="text-white font-semibold text-sm text-wrap text-center"
          title={label}
        >
          {label}
        </span>
      </div>

      {/* Label below the node */}
      <div
        className="absolute pointer-events-none left-1/2 -translate-x-1/2"
        style={{ top: '100%', marginTop: '28px' }}
      >
        <span
          className="text-xs font-medium text-rose-800 bg-rose-100 px-2 py-0.5 rounded text-wrap block text-center max-w-[120px]"
          title={label}
        >
          {label}
        </span>
      </div>

      {/* Tags indicator below label */}
      <div
        className="absolute pointer-events-none left-1/2 -translate-x-1/2"
        style={{ top: '100%', marginTop: '52px' }}
      >
        <NodeTags tags={tags} />
      </div>

      {/* Role indicator above node */}
      {role && (
        <div
          className="absolute pointer-events-none left-1/2 -translate-x-1/2"
          style={{ bottom: '100%', marginBottom: '36px' }}
        >
          <NodeRole role={role} />
        </div>
      )}
    </div>
  );
}

export default memo(TerminatorNode);
