import { memo, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Hand, Clock } from 'lucide-react';
import type { ProcessNodeData } from '../../../types/index';
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
 * RoundedTrapezoid - SVG inverted trapezoid shape with rounded corners
 * Top is wider, bottom is narrower (like standard manual process symbol)
 */
function RoundedTrapezoid({
  width,
  height,
  fill,
  stroke,
  strokeWidth = 2,
  cornerRadius = 8,
}: {
  width: number;
  height: number;
  fill: string;
  stroke: string;
  strokeWidth?: number;
  cornerRadius?: number;
}) {
  const inset = strokeWidth / 2;
  const bottomInset = width * 0.12; // 12% inset on each side for bottom
  const r = cornerRadius;

  // Path for inverted rounded trapezoid (wider at top, narrower at bottom)
  const path = `
    M ${inset + r} ${inset}
    L ${width - inset - r} ${inset}
    Q ${width - inset} ${inset} ${width - inset} ${inset + r}
    L ${width - inset - bottomInset + r * 0.3} ${height - inset - r}
    Q ${width - inset - bottomInset} ${height - inset} ${width - inset - bottomInset - r} ${height - inset}
    L ${inset + bottomInset + r} ${height - inset}
    Q ${inset + bottomInset} ${height - inset} ${inset + bottomInset - r * 0.3} ${height - inset - r}
    L ${inset} ${inset + r}
    Q ${inset} ${inset} ${inset + r} ${inset}
    Z
  `;

  return (
    <path
      d={path}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
}

/**
 * ManualProcessNode - Orange trapezoid-shaped node for manual operations
 * Represents a manual process step in standard flowchart notation
 * The trapezoid shape indicates human intervention is required
 */
function ManualProcessNode({ id, data, selected }: NodeProps) {
  const [isHovered, setIsHovered] = useState(false);

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

  const fillColor = isHovered ? '#ea580c' : '#f97316';
  const strokeColor = '#c2410c';

  return (
    <div
      className={`
        relative transition-all duration-200
        ${selected ? 'ring-2 ring-orange-400 ring-offset-2 rounded-xl' : ''}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
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

      {/* SVG Trapezoid with rounded corners */}
      <svg
        width="200"
        viewBox="0 0 200 130"
        className="block"
        style={{
          minWidth: '160px',
          maxWidth: '220px',
          filter: 'drop-shadow(0 10px 15px -3px rgb(0 0 0 / 0.1))',
          transition: 'filter 200ms',
        }}
      >
        <RoundedTrapezoid
          width={200}
          height={130}
          fill={fillColor}
          stroke={strokeColor}
        />
      </svg>

      {/* Content overlay - positioned over the SVG */}
      <div
        className="
          absolute inset-0
          flex flex-col gap-1
          min-w-[160px] max-w-[220px]
          cursor-pointer
          px-8 pt-4 pb-2
        "
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
