import { memo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import type { BaseNodeData, ProcessNodeData } from '../../../types/index';
import NodeTags from './NodeTags';
import NodeRole from './NodeRole';
import NodeSystems from './NodeSystems';
import { useHierarchicalFlowOrder } from '../../../contexts/FlowOrderContext';
import { useNodes } from '../../../stores/flowchartStore';
import HybridHandle from './HybridHandle';
import LockIndicator from './LockIndicator';
import { useIsNodeMuted } from '../../../hooks/useNodeFilter';
import { getNodeColorForHandle, getNodeColorStyles } from '../../../utils/nodeColors';

/**
 * ReferenceNode - Sky blue circular node that displays the flow order of a referenced node
 * Used to reference another node's flow order, helping avoid visual clutter from long
 * connection lines and preventing back-and-forth connections in complex flows.
 * The label is automatically synced with the referenced node's label.
 */
function ReferenceNode({ id, data, selected }: NodeProps) {
  const { tags, referencedNodeId, locked, color } = (data as BaseNodeData & { referencedNodeId?: string }) || {};
  const nodes = useNodes();

  // Get the referenced node
  const referencedNode = nodes.find(n => n.id === referencedNodeId);
  // Color is synced from the referenced node
  const referencedColor = referencedNode ? (referencedNode.data as ProcessNodeData).color : undefined;

  // Get color styles based on referenced node's color or default (sky for reference)
  const colorStyles = getNodeColorStyles(referencedColor, 'reference');
  const handleColor = getNodeColorForHandle(referencedColor, 'reference');

  // Label is always the referenced node's label (auto-synced)
  const label = referencedNode ? (referencedNode.data as ProcessNodeData).label || 'Reference' : 'Reference';
  // Role is synced from the referenced node
  const role = referencedNode ? (referencedNode.data as ProcessNodeData).role : undefined;
  // Systems is synced from the referenced node
  const systems = referencedNode ? (referencedNode.data as ProcessNodeData).systems : undefined;

  // Get the flow order of the referenced node (not this node)
  const referencedFlowOrder = useHierarchicalFlowOrder(referencedNodeId || '');
  const isMuted = useIsNodeMuted(id);

  return (
    <div className={`relative transition-opacity duration-200 ${isMuted ? 'opacity-30 grayscale' : ''}`}>
      {/* Lock Indicator */}
      <LockIndicator locked={locked} />

      {/* Handles - Hybrid (can be input or output) */}
      <HybridHandle id="top" position={Position.Top} nodeId={id} nodeColor={handleColor} />
      <HybridHandle id="bottom" position={Position.Bottom} nodeId={id} nodeColor={handleColor} />
      <HybridHandle id="left" position={Position.Left} nodeId={id} nodeColor={handleColor} />

      <div
        className={`
          flex items-center justify-center
          w-12 h-12 rounded-full
          shadow-lg hover:shadow-xl
          transition-all duration-200
          cursor-pointer
          ${selected ? 'ring-2 ring-offset-2' : ''}
          ${locked ? 'border-dashed opacity-80' : ''}
          ${!referencedColor ? 'bg-sky-500 hover:bg-sky-600 border-2 border-sky-700' : 'border-2'}
          ${!referencedColor && selected ? 'ring-sky-400' : ''}
        `}
        style={referencedColor ? {
          backgroundColor: colorStyles.customBg,
          borderColor: colorStyles.customBorder,
        } : undefined}
      >
        <HybridHandle id="right" position={Position.Right} nodeId={id} nodeColor={handleColor} />

        {/* Referenced node's flow order number */}
        <span className={`font-bold text-lg ${!referencedColor ? 'text-white' : ''}`} style={referencedColor ? { color: colorStyles.customText } : undefined}>
          {referencedFlowOrder || '?'}
        </span>
      </div>

      {/* Label below the node */}
      <div
        className="absolute pointer-events-none left-1/2 -translate-x-1/2"
        style={{ top: '100%', marginTop: '28px' }}
      >
        <span
          className={`text-sm font-medium px-2.5 py-1 rounded-full whitespace-nowrap shadow-sm ${!referencedColor ? `${colorStyles.badgeBg} ${colorStyles.badgeText}` : ''}`}
          style={referencedColor ? {
            backgroundColor: colorStyles.customBadge,
            color: colorStyles.customBadgeText,
          } : undefined}
          title={label}
        >
          {label}
        </span>
      </div>

      {/* Role indicator above node (synced from referenced node) */}
      {role && (
        <div
          className="absolute pointer-events-none left-1/2 -translate-x-1/2"
          style={{ bottom: '100%', marginBottom: '36px' }}
        >
          <NodeRole role={role} />
        </div>
      )}

      {/* Systems indicator below label (synced from referenced node) */}
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

export default memo(ReferenceNode);
