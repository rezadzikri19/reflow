import { memo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import type { BaseNodeData } from '../../../types/index';
import NodeTags from './NodeTags';
import NodeRole from './NodeRole';
import NodeSystems from './NodeSystems';
import FlowOrderBadge from './FlowOrderBadge';
import { useHierarchicalFlowOrder } from '../../../contexts/FlowOrderContext';
import HybridHandle from './HybridHandle';
import LockIndicator from './LockIndicator';
import { useIsNodeMuted } from '../../../hooks/useNodeFilter';
import { getNodeColorForHandle, getNodeColorStyles } from '../../../utils/nodeColors';

/**
 * TerminatorNode - Rose elongated circle (stadium/pill shape) node
 * Represents a terminator point in standard flowchart notation
 * Used to indicate entry/exit points, or the start/end of a process
 * Different from Start/End nodes - terminators are for entry/exit points within a flow
 */
function TerminatorNode({ id, data, selected }: NodeProps) {
  const { label = 'Terminator', tags, role, locked, systems, color } = (data as BaseNodeData) || {};
  const flowOrder = useHierarchicalFlowOrder(id);
  const isMuted = useIsNodeMuted(id);

  // Get color styles based on custom color or default
  const colorStyles = getNodeColorStyles(color, 'terminator');
  const handleColor = getNodeColorForHandle(color, 'terminator');

  return (
    <div className={`relative transition-opacity duration-200 ${isMuted ? 'opacity-30 grayscale' : ''}`}>
      {/* Lock Indicator */}
      <LockIndicator locked={locked} />

      {/* Flow Order Badge */}
      <FlowOrderBadge order={flowOrder} />

      {/* Handles - Hybrid (can be input or output) */}
      <HybridHandle id="top" position={Position.Top} nodeId={id} nodeColor={handleColor} />
      <HybridHandle id="bottom" position={Position.Bottom} nodeId={id} nodeColor={handleColor} />
      <HybridHandle id="left" position={Position.Left} nodeId={id} nodeColor={handleColor} />
      <div
        className={`
          flex items-center justify-center
          min-w-[120px] max-w-[180px]
          h-10
          rounded-full
          shadow-lg hover:shadow-xl
          transition-all duration-200
          cursor-pointer
          px-4
          ${selected ? 'ring-2 ring-offset-2' : ''}
          ${locked ? 'border-dashed opacity-80' : ''}
          ${!color ? 'bg-rose-500 hover:bg-rose-600 border-2 border-rose-700' : 'border-2'}
          ${!color && selected ? 'ring-rose-400' : ''}
        `}
        style={color ? {
          backgroundColor: colorStyles.customBg,
          borderColor: colorStyles.customBorder,
        } : undefined}
      >
        {/* Right Handle - Hybrid (can be input or output) */}
        <HybridHandle
          id="right"
          position={Position.Right}
          nodeId={id}
          nodeColor={handleColor}
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
          className={`text-sm font-medium px-2.5 py-1 rounded-full whitespace-nowrap shadow-sm ${!color ? `${colorStyles.badgeBg} ${colorStyles.badgeText}` : ''}`}
          style={color ? {
            backgroundColor: colorStyles.customBadge,
            color: colorStyles.customBadgeText,
          } : undefined}
          title={label}
        >
          {label}
        </span>
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

      {/* Systems indicator below label */}
      {systems && systems.length > 0 && (
        <div
          className="absolute pointer-events-none left-1/2 -translate-x-1/2"
          style={{ top: '100%', marginTop: '60px' }}
        >
          <NodeSystems systems={systems} />
        </div>
      )}

      {/* Tags indicator below systems */}
      <div
        className="absolute pointer-events-none left-1/2 -translate-x-1/2"
        style={{ top: '100%', marginTop: '104px' }}
      >
        <NodeTags tags={tags} />
      </div>
    </div>
  );
}

export default memo(TerminatorNode);
