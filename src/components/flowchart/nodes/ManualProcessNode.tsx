import { memo, useState, useRef, useEffect, useCallback } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import {
  Clock,
  FileText,
  ClipboardList,
  Briefcase,
  Users,
  CreditCard,
  Package,
} from 'lucide-react';
import type { ProcessNodeData, UnitType } from '../../../types/index';
import NodeTags from './NodeTags';
import NodeRole from './NodeRole';
import FlowOrderBadge from './FlowOrderBadge';
import { useFlowOrder } from '../../../contexts/FlowOrderContext';
import HybridHandle from './HybridHandle';
import LockIndicator from './LockIndicator';

/**
 * Maps unit types to their corresponding icons
 */
const unitTypeIcons: Record<UnitType, React.ComponentType<{ className?: string }>> = {
  documents: FileText,
  applications: ClipboardList,
  cases: Briefcase,
  customers: Users,
  transactions: CreditCard,
  custom: Package,
};

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
 * Generates SVG path for inverted trapezoid with rounded corners
 * Top is wider, bottom is narrower (standard manual process symbol)
 */
function getTrapezoidPath(width: number, height: number, cornerRadius = 10, strokeWidth = 2) {
  const inset = strokeWidth / 2;
  const bottomInset = width * 0.03; // 3% inset on each side for bottom (wider bottom)
  const r = Math.min(cornerRadius, height / 4, width / 8);

  // Ensure we don't have negative values
  const safeBottomInset = Math.min(bottomInset, (width - 2 * r) / 2 - inset);

  return `
    M ${inset + r} ${inset}
    L ${width - inset - r} ${inset}
    Q ${width - inset} ${inset} ${width - inset} ${inset + r}
    L ${width - inset - safeBottomInset} ${height - inset - r}
    Q ${width - inset - safeBottomInset} ${height - inset} ${width - inset - safeBottomInset - r} ${height - inset}
    L ${inset + safeBottomInset + r} ${height - inset}
    Q ${inset + safeBottomInset} ${height - inset} ${inset + safeBottomInset} ${height - inset - r}
    L ${inset} ${inset + r}
    Q ${inset} ${inset} ${inset + r} ${inset}
    Z
  `;
}

/**
 * ManualProcessNode - Orange trapezoid-shaped node for manual operations
 * Represents a manual process step in standard flowchart notation
 * The trapezoid shape indicates human intervention is required
 */
function ManualProcessNode({ id, data, selected }: NodeProps) {
  const [isHovered, setIsHovered] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const [svgPath, setSvgPath] = useState('');
  const [height, setHeight] = useState(120);

  const {
    label = 'Manual Process',
    unitType = 'documents',
    customUnitName,
    unitTimeMinutes = 0,
    defaultQuantity = 1,
    tags,
    role,
    locked,
  } = (data as ProcessNodeData) || {};

  const UnitIcon = unitTypeIcons[unitType];
  const calculatedTime = unitTimeMinutes * defaultQuantity;
  const flowOrder = useFlowOrder(id);

  const fillColor = isHovered ? '#ea580c' : '#f97316';
  const strokeColor = '#c2410c';

  // Fixed width to match ProcessNode
  const width = 180; // Same as ProcessNode typical width

  // Update SVG path based on content height
  const updateSvgPath = useCallback((contentHeight: number) => {
    const totalHeight = contentHeight + 25;
    setHeight(totalHeight);
    setSvgPath(getTrapezoidPath(width, totalHeight));
  }, [width]);

  // Use ResizeObserver to track content height changes
  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { height: contentHeight } = entry.contentRect;
        if (contentHeight > 0) {
          updateSvgPath(contentHeight);
        }
      }
    });

    resizeObserver.observe(content);

    // Initial measurement
    const { offsetHeight } = content;
    if (offsetHeight > 0) {
      updateSvgPath(offsetHeight);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [updateSvgPath, label, unitType, customUnitName, unitTimeMinutes, defaultQuantity, tags, role]);

  return (
    <div className="relative">
      <div
        className={`
          relative transition-all duration-200
          ${selected ? 'ring-2 ring-orange-400 ring-offset-2 rounded-xl' : ''}
          ${locked ? 'opacity-80' : ''}
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ width, height }}
      >
        {/* Lock Indicator */}
        <LockIndicator locked={locked} />

        {/* Flow Order Badge */}
        <FlowOrderBadge order={flowOrder} />

        {/* SVG Background - positioned absolutely behind content */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          style={{
            filter: 'drop-shadow(0 10px 15px -3px rgb(0 0 0 / 0.1))',
            transition: 'filter 200ms',
          }}
        >
          <path
            d={svgPath}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={2}
            strokeDasharray={locked ? '6,3' : 'none'}
            style={{ transition: 'fill 200ms' }}
          />
        </svg>

        {/* Handles - Hybrid (can be input or output) */}
        <HybridHandle id="top" position={Position.Top} nodeId={id} nodeColor="orange" zIndex={20} />
        <HybridHandle id="bottom" position={Position.Bottom} nodeId={id} nodeColor="orange" zIndex={20} />
        <HybridHandle id="left" position={Position.Left} nodeId={id} nodeColor="orange" zIndex={20} />
        <HybridHandle id="right" position={Position.Right} nodeId={id} nodeColor="orange" zIndex={20} />

        {/* Content - positioned over the SVG */}
        <div
          ref={contentRef}
          className="
            relative z-10
            flex flex-col gap-2
            cursor-pointer
            px-5 pt-3 pb-5
          "
          style={{ width }}
        >
          {/* Node Label */}
          <div className="text-white font-semibold text-base text-wrap" title={label}>
            {label}
          </div>

          {/* Unit Type */}
          <div className="flex items-center gap-2 text-orange-100 text-xs">
            <UnitIcon className="w-4 h-4 shrink-0" />
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

      {/* Role indicator below node */}
      {role && (
        <div className="absolute pointer-events-none left-1/2 -translate-x-1/2" style={{ top: '100%', marginTop: '36px' }}>
          <NodeRole role={role} />
        </div>
      )}
    </div>
  );
}

export default memo(ManualProcessNode);
