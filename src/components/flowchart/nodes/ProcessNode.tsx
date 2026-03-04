import { memo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import {
  FileText,
  ClipboardList,
  Briefcase,
  Users,
  CreditCard,
  Package,
  Clock,
} from 'lucide-react';
import type { ProcessNodeData, UnitType } from '../../../types/index';
import NodeTags from './NodeTags';
import NodeRole from './NodeRole';
import FlowOrderBadge from './FlowOrderBadge';
import { useFlowOrder } from '../../../contexts/FlowOrderContext';
import HybridHandle from './HybridHandle';
import LockIndicator from './LockIndicator';
import { useIsNodeMuted } from '../../../hooks/useNodeFilter';

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
 * ProcessNode - Blue rectangular node showing process details
 * Displays label, unit type icon, unit time, quantity, and calculated time
 */
function ProcessNode({ id, data, selected }: NodeProps) {
  const {
    label = 'Process',
    unitType = 'documents',
    customUnitName,
    unitTimeMinutes = 0,
    defaultQuantity = 1,
    tags,
    documents,
    data: nodeData,
    role,
    locked,
  } = (data as ProcessNodeData) || {};

  const UnitIcon = unitTypeIcons[unitType];
  const calculatedTime = unitTimeMinutes * defaultQuantity;
  const flowOrder = useFlowOrder(id);
  const isMuted = useIsNodeMuted(id);

  return (
    <div className={`relative transition-opacity duration-200 ${isMuted ? 'opacity-30 grayscale' : ''}`}>
      {/* Lock Indicator */}
      <LockIndicator locked={locked} />

      {/* Flow Order Badge */}
      <FlowOrderBadge order={flowOrder} />

      <div
        className={`
          flex flex-col gap-2
          min-w-[180px] max-w-[240px]
          bg-blue-500 hover:bg-blue-600
          rounded-lg
          border-2 border-blue-700
          shadow-lg hover:shadow-xl
          transition-all duration-200
          cursor-pointer
          p-3
          ${selected ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
          ${locked ? 'border-dashed opacity-80' : ''}
        `}
      >
        {/* Handles - Hybrid (can be input or output) */}
        <HybridHandle id="top" position={Position.Top} nodeId={id} nodeColor="blue" />
        <HybridHandle id="bottom" position={Position.Bottom} nodeId={id} nodeColor="blue" />
        <HybridHandle id="left" position={Position.Left} nodeId={id} nodeColor="blue" />

        {/* Node Label */}
        <div className="text-white font-semibold text-base text-wrap" title={label}>
          {label}
        </div>

        {/* Unit Type and Time Info */}
        <div className="flex items-center gap-2 text-blue-100 text-xs">
          <UnitIcon className="w-4 h-4 shrink-0" />
          <span className="truncate capitalize">
            {unitType === 'custom' ? (customUnitName || 'Custom') : unitType}
          </span>
        </div>

        {/* Unit Time */}
        <div className="flex items-center gap-2 text-blue-100 text-xs">
          <Clock className="w-4 h-4 shrink-0" />
          <span>{unitTimeMinutes} min/unit</span>
        </div>

        {/* Divider */}
        <div className="border-t border-blue-400 my-1" />

        {/* Quantity and Total Time */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-blue-200">Qty: {defaultQuantity}</span>
          <span className="bg-blue-700 px-2 py-0.5 rounded text-white font-medium">
            {formatTime(calculatedTime)}
          </span>
        </div>

        {/* Tags indicator */}
        <NodeTags tags={tags} className="justify-center" label="Tags" type="tags" />

        {/* Documents indicator */}
        <NodeTags tags={documents} className="justify-center" label="Documents" type="documents" />

        {/* Data indicator */}
        <NodeTags tags={nodeData} className="justify-center" label="Data" type="data" />

        <HybridHandle id="right" position={Position.Right} nodeId={id} nodeColor="blue" />
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

export default memo(ProcessNode);
