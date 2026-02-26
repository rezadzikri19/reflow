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
    <div className="relative" style={{ width: 100, height: 100 }}>
      {/* Target Handle - Left side for incoming connections */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-amber-300 !border-2 !border-amber-700 hover:!bg-amber-200"
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
          width: 60,
          height: 60,
          left: 20,
          top: 8,
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

      {/* Source Handle - Right side (Yes branch) */}
      <Handle
        type="source"
        position={Position.Right}
        id="yes"
        className="!w-3 !h-3 !bg-green-400 !border-2 !border-green-700 hover:!bg-green-300"
      />

      {/* Source Handle - Bottom (No branch) */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        className="!w-3 !h-3 !bg-red-400 !border-2 !border-red-700 hover:!bg-red-300"
      />

      {/* Yes Label - Right side */}
      <div
        className="absolute text-xs font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded"
        style={{ right: -8, top: 36 }}
      >
        Yes
      </div>

      {/* No Label - Bottom */}
      <div
        className="absolute text-xs font-bold text-red-700 bg-red-100 px-1.5 py-0.5 rounded"
        style={{ bottom: -8, left: '50%', transform: 'translateX(-50%)' }}
      >
        No
      </div>

      {/* Label below the diamond */}
      <div
        className="absolute whitespace-nowrap"
        style={{ bottom: -28, left: '50%', transform: 'translateX(-50%)' }}
      >
        <span
          className="text-xs font-medium text-amber-800 bg-amber-100 px-2 py-0.5 rounded truncate block text-center"
          title={label}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

export default memo(DecisionNode);
