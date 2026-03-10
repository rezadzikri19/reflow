import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Square } from 'lucide-react';
import type { BaseNodeData } from '../../../types/index';
import NodeTags from './NodeTags';
import NodeRole from './NodeRole';
import NodeSystems from './NodeSystems';
import FlowOrderBadge from './FlowOrderBadge';
import { useHierarchicalFlowOrder } from '../../../contexts/FlowOrderContext';
import LockIndicator from './LockIndicator';
import { useIsNodeMuted } from '../../../hooks/useNodeFilter';

/**
 * EndNode - Red circular end node with stop icon
 * This node represents the ending point of a process flowchart
 */
function EndNode({ id, data, selected }: NodeProps) {
  const { label = 'End', tags, role, locked, systems } = (data as BaseNodeData) || {};
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
          bg-red-500 hover:bg-red-600
          border-2 border-red-700
          shadow-lg hover:shadow-xl
          transition-all duration-200
          cursor-pointer
          ${selected ? 'ring-2 ring-red-400 ring-offset-2' : ''}
          ${locked ? 'border-dashed opacity-80' : ''}
        `}
      >
        {/* Target Handles - All sides for incoming connections */}
        <Handle
          type="target"
          id="top"
          position={Position.Top}
          className="!w-3 !h-3 !bg-red-300 !border-2 !border-red-700 hover:!bg-red-200"
        />
        <Handle
          type="target"
          id="bottom"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-red-300 !border-2 !border-red-700 hover:!bg-red-200"
        />
        <Handle
          type="target"
          id="left"
          position={Position.Left}
          className="!w-3 !h-3 !bg-red-300 !border-2 !border-red-700 hover:!bg-red-200"
        />
        <Handle
          type="target"
          id="right"
          position={Position.Right}
          className="!w-3 !h-3 !bg-red-300 !border-2 !border-red-700 hover:!bg-red-200"
        />

        {/* Stop Icon */}
        <Square className="w-6 h-6 text-white" />
      </div>

      {/* Label below the node */}
      <div
        className="absolute pointer-events-none left-1/2 -translate-x-1/2"
        style={{ top: '100%', marginTop: '28px' }}
      >
        <span
          className="text-xs font-medium text-red-800 bg-red-100 px-2 py-0.5 rounded whitespace-nowrap"
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

export default memo(EndNode);
