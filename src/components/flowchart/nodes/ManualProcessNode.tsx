import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Hand, Clock } from 'lucide-react';
import type { ProcessNodeData, UnitType } from '../../../types/index';
import NodeTags from './NodeTags';
import FlowOrderBadge from './FlowOrderBadge';
import { useFlowOrder } from '../../../contexts/FlowOrderContext';

/**
 * Formats time in minutes to a human-readable string
 */
function formatTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes.toFixed(1)}m`;
  } else if (minutes < 480) {
    const hours = minutes / 60;
    return `${hours.toFixed(1)}h`;
  } else {
    const days = minutes / 480;
    return `${days.toFixed(1)}d`;
  }
}

/**
 * ManualProcessNode - Orange trapezoid-shaped node for manual operations
 * Represents a manual process step in standard flowchart notation
 * The trapezoid shape indicates human intervention is required
 */
function ManualProcessNode({ id, data, selected }: NodeProps) {
  const {
    label = 'Manual Process',
    unitType = 'documents',
    customUnitName,
    unitTimeMinutes = 0,
    defaultQuantity = 1,
    tags,
  } = (data as ProcessNodeData) || {};

  const calculatedTime = unitTimeMinutes * defaultQuantity;
  const flowOrder = useFlowOrder(id);

  return (
    <div className={`relative transition-all duration-200 ${selected ? 'ring-2 ring-orange-400 ring-offset-2 rounded-lg' : ''}`}>
      {/* Flow Order Badge */}
      <FlowOrderBadge order={flowOrder} />

      {/* Target Handle - Left side for incoming connections */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-orange-300 !border-2 !border-orange-700 hover:!bg-orange-200"
      />

      {/* Source Handle - Right side for outgoing connections */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-orange-300 !border-2 !border-orange-700 hover:!bg-orange-200"
      />

      {/* Trapezoid shape using clip-path */}
      <div
        className={`
          flex flex-col gap-2
          min-w-[180px] max-w-[240px]
          bg-orange-500 hover:bg-orange-600
          border-2 border-orange-700
          shadow-lg hover:shadow-xl
          transition-all duration-200
          cursor-pointer
          px-8 py-3
        `}
        style={{
          clipPath: 'polygon(0% 0%, 100% 0%, 88% 100%, 12% 100%)',
        }}
      >
        {/* Node Label */}
        <div className="text-white font-semibold text-base text-wrap" title={label}>
          {label}
        </div>

        {/* Manual indicator with unit type */}
        <div className="flex items-center gap-2 text-orange-100 text-xs">
          <Hand className="w-4 h-4 shrink-0" />
          <span className="truncate capitalize">
            {unitType === 'custom' ? (customUnitName || 'Custom') : unitType}
          </span>
        </div>

        {/* Unit Time */}
        <div className="flex items-center gap-2 text-orange-100 text-xs">
          <Clock className="w-4 h-4 shrink-0" />
          <span>{unitTimeMinutes} min/unit</span>
        </div>

        {/* Divider */}
        <div className="border-t border-orange-400 my-1" />

        {/* Quantity and Total Time */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-orange-200">Qty: {defaultQuantity}</span>
          <span className="bg-orange-700 px-2 py-0.5 rounded text-white font-medium">
            {formatTime(calculatedTime)}
          </span>
        </div>

        {/* Tags indicator */}
        <NodeTags tags={tags} className="justify-center" />
      </div>
    </div>
  );
}

export default memo(ManualProcessNode);
