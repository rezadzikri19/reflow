import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { HelpCircle } from 'lucide-react';
import type { BaseNodeData } from '../../../types/index';
import NodeTags from './NodeTags';
import FlowOrderBadge from './FlowOrderBadge';
import { useFlowOrder } from '../../../contexts/FlowOrderContext';

/**
 * DecisionNode - Amber diamond-shaped node with Yes/No branch labels
 * Used for conditional branching in the process flow
 */
function DecisionNode({ id, data, selected }: NodeProps) {
  const { label = 'Decision', tags } = (data as BaseNodeData) || {};
  const flowOrder = useFlowOrder(id);

  // Diamond dimensions
  const diamondSize = 60;
  const halfDiagonal = (diamondSize * Math.sqrt(2)) / 2; // ~42.4px

  // Container size needs to fit the rotated diamond
  const containerSize = Math.ceil(halfDiagonal * 2) + 20; // ~105px

  // Diamond center position within container
  const centerOffset = containerSize / 2;

  return (
    <div className="relative" style={{ width: containerSize, height: containerSize }}>
      {/* Flow Order Badge */}
      <FlowOrderBadge order={flowOrder} />
      {/* Target Handle - Left corner of diamond */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!w-3 !h-3 !bg-amber-300 !border-2 !border-amber-700 hover:!bg-amber-200"
        style={{ left: 0, top: centerOffset, transform: 'translate(-50%, -50%)' }}
      />

      {/* Diamond Shape Container */}
      <div
        className={`
          absolute
          bg-amber-500 hover:bg-amber-600
          border-2 border-amber-700
          shadow-lg hover:shadow-xl
          transition-all duration-200
          cursor-pointer
          ${selected ? 'ring-2 ring-amber-400 ring-offset-2' : ''}
        `}
        style={{
          width: diamondSize,
          height: diamondSize,
          left: centerOffset - diamondSize / 2,
          top: centerOffset - diamondSize / 2,
          transform: 'rotate(45deg)',
          borderRadius: '4px',
        }}
      >
        {/* Content Container - Counter-rotate to keep content upright */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: 'rotate(-45deg)' }}
        >
          <HelpCircle className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Source Handle - Right corner (Yes branch) */}
      <Handle
        type="source"
        position={Position.Right}
        id="yes"
        className="!w-3 !h-3 !bg-green-400 !border-2 !border-green-700 hover:!bg-green-300"
        style={{ right: 0, top: centerOffset, transform: 'translate(50%, -50%)' }}
      />

      {/* Source Handle - Bottom corner (No branch) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        className="!w-3 !h-3 !bg-red-400 !border-2 !border-red-700 hover:!bg-red-300"
        style={{ bottom: 0, left: centerOffset, transform: 'translate(-50%, 50%)' }}
      />

      {/* Yes Label - Right side, positioned away from handle */}
      <div
        className="absolute text-xs font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded pointer-events-none"
        style={{ right: -32, top: centerOffset - 8 }}
      >
        Yes
      </div>

      {/* No Label - Bottom, positioned away from handle */}
      <div
        className="absolute text-xs font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded pointer-events-none"
        style={{ bottom: -32, left: centerOffset - 10 }}
      >
        No
      </div>

      {/* Label below the diamond */}
      <div
        className="absolute whitespace-nowrap pointer-events-none"
        style={{ bottom: -48, left: centerOffset, transform: 'translateX(-50%)' }}
      >
        <span
          className="text-xs font-medium text-amber-800 bg-amber-100 px-2 py-0.5 rounded truncate block text-center"
          title={label}
        >
          {label}
        </span>
      </div>

      {/* Tags indicator below label */}
      <div
        className="absolute pointer-events-none"
        style={{ bottom: -64, left: centerOffset, transform: 'translateX(-50%)' }}
      >
        <NodeTags tags={tags} />
      </div>
    </div>
  );
}

export default memo(DecisionNode);
