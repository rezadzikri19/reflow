import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Hand } from 'lucide-react';
import type { ProcessNodeData } from '../../../types/index';
import NodeTags from './NodeTags';
import FlowOrderBadge from './FlowOrderBadge';
import { useFlowOrder } from '../../../contexts/FlowOrderContext';

/**
 * ManualProcessNode - Orange trapezoid-shaped node for manual operations
 * Represents a manual process step in standard flowchart notation
 * The trapezoid shape indicates human intervention is required
 */
function ManualProcessNode({ id, data, selected }: NodeProps) {
  const { label = 'Manual Process', tags } = (data as ProcessNodeData) || {};
  const flowOrder = useFlowOrder(id);

  return (
    <div className="relative">
      {/* Flow Order Badge */}
      <FlowOrderBadge order={flowOrder} />

      {/* Target Handle - Left side for incoming connections */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-orange-300 !border-2 !border-orange-700 hover:!bg-orange-200"
      />

      {/* Trapezoid shape using clip-path */}
      <div
        className={`
          flex items-center justify-center
          min-w-[140px] max-w-[200px]
          h-14
          bg-orange-500 hover:bg-orange-600
          border-2 border-orange-700
          shadow-lg hover:shadow-xl
          transition-all duration-200
          cursor-pointer
          px-4
          ${selected ? 'ring-2 ring-orange-400 ring-offset-2' : ''}
        `}
        style={{
          clipPath: 'polygon(0% 0%, 100% 0%, 88% 100%, 12% 100%)',
        }}
      >
        {/* Source Handle - Right side for outgoing connections */}
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-orange-300 !border-2 !border-orange-700 hover:!bg-orange-200"
        />

        {/* Content */}
        <div className="flex items-center gap-2">
          <Hand className="w-4 h-4 text-white shrink-0" />
          <span
            className="text-white font-semibold text-sm text-wrap text-center"
            title={label}
          >
            {label}
          </span>
        </div>
      </div>

      {/* Label below the node */}
      <div
        className="absolute pointer-events-none left-1/2 -translate-x-1/2 mt-1"
        style={{ top: '100%' }}
      >
        <span
          className="text-xs font-medium text-orange-800 bg-orange-100 px-2 py-0.5 rounded text-wrap block text-center max-w-[120px]"
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

export default memo(ManualProcessNode);
