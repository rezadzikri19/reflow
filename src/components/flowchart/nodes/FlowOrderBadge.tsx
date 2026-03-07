import { memo } from 'react';

/**
 * FlowOrderBadge - A small circular badge displaying the node's order in the flow
 * Positioned at the top-right corner of nodes
 * Supports hierarchical numbering (e.g., "2.3.5")
 */
interface FlowOrderBadgeProps {
  /** The flow order number (can be simple like "5" or hierarchical like "2.3.5") */
  order: number | string;
  /** Additional CSS classes */
  className?: string;
}

function FlowOrderBadge({ order, className = '' }: FlowOrderBadgeProps) {
  const orderString = String(order);
  const isHierarchical = orderString.includes('.');

  return (
    <div
      className={`
        absolute -top-2 -right-2 z-20
        w-6 h-6
        ${isHierarchical ? 'min-w-[24px] px-1 w-auto' : ''}
        bg-white
        border-2 border-slate-400
        rounded-full
        flex items-center justify-center
        text-xs font-bold
        text-slate-700
        shadow-sm
        ${className}
      `}
      title={isHierarchical ? `Flow order: ${orderString}` : undefined}
    >
      {orderString}
    </div>
  );
}

export default memo(FlowOrderBadge);
