import { memo, useCallback, useMemo, useState } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import {
  Layers,
  ExternalLink,
  ArrowLeft,
  ArrowRight,
  Info,
  Type,
  FileText,
  Package,
  Clock,
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
import type { ProcessNodeData, Port } from '../../../types/index';
import FlowOrderBadge from './FlowOrderBadge';
import { useHierarchicalFlowOrder } from '../../../contexts/FlowOrderContext';
import { useFlowchartStore } from '../../../stores/flowchartStore';
import HybridHandle from './HybridHandle';
import LockIndicator from './LockIndicator';
import { useIsNodeMuted } from '../../../hooks/useNodeFilter';
import { useTagColors } from '../../../hooks/useTagColors';
import { useRoleColors } from '../../../hooks/useRoleColors';
import NodeRole from './NodeRole';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate port position as percentage from top
 * Distributes ports evenly along the edge
 */
const getPortPosition = (index: number, total: number): string => {
  if (total === 1) return '50%';
  return `${((index + 1) / (total + 1)) * 100}%`;
};

/**
 * Calculate horizontal port position for top/bottom ports
 * Distributes ports evenly along the horizontal edge
 */
const getHorizontalPortPosition = (index: number, total: number): string => {
  if (total === 1) return '50%';
  return `${((index + 1) / (total + 1)) * 100}%`;
};

/**
 * Extended port info for rendering
 */
interface PortRenderInfo {
  id: string;
  internalNodeId: string;
  internalHandleId?: string | null;
  direction: 'input' | 'output';
  label?: string;
  handlePosition?: 'top' | 'bottom' | 'left' | 'right';
}

// =============================================================================
// SubprocessNode Component
// =============================================================================

function SubprocessNode({ data, selected, id }: NodeProps) {
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const {
    label = 'Subprocess',
    description,
    tags,
    childNodeIds = [],
    inputPorts = [],
    outputPorts = [],
    locked,
    documents,
    data: nodeData,
    systems,
    role,
    frequency,
    painPoints,
    improvement,
    risk,
    unitType = 'documents',
    customUnitName,
    unitTimeMinutes = 0,
    defaultQuantity = 1,
  } = (data as ProcessNodeData) || {};
  const openSubprocessSheet = useFlowchartStore((state) => state.openSubprocessSheet);
  const edges = useFlowchartStore((state) => state.edges);
  const nodeVersion = useFlowchartStore((state) => state.nodeVersion);
  const flowOrder = useHierarchicalFlowOrder(id);
  const isMuted = useIsNodeMuted(id);
  const { getTagColor } = useTagColors();
  const { getRoleColor } = useRoleColors();

  // Normalize role to array for backward compatibility
  const normalizedRoles: string[] = Array.isArray(role)
    ? role
    : role
      ? [role]
      : [];

  // Get child count from childNodeIds array directly
  const childCount = childNodeIds.length;

  // Compute input/output ports from edges AND stored ports
  const { inputPorts: computedInputPorts, outputPorts: computedOutputPorts } = useMemo(() => {
    const inputs: PortRenderInfo[] = [];
    const outputs: PortRenderInfo[] = [];

    // Create maps of stored ports by ID for quick lookup
    const storedInputPortsMap = new Map((inputPorts as Port[]).map(p => [p.id, p]));
    const storedOutputPortsMap = new Map((outputPorts as Port[]).map(p => [p.id, p]));

    // First, add edge-based ports
    edges.forEach((edge) => {
      // Incoming edge (external -> subprocess) - this is an input port
      // Check for both originalTarget (single connection) and originalTargets (multiple connections)
      if (edge.target === id && (edge.originalTarget || edge.originalTargets)) {
        // Get the targetHandle which contains the port ID (e.g., "port-in-{uuid}")
        const portId = edge.targetHandle || `port-in-${edge.source}`;

        // If we have multiple internal targets, use the first one for the port display
        const internalTargets = edge.originalTargets || [
          { nodeId: edge.originalTarget!, handleId: edge.originalTargetHandle }
        ];

        // Check if there's a stored port with this ID
        const storedPort = storedInputPortsMap.get(portId);

        inputs.push({
          id: portId,
          internalNodeId: internalTargets[0].nodeId,
          internalHandleId: internalTargets[0].handleId,
          direction: 'input',
          handlePosition: storedPort?.handlePosition,
        });
      }

      // Outgoing edge (subprocess -> external) - this is an output port
      // Check for both originalSource (single connection) and originalSources (multiple connections)
      if (edge.source === id && (edge.originalSource || edge.originalSources)) {
        // Get the sourceHandle which contains the port ID (e.g., "port-out-{uuid}")
        const portId = edge.sourceHandle || `port-out-${edge.target}`;

        // If we have multiple internal sources, use the first one for the port display
        const internalSources = edge.originalSources || [
          { nodeId: edge.originalSource!, handleId: edge.originalSourceHandle }
        ];

        // Check if there's a stored port with this ID
        const storedPort = storedOutputPortsMap.get(portId);

        outputs.push({
          id: portId,
          internalNodeId: internalSources[0].nodeId,
          internalHandleId: internalSources[0].handleId,
          direction: 'output',
          handlePosition: storedPort?.handlePosition,
        });
      }
    });

    // Then, add stored ports (avoiding duplicates)
    const existingInputIds = new Set(inputs.map(p => p.id));
    const existingOutputIds = new Set(outputs.map(p => p.id));

    // Add stored input ports
    (inputPorts as Port[]).forEach((port) => {
      if (!existingInputIds.has(port.id)) {
        inputs.push({
          id: port.id,
          internalNodeId: port.internalConnections?.[0]?.nodeId || '',
          internalHandleId: port.internalConnections?.[0]?.handleId || null,
          direction: 'input',
          label: port.label,
          handlePosition: port.handlePosition,
        });
      }
    });

    // Add stored output ports
    (outputPorts as Port[]).forEach((port) => {
      if (!existingOutputIds.has(port.id)) {
        outputs.push({
          id: port.id,
          internalNodeId: port.internalConnections?.[0]?.nodeId || '',
          internalHandleId: port.internalConnections?.[0]?.handleId || null,
          direction: 'output',
          label: port.label,
          handlePosition: port.handlePosition,
        });
      }
    });

    return { inputPorts: inputs, outputPorts: outputs };
  }, [edges, id, inputPorts, outputPorts, nodeVersion]);

  // Handle opening the subprocess sheet
  const handleOpenSheet = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    openSubprocessSheet(id);
  }, [id, openSubprocessSheet]);

  return (
    <div
      className={`
        relative
        min-w-[180px] max-w-[240px]
        bg-purple-500 hover:bg-purple-600
        rounded-lg
        border-2 border-purple-700
        shadow-lg hover:shadow-xl
        transition-all duration-200
        cursor-pointer
        p-3
        ${selected ? 'ring-2 ring-purple-400 ring-offset-2' : ''}
        ${locked ? 'border-dashed opacity-80' : ''}
        ${isMuted ? 'opacity-30 grayscale' : ''}
      `}
    >
      {/* Lock Indicator */}
      <LockIndicator locked={locked} />

      {/* Flow Order Badge */}
      <FlowOrderBadge order={flowOrder} />

      {/* Dynamic Input Handles - positioned based on handlePosition */}
      {/* Only render handles when there are actual ports */}
      {/* Using HybridHandle with forceType="target" for input ports */}
      {computedInputPorts.map((port, _index, arr) => {
        // Get the position from the port or default to left for inputs
        const handlePosition = port.handlePosition || 'left';
        // Count ports in the same position for proper spacing
        const portsInSamePosition = arr.filter(p => (p.handlePosition || 'left') === handlePosition);
        const indexInPosition = portsInSamePosition.findIndex(p => p.id === port.id);

        let position: Position;
        let style: React.CSSProperties;

        if (handlePosition === 'top') {
          position = Position.Top;
          style = { left: getHorizontalPortPosition(indexInPosition, portsInSamePosition.length) };
        } else if (handlePosition === 'bottom') {
          position = Position.Bottom;
          style = { left: getHorizontalPortPosition(indexInPosition, portsInSamePosition.length) };
        } else if (handlePosition === 'right') {
          position = Position.Right;
          style = { top: getPortPosition(indexInPosition, portsInSamePosition.length) };
        } else {
          // Default to left
          position = Position.Left;
          style = { top: getPortPosition(indexInPosition, portsInSamePosition.length) };
        }

        return (
          <HybridHandle
            key={port.id}
            position={position}
            id={port.id}
            nodeId={id}
            nodeColor="purple"
            forceType="target"
            style={style}
          />
        );
      })}

      {/* Dynamic Output Handles - positioned based on handlePosition */}
      {/* Only render handles when there are actual ports */}
      {/* Using HybridHandle with forceType="source" for output ports */}
      {computedOutputPorts.map((port, _index, arr) => {
        // Get the position from the port or default to right for outputs
        const handlePosition = port.handlePosition || 'right';
        // Count ports in the same position for proper spacing
        const portsInSamePosition = arr.filter(p => (p.handlePosition || 'right') === handlePosition);
        const indexInPosition = portsInSamePosition.findIndex(p => p.id === port.id);

        let position: Position;
        let style: React.CSSProperties;

        if (handlePosition === 'top') {
          position = Position.Top;
          style = { left: getHorizontalPortPosition(indexInPosition, portsInSamePosition.length) };
        } else if (handlePosition === 'bottom') {
          position = Position.Bottom;
          style = { left: getHorizontalPortPosition(indexInPosition, portsInSamePosition.length) };
        } else if (handlePosition === 'left') {
          position = Position.Left;
          style = { top: getPortPosition(indexInPosition, portsInSamePosition.length) };
        } else {
          // Default to right
          position = Position.Right;
          style = { top: getPortPosition(indexInPosition, portsInSamePosition.length) };
        }

        return (
          <HybridHandle
            key={port.id}
            position={position}
            id={port.id}
            nodeId={id}
            nodeColor="purple"
            forceType="source"
            style={style}
          />
        );
      })}

      {/* Content container */}
      <div className="flex flex-col gap-2">
        {/* Header with icon and label */}
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-200 shrink-0" />
          <span className="text-white font-semibold text-base text-wrap flex-1" title={label}>
            {label}
          </span>
        </div>

        {/* Child count and port indicators */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5">
              <div className="w-1 h-4 bg-purple-300 rounded-sm" />
              <div className="w-1 h-4 bg-purple-400 rounded-sm" />
              <div className="w-1 h-4 bg-purple-300 rounded-sm" />
            </div>
            <span className="text-purple-100 text-xs">
              {childCount} node{childCount !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Port count indicators */}
          {(computedInputPorts.length > 0 || computedOutputPorts.length > 0) && (
            <div className="flex items-center gap-2 text-xs text-purple-100">
              {computedInputPorts.length > 0 && (
                <div className="flex items-center gap-0.5" title={`${computedInputPorts.length} input${computedInputPorts.length !== 1 ? 's' : ''}`}>
                  <ArrowLeft className="w-3 h-3" />
                  <span>{computedInputPorts.length}</span>
                </div>
              )}
              {computedOutputPorts.length > 0 && (
                <div className="flex items-center gap-0.5" title={`${computedOutputPorts.length} output${computedOutputPorts.length !== 1 ? 's' : ''}`}>
                  <ArrowRight className="w-3 h-3" />
                  <span>{computedOutputPorts.length}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end">
          <button
            onClick={handleOpenSheet}
            className="flex items-center gap-1 text-purple-200 text-xs hover:text-white transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open</span>
          </button>
        </div>
      </div>

      {/* Info Icon with Toggle Popup */}
      <div className="absolute -bottom-1 -left-1 z-30">
        <div
          className={`bg-white rounded-full p-0.5 shadow-md hover:shadow-lg transition-shadow cursor-pointer ${isInfoOpen ? 'ring-2 ring-purple-400' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setIsInfoOpen(!isInfoOpen);
          }}
        >
          <Info className={`w-3.5 h-3.5 text-purple-600 ${isInfoOpen ? 'text-purple-800' : ''}`} />
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

            {/* Child Nodes */}
            <div className="mb-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                <Layers className="w-3.5 h-3.5" />
                Child Nodes
              </div>
              <div className="text-sm text-gray-700">{childCount} node{childCount !== 1 ? 's' : ''}</div>
            </div>

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
            {normalizedRoles.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  <User className="w-3.5 h-3.5" />
                  Role
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {normalizedRoles.map((r) => {
                    const color = getRoleColor(r);
                    return (
                      <span
                        key={r}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded-full ${color.bg} ${color.text}`}
                      >
                        <User className="w-3.5 h-3.5" />
                        {r}
                      </span>
                    );
                  })}
                </div>
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

      {/* Role indicator above node */}
      {normalizedRoles.length > 0 && (
        <div className="absolute pointer-events-none left-1/2 -translate-x-1/2" style={{ bottom: '100%', marginBottom: '36px' }}>
          <NodeRole role={normalizedRoles} />
        </div>
      )}
    </div>
  );
}

export default memo(SubprocessNode);
