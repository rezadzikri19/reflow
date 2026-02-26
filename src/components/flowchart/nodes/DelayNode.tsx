import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Timer, Clock } from 'lucide-react';
import type { BaseNodeData } from '../../../types/index';
import NodeTags from './NodeTags';

interface DelayNodeData extends BaseNodeData {
  /** Delay duration in minutes */
  unitTimeMinutes?: number;
  /** Optional reason for the delay */
  delayReason?: string;
}

/**
 * Formats delay time to a human-readable string
 */
function formatDelay(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  } else {
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }
}

/**
 * DelayNode - Gray node for wait times
 * Represents a delay or waiting period in the process
 */
function DelayNode({ data, selected }: NodeProps) {
  const {
    label = 'Delay',
    unitTimeMinutes = 0,
    delayReason,
    tags,
  } = (data as DelayNodeData) || {};

  return (
    <div
      className={`
        flex flex-col gap-2
        min-w-[140px] max-w-[200px]
        bg-gray-400 hover:bg-gray-500
        rounded-lg
        border-2 border-gray-600
        shadow-lg hover:shadow-xl
        transition-all duration-200
        cursor-pointer
        p-3
        ${selected ? 'ring-2 ring-gray-400 ring-offset-2' : ''}
      `}
    >
      {/* Target Handle - Left side for incoming connections */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-gray-200 !border-2 !border-gray-600 hover:!bg-gray-100"
      />

      {/* Header with timer icon */}
      <div className="flex items-center gap-2">
        <Timer className="w-5 h-5 text-gray-200 shrink-0" />
        <span className="text-white font-semibold text-sm truncate" title={label}>
          {label}
        </span>
      </div>

      {/* Delay duration display */}
      <div className="flex items-center justify-center gap-2 bg-gray-500 rounded px-3 py-2">
        <Clock className="w-4 h-4 text-gray-200" />
        <span className="text-white font-bold text-lg">
          {formatDelay(unitTimeMinutes)}
        </span>
      </div>

      {/* Delay reason (if provided) */}
      {delayReason && (
        <div className="border-t border-gray-500 pt-2 mt-1">
          <span
            className="text-gray-100 text-xs line-clamp-2 italic"
            title={delayReason}
          >
            "{delayReason}"
          </span>
        </div>
      )}

      {/* Visual delay indicator (animated dots) */}
      <div className="flex items-center justify-center gap-1">
        <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
        <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
        <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
      </div>

      {/* Tags indicator */}
      <NodeTags tags={tags} className="justify-center" />

      {/* Source Handle - Right side for outgoing connections */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-gray-200 !border-2 !border-gray-600 hover:!bg-gray-100"
      />
    </div>
  );
}

export default memo(DelayNode);
