import { memo } from 'react';

/**
 * FlowOrderBadge - A small circular badge displaying the node's order in the flow
 * Positioned at the top-right corner of nodes
 */
interface FlowOrderBadgeProps {
  /** The flow order number (1-based index) */
  order: number;
  /** Optional additional class names */
  className?: string;
}

function FlowOrderBadge({ order, className = '' }: FlowOrderBadgeProps) {
  if (order <= 0) {
    return null;
  }

  return (
    <div
      className={`
        absolute -top-2 -right-2
        w-6 h-6 min-w-[24px]
        bg-white
        border-2 border-slate-400
        rounded-full
        flex items-center justify-center
        text-xs font-bold
        text-slate-700
        shadow-sm
        pointer-events-none
        z-10
        ${className}
      `}
      title={`Step ${order}`}
    >
      {order}
    </div>
  );
}

export default memo(FlowOrderBadge);
