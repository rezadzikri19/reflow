import { memo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { CircleDot } from 'lucide-react';
import type { BaseNodeData } from '../../../types/index';
import HybridHandle from './HybridHandle';
import LockIndicator from './LockIndicator';
import { useIsNodeMuted } from '../../../hooks/useNodeFilter';

/**
 * ConnectorNode - Teal circular node for connecting flowchart sections
 * Small circular node used to connect different parts of a flowchart,
 * typically used when a flow continues on another page or section.
 * Excluded from flow order numbering like junction nodes.
 */
function ConnectorNode({ id, data, selected }: NodeProps) {
  const { label = 'A', locked } = (data as BaseNodeData) || {};
  const isMuted = useIsNodeMuted(id);

  return (
    <div className={`relative transition-opacity duration-200 ${isMuted ? 'opacity-30 grayscale' : ''}`}>
      {/* Lock Indicator */}
      <LockIndicator locked={locked} />

      {/* Handles - Hybrid (can be input or output) */}
      <HybridHandle id="top" position={Position.Top} nodeId={id} nodeColor="green" />
      <HybridHandle id="bottom" position={Position.Bottom} nodeId={id} nodeColor="green" />
      <HybridHandle id="left" position={Position.Left} nodeId={id} nodeColor="green" />

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
          ${locked ? 'border-dashed opacity-80' : ''}
        `}
      >
        <HybridHandle id="right" position={Position.Right} nodeId={id} nodeColor="green" />

        {/* Connector symbol */}
        <CircleDot className="text-white w-5 h-5" />
      </div>

      {/* Label below the node */}
      <div
        className="absolute pointer-events-none left-1/2 -translate-x-1/2"
        style={{ top: '100%', marginTop: '28px' }}
      >
        <span
          className="text-xs font-medium text-teal-800 bg-teal-100 px-1.5 py-0.5 rounded text-wrap block text-center max-w-[80px]"
          title={label}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

export default memo(ConnectorNode);
