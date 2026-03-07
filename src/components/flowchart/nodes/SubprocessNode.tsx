import { memo, useCallback, useMemo } from 'react';
import { Position, type NodeProps } from '@xyflow/react';
import { Layers, ExternalLink, ArrowLeft, ArrowRight } from 'lucide-react';
import type { ProcessNodeData, Port } from '../../../types/index';
import NodeTags from './NodeTags';
import FlowOrderBadge from './FlowOrderBadge';
import { useFlowOrder } from '../../../contexts/FlowOrderContext';
import { useFlowchartStore } from '../../../stores/flowchartStore';
import HybridHandle from './HybridHandle';
import LockIndicator from './LockIndicator';
import { useIsNodeMuted } from '../../../hooks/useNodeFilter';

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
 * Extended port info for rendering
 */
interface PortRenderInfo {
  id: string;
  internalNodeId: string;
  internalHandleId?: string | null;
  direction: 'input' | 'output';
  label?: string;
}

// =============================================================================
// SubprocessNode Component
// =============================================================================

function SubprocessNode({ data, selected, id }: NodeProps) {
  const { label = 'Subprocess', description, tags, childNodeIds = [], inputPorts = [], outputPorts = [], locked } = (data as ProcessNodeData) || {};
  const openSubprocessSheet = useFlowchartStore((state) => state.openSubprocessSheet);
  const edges = useFlowchartStore((state) => state.edges);
  const nodeVersion = useFlowchartStore((state) => state.nodeVersion);
  const flowOrder = useFlowOrder(id);
  const isMuted = useIsNodeMuted(id);

  // Get child count from childNodeIds array directly
  const childCount = childNodeIds.length;

  // Compute input/output ports from edges AND stored ports
  const { inputPorts: computedInputPorts, outputPorts: computedOutputPorts } = useMemo(() => {
    const inputs: PortRenderInfo[] = [];
    const outputs: PortRenderInfo[] = [];

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

        inputs.push({
          id: portId,
          internalNodeId: internalTargets[0].nodeId,
          internalHandleId: internalTargets[0].handleId,
          direction: 'input',
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

        outputs.push({
          id: portId,
          internalNodeId: internalSources[0].nodeId,
          internalHandleId: internalSources[0].handleId,
          direction: 'output',
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

      {/* Dynamic Input Handles - Left side for incoming connections */}
      {/* Only render handles when there are actual ports */}
      {/* Using HybridHandle with forceType="target" for input ports */}
      {computedInputPorts.map((port, index) => (
        <HybridHandle
          key={port.id}
          position={Position.Left}
          id={port.id}
          nodeId={id}
          nodeColor="purple"
          forceType="target"
          style={{ top: getPortPosition(index, computedInputPorts.length) }}
        />
      ))}

      {/* Dynamic Output Handles - Right side for outgoing connections */}
      {/* Only render handles when there are actual ports */}
      {/* Using HybridHandle with forceType="source" for output ports */}
      {computedOutputPorts.map((port, index) => (
        <HybridHandle
          key={port.id}
          position={Position.Right}
          id={port.id}
          nodeId={id}
          nodeColor="purple"
          forceType="source"
          style={{ top: getPortPosition(index, computedOutputPorts.length) }}
        />
      ))}

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

        {/* Description (if provided) */}
        {description && (
          <div className="border-t border-purple-400 pt-2 mt-1">
            <span
              className="text-purple-100 text-xs line-clamp-2"
              title={description}
            >
              {description}
            </span>
          </div>
        )}

        {/* Open button */}
        <div className="flex items-center justify-end">
          <button
            onClick={handleOpenSheet}
            className="flex items-center gap-1 text-purple-200 text-xs hover:text-white transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open</span>
          </button>
        </div>

        {/* Tags indicator */}
        <NodeTags tags={tags} className="justify-center" />
      </div>
    </div>
  );
}

export default memo(SubprocessNode);
