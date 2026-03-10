import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Play } from 'lucide-react';
import type { BaseNodeData } from '../../../types/index';
import NodeTags from './NodeTags';
import NodeRole from './NodeRole';
import NodeSystems from './NodeSystems';
import FlowOrderBadge from './FlowOrderBadge';
import { useHierarchicalFlowOrder } from '../../../contexts/FlowOrderContext';
import LockIndicator from './LockIndicator';
import { useIsNodeMuted } from '../../../hooks/useNodeFilter';

/**
 * StartNode - Green circular start node with play icon
 * This node represents the starting point of a process flowchart
 */
function StartNode({ id, data, selected }: NodeProps) {
  const { label = 'Start', tags, role, locked, systems } = (data as BaseNodeData) || {};
  const flowOrder = useHierarchicalFlowOrder(id);
  const isMuted = useIsNodeMuted(id);

  return (
    <div className={`relative transition-opacity duration-200 ${isMuted ? 'opacity-30 grayscale' : ''}`}>
      {/* Lock Indicator */}
      <LockIndicator locked={locked} />

      {/* Flow Order Badge */}
      <FlowOrderBadge order={flowOrder} />

      <div
        className={`
          flex items-center justify-center
          w-14 h-14 rounded-full
          bg-emerald-500 hover:bg-emerald-600
          border-2 border-emerald-700
          shadow-lg hover:shadow-xl
          transition-all duration-200
          cursor-pointer
          ${selected ? 'ring-2 ring-emerald-400 ring-offset-2' : ''}
          ${locked ? 'border-dashed opacity-80' : ''}
        `}
      >
        {/* Source Handles - All sides for outgoing connections */}
        <Handle
          type="source"
          id="top"
          position={Position.Top}
          className="!w-3 !h-3 !bg-emerald-300 !border-2 !border-emerald-700 hover:!bg-emerald-200"
        />
        <Handle
          type="source"
          id="bottom"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-emerald-300 !border-2 !border-emerald-700 hover:!bg-emerald-200"
        />
        <Handle
          type="source"
          id="left"
          position={Position.Left}
          className="!w-3 !h-3 !bg-emerald-300 !border-2 !border-emerald-700 hover:!bg-emerald-200"
        />
        <Handle
          type="source"
          id="right"
          position={Position.Right}
          className="!w-3 !h-3 !bg-emerald-300 !border-2 !border-emerald-700 hover:!bg-emerald-200"
        />

        {/* Play Icon */}
        <Play className="w-6 h-6 text-white fill-white" />
      </div>

      {/* Label below the node */}
      <div
        className="absolute pointer-events-none left-1/2 -translate-x-1/2"
        style={{ top: '100%', marginTop: '28px' }}
      >
        <span
          className="text-xs font-medium text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded whitespace-nowrap"
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

export default memo(StartNode);
