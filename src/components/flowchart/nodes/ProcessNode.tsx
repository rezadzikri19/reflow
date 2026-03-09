import { memo, useState } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import {
  FileText,
  ClipboardList,
  Briefcase,
  Users,
  CreditCard,
  Package,
  Clock,
  Info,
  Type,
  Hash,
  Repeat,
  AlertTriangle,
  TrendingUp,
  User,
  Database,
  Tag,
  Shield,
  ShieldAlert,
} from 'lucide-react';
import type { ProcessNodeData, UnitType } from '../../../types/index';
import NodeRole from './NodeRole';
import FlowOrderBadge from './FlowOrderBadge';
import { useHierarchicalFlowOrder } from '../../../contexts/FlowOrderContext';
import HybridHandle from './HybridHandle';
import LockIndicator from './LockIndicator';
import { useIsNodeMuted } from '../../../hooks/useNodeFilter';
import { useTagColors } from '../../../hooks/useTagColors';
import { useRoleColors } from '../../../hooks/useRoleColors';

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
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const { getTagColor } = useTagColors();
  const { getRoleColor } = useRoleColors();

  const {
    label = 'Process',
    description,
    unitType = 'documents',
    customUnitName,
    unitTimeMinutes = 0,
    defaultQuantity = 1,
    tags,
    documents,
    data: nodeData,
    systems,
    role,
    locked,
    frequency,
    painPoints,
    improvement,
    risk,
  } = (data as ProcessNodeData) || {};

  const UnitIcon = unitTypeIcons[unitType];
  const calculatedTime = unitTimeMinutes * defaultQuantity;
  const flowOrder = useHierarchicalFlowOrder(id);
  const isMuted = useIsNodeMuted(id);

  return (
    <div className={`relative transition-opacity duration-200 ${isMuted ? 'opacity-30 grayscale' : ''}`}>
      {/* Lock Indicator */}
      <LockIndicator locked={locked} />

      {/* Flow Order Badge */}
      <FlowOrderBadge order={flowOrder} />

      {/* Info Icon with Toggle Popup */}
      <div className="absolute -bottom-1 -left-1 z-30">
        <div
          className={`bg-white rounded-full p-0.5 shadow-md hover:shadow-lg transition-shadow cursor-pointer ${isInfoOpen ? 'ring-2 ring-blue-400' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setIsInfoOpen(!isInfoOpen);
          }}
        >
          <Info className={`w-3.5 h-3.5 text-blue-600 ${isInfoOpen ? 'text-blue-800' : ''}`} />
        </div>

        {/* Info Popup */}
        {isInfoOpen && (
          <div
            className={`
              absolute z-50 top-full mt-2 left-0
              min-w-[320px] max-w-[400px]
              bg-white rounded-lg shadow-xl border border-gray-200
              p-4
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Label */}
            <div className="mb-3 pb-2 border-b border-gray-100">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                <Type className="w-3.5 h-3.5" />
                Label
              </div>
              <div className="text-sm font-medium text-gray-900">{label}</div>
            </div>

            {/* Description */}
            {description && (
              <div className="mb-3 pb-2 border-b border-gray-100">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  <FileText className="w-3.5 h-3.5" />
                  Description
                </div>
                <div className="text-sm text-gray-700">{description}</div>
              </div>
            )}

            {/* Unit Type */}
            <div className="mb-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                <Package className="w-3.5 h-3.5" />
                Unit Type
              </div>
              <div className="text-sm text-gray-700 capitalize">
                {unitType === 'custom' ? (customUnitName || 'Custom') : unitType}
              </div>
            </div>

            {/* Unit Time */}
            <div className="mb-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                <Clock className="w-3.5 h-3.5" />
                Unit Time
              </div>
              <div className="text-sm text-gray-700">{unitTimeMinutes} minutes</div>
            </div>

            {/* Default Quantity */}
            <div className="mb-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                <Hash className="w-3.5 h-3.5" />
                Default Quantity
              </div>
              <div className="text-sm text-gray-700">{defaultQuantity}</div>
            </div>

            {/* Frequency */}
            {frequency && (
              <div className="mb-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  <Repeat className="w-3.5 h-3.5" />
                  Frequency
                </div>
                <div className="text-sm text-gray-700 capitalize">{frequency}</div>
              </div>
            )}

            {/* Pain Points */}
            {painPoints && (
              <div className="mb-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Pain Points
                </div>
                <div className="text-sm text-gray-700">{painPoints}</div>
              </div>
            )}

            {/* Improvement */}
            {improvement && (
              <div className="mb-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Improvement
                </div>
                <div className="text-sm text-gray-700">{improvement}</div>
              </div>
            )}

            {/* Risk */}
            {risk && (
              <div className="mb-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Risk
                </div>
                <div className="text-sm text-gray-700">{risk}</div>
              </div>
            )}

            {/* Role */}
            {role && (
              <div className="mb-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  <User className="w-3.5 h-3.5" />
                  Role
                </div>
                {(() => {
                  const color = getRoleColor(role);
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded-full ${color.bg} ${color.text}`}>
                      <User className="w-3.5 h-3.5" />
                      {role}
                    </span>
                  );
                })()}
              </div>
            )}

            {/* Documents */}
            {documents && documents.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  <FileText className="w-3.5 h-3.5" />
                  Documents
                </div>
                <div className="flex flex-wrap gap-1">
                  {documents.map((doc) => {
                    const color = getTagColor(doc);
                    return (
                      <span key={doc} className={`text-xs px-2 py-0.5 rounded-full font-medium ${color.bg} ${color.text}`}>
                        {doc}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Data */}
            {nodeData && nodeData.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  <Database className="w-3.5 h-3.5" />
                  Data
                </div>
                <div className="flex flex-wrap gap-1">
                  {nodeData.map((item) => {
                    const color = getTagColor(item);
                    return (
                      <span key={item} className={`text-xs px-2 py-0.5 rounded-full font-medium ${color.bg} ${color.text}`}>
                        {item}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Systems */}
            {systems && systems.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  <Shield className="w-3.5 h-3.5" />
                  Systems
                </div>
                <div className="flex flex-wrap gap-1">
                  {systems.map((item) => {
                    const color = getTagColor(item);
                    return (
                      <span key={item} className={`text-xs px-2 py-0.5 rounded-full font-medium ${color.bg} ${color.text}`}>
                        {item}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tags */}
            {tags && tags.length > 0 && (
              <div>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  <Tag className="w-3.5 h-3.5" />
                  Tags
                </div>
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => {
                    const color = getTagColor(tag);
                    return (
                      <span key={tag} className={`text-xs px-2 py-0.5 rounded-full font-medium ${color.bg} ${color.text}`}>
                        {tag}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Arrow pointer */}
            <div
              className={`
                absolute top-0 left-2 -translate-y-1/2 w-2 h-2 bg-white border-gray-200
                border-l border-t rotate-45
              `}
            />
          </div>
        )}
      </div>

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

        <HybridHandle id="right" position={Position.Right} nodeId={id} nodeColor="blue" />
      </div>

      {/* Role indicator above node */}
      {role && (
        <div className="absolute pointer-events-none left-1/2 -translate-x-1/2" style={{ bottom: '100%', marginBottom: '36px' }}>
          <NodeRole role={role} />
        </div>
      )}
    </div>
  );
}

export default memo(ProcessNode);
