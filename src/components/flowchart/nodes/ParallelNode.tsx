import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { GitBranch, ArrowRight } from 'lucide-react';
import type { BaseNodeData, ProcessNodeData } from '../../../types/index';

interface ParallelNodeData extends BaseNodeData, Partial<ProcessNodeData> {
  /** Whether this is a fork (split) or join (merge) point */
  parallelType?: 'fork' | 'join';
}

/**
 * ParallelNode - Cyan node for fork/join operations
 * Used to represent parallel processing paths in the flowchart
 */
function ParallelNode({ data, selected }: NodeProps<ParallelNodeData>) {
  const {
    label = 'Parallel',
    parallelType = 'fork',
    parallelCapacity = 2,
  } = data || {};

  const isFork = parallelType === 'fork';

  return (
    <div
      className={`
        flex flex-col gap-2
        min-w-[140px] max-w-[200px]
        bg-cyan-500 hover:bg-cyan-600
        rounded-lg
        border-2 border-cyan-700
        shadow-lg hover:shadow-xl
        transition-all duration-200
        cursor-pointer
        p-3
        ${selected ? 'ring-2 ring-cyan-400 ring-offset-2' : ''}
      `}
    >
      {/* Fork: Target Handle on Left */}
      {isFork && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-cyan-300 !border-2 !border-cyan-700 hover:!bg-cyan-200"
        />
      )}

      {/* Join: Multiple Target Handles on Left (for multiple incoming paths) */}
      {!isFork && (
        <>
          <Handle
            type="target"
            position={Position.Left}
            id="top"
            className="!w-3 !h-3 !bg-cyan-300 !border-2 !border-cyan-700 hover:!bg-cyan-200"
            style={{ top: '25%' }}
          />
          <Handle
            type="target"
            position={Position.Left}
            id="bottom"
            className="!w-3 !h-3 !bg-cyan-300 !border-2 !border-cyan-700 hover:!bg-cyan-200"
            style={{ top: '75%' }}
          />
        </>
      )}

      {/* Header with icon and type */}
      <div className="flex items-center gap-2">
        <GitBranch
          className={`w-5 h-5 text-cyan-200 shrink-0 ${isFork ? '' : 'rotate-180'}`}
        />
        <span className="text-white font-semibold text-sm truncate" title={label}>
          {label}
        </span>
      </div>

      {/* Type indicator */}
      <div className="flex items-center justify-center gap-2 bg-cyan-600 rounded px-2 py-1">
        <ArrowRight className={`w-4 h-4 text-cyan-100 ${isFork ? '' : 'rotate-180'}`} />
        <span className="text-cyan-50 text-xs font-medium uppercase">
          {isFork ? 'Fork' : 'Join'}
        </span>
        <ArrowRight className={`w-4 h-4 text-cyan-100 ${isFork ? '' : 'rotate-180'}`} />
      </div>

      {/* Parallel capacity indicator */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-cyan-200">Paths:</span>
        <div className="flex gap-1">
          {Array.from({ length: Math.min(parallelCapacity, 4) }).map((_, i) => (
            <div
              key={i}
              className="w-2 h-4 bg-cyan-300 rounded-sm"
            />
          ))}
          {parallelCapacity > 4 && (
            <span className="text-cyan-200 ml-1">+{parallelCapacity - 4}</span>
          )}
        </div>
      </div>

      {/* Fork: Multiple Source Handles on Right (for multiple outgoing paths) */}
      {isFork && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="top"
            className="!w-3 !h-3 !bg-cyan-300 !border-2 !border-cyan-700 hover:!bg-cyan-200"
            style={{ top: '25%' }}
          />
          <Handle
            type="source"
            position={Position.Right}
            id="bottom"
            className="!w-3 !h-3 !bg-cyan-300 !border-2 !border-cyan-700 hover:!bg-cyan-200"
            style={{ top: '75%' }}
          />
        </>
      )}

      {/* Join: Single Source Handle on Right */}
      {!isFork && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-cyan-300 !border-2 !border-cyan-700 hover:!bg-cyan-200"
        />
      )}
    </div>
  );
}

export default memo(ParallelNode);
