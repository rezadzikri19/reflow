import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { CircleDot } from 'lucide-react';
import type { BaseNodeData } from '../../../types/index';

/**
 * ConnectorNode - Teal circular node for connecting flowchart sections
 * Small circular node used to connect different parts of a flowchart,
 * typically used when a flow continues on another page or section.
 * Excluded from flow order numbering like junction nodes.
 */
function ConnectorNode({ data, selected }: NodeProps) {
  const { label = 'A' } = (data as BaseNodeData) || {};

  return (
    <div className="relative">

      {/* Target Handle - Left side for incoming connections */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-teal-300 !border-2 !border-teal-700 hover:!bg-teal-200"
      />

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
        `}
      >
        {/* Source Handle - Right side for outgoing connections */}
        <Handle
          type="source"
          position={Position.Right}
          className="!w-2 !h-2 !bg-teal-300 !border-2 !border-teal-700 hover:!bg-teal-200"
        />

        {/* Connector symbol */}
        <CircleDot className="text-white w-5 h-5" title={label} />
      </div>

      {/* Label below the node */}
      <div
        className="absolute pointer-events-none left-1/2 -translate-x-1/2 mt-1"
        style={{ top: '100%' }}
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
