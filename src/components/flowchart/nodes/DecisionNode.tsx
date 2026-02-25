import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { HelpCircle } from 'lucide-react';
import type { BaseNodeData } from '../../../types/index';

/**
 * DecisionNode - Amber diamond-shaped node with Yes/No branch labels
 * Used for conditional branching in the process flow
 */
function DecisionNode({ data, selected }: NodeProps<BaseNodeData>) {
  const { label = 'Decision' } = data || {};

  return (
    <div className="relative">
      {/* Target Handle - Left side for incoming connections */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-amber-300 !border-2 !border-amber-700 hover:!bg-amber-200"
        style={{ left: -8 }}
      />

      {/* Diamond Shape Container */}
      <div
        className={`
          relative
          w-20 h-20
          bg-amber-500 hover:bg-amber-600
          border-2 border-amber-700
          shadow-lg hover:shadow-xl
          transition-all duration-200
          cursor-pointer
          ${selected ? 'ring-2 ring-amber-400 ring-offset-2' : ''}
        `}
        style={{
          transform: 'rotate(45deg)',
          borderRadius: '4px',
        }}
      >
        {/* Content Container - Counter-rotate to keep content upright */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: 'rotate(-45deg)' }}
        >
          <HelpCircle className="w-6 h-6 text-white" />
        </div>
      </div>

      {/* Label below the diamond */}
      <div
        className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
        style={{ width: '120px', marginLeft: '-20px' }}
      >
        <span
          className="text-xs font-medium text-amber-800 bg-amber-100 px-2 py-0.5 rounded truncate block text-center"
          title={label}
        >
          {label}
        </span>
      </div>

      {/* Source Handle - Right side (Yes branch) */}
      <Handle
        type="source"
        position={Position.Right}
        id="yes"
        className="!w-3 !h-3 !bg-green-400 !border-2 !border-green-700 hover:!bg-green-300"
        style={{ right: -8 }}
      />

      {/* Source Handle - Bottom (No branch) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        className="!w-3 !h-3 !bg-red-400 !border-2 !border-red-700 hover:!bg-red-300"
        style={{ bottom: -24 }}
      />

      {/* Branch Labels */}
      <div
        className="absolute text-xs font-bold text-green-700"
        style={{ right: -32, top: '50%', transform: 'translateY(-50%)' }}
      >
        Yes
      </div>
      <div
        className="absolute text-xs font-bold text-red-700"
        style={{ bottom: -40, left: '50%', transform: 'translateX(-50%)' }}
      >
        No
      </div>
    </div>
  );
}

export default memo(DecisionNode);
