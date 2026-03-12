import { memo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { CircleDot } from 'lucide-react';
import type { BaseNodeData } from '../../../types/index';
import HybridHandle from './HybridHandle';
import LockIndicator from './LockIndicator';
import { useIsNodeMuted } from '../../../hooks/useNodeFilter';
import { getNodeColorForHandle, getNodeColorStyles } from '../../../utils/nodeColors';

/**
 * ConnectorNode - Teal circular node for connecting flowchart sections
 * Small circular node used to connect different parts of a flowchart,
 * typically used when a flow continues on another page or section.
 * Excluded from flow order numbering like junction nodes.
 */
function ConnectorNode({ id, data, selected }: NodeProps) {
  const { label = 'A', locked, color } = (data as BaseNodeData) || {};
  const isMuted = useIsNodeMuted(id);

  // Get color styles based on custom color or default
  const colorStyles = getNodeColorStyles(color, 'connector');
  const handleColor = getNodeColorForHandle(color, 'connector');

  return (
    <div className={`relative transition-opacity duration-200 ${isMuted ? 'opacity-30 grayscale' : ''}`}>
      {/* Lock Indicator */}
      <LockIndicator locked={locked} />

      {/* Handles - Hybrid (can be input or output) */}
      <HybridHandle id="top" position={Position.Top} nodeId={id} nodeColor={handleColor} />
      <HybridHandle id="bottom" position={Position.Bottom} nodeId={id} nodeColor={handleColor} />
      <HybridHandle id="left" position={Position.Left} nodeId={id} nodeColor={handleColor} />

      {/* Circle shape */}
      <div
        className={`
          flex items-center justify-center
          w-10 h-10 rounded-full
          shadow-md hover:shadow-lg
          transition-all duration-200
          cursor-pointer
          ${selected ? 'ring-2 ring-offset-2' : ''}
          ${locked ? 'border-dashed opacity-80' : ''}
          ${!color ? 'bg-teal-500 hover:bg-teal-600 border-2 border-teal-700' : 'border-2'}
          ${!color && selected ? 'ring-teal-400' : ''}
        `}
        style={color ? {
          backgroundColor: colorStyles.customBg,
          borderColor: colorStyles.customBorder,
        } : undefined}
      >
        <HybridHandle id="right" position={Position.Right} nodeId={id} nodeColor={handleColor} />

        {/* Connector symbol */}
        <CircleDot className={`w-5 h-5 ${!color ? 'text-white' : ''}`} style={color ? { color: colorStyles.customText } : undefined} />
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
    </div>
  );
}

export default memo(ConnectorNode);
