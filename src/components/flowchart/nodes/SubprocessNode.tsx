import { memo, useCallback, useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Layers, ExternalLink, ArrowLeft, ArrowRight } from 'lucide-react';
import type { ProcessNodeData, ManualPort } from '../../../types/index';
import NodeTags from './NodeTags';
import FlowOrderBadge from './FlowOrderBadge';
import { useFlowOrder } from '../../../contexts/FlowOrderContext';
import { useFlowchartStore } from '../../../stores/flowchartStore';

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
 * Extended port info for rendering (includes manual port flag)
 */
interface PortRenderInfo {
  id: string;
  internalNodeId: string;
  internalHandleId?: string | null;
  direction: 'input' | 'output';
  isManual: boolean;
  label?: string;
}

// =============================================================================
// SubprocessNode Component
// =============================================================================

function SubprocessNode({ data, selected, id }: NodeProps) {
  const { label = 'Subprocess', description, tags, childNodeIds = [], manualInputPorts = [], manualOutputPorts = [] } = (data as ProcessNodeData) || {};
  const openSubprocessSheet = useFlowchartStore((state) => state.openSubprocessSheet);
  const edges = useFlowchartStore((state) => state.edges);
  const nodeVersion = useFlowchartStore((state) => state.nodeVersion);
  const flowOrder = useFlowOrder(id);

  // Get child count from childNodeIds array directly
  const childCount = childNodeIds.length;

  // Compute input/output ports from edges AND manual ports
  const { inputPorts, outputPorts } = useMemo(() => {
    const inputs: PortRenderInfo[] = [];
    const outputs: PortRenderInfo[] = [];

    // First, add edge-based ports
    edges.forEach((edge) => {
      // Incoming edge (external -> subprocess) - this is an input port
      // Check for both originalTarget (single connection) and originalTargets (multiple connections)
      if (edge.target === id && (edge.originalTarget || edge.originalTargets)) {
        // Get the targetHandle which contains the port ID (e.g., "input-{externalSourceId}")
        const portId = edge.targetHandle || `input-${edge.source}`;

        // If we have multiple internal targets, use the first one for the port display
        const internalTargets = edge.originalTargets || [
          { nodeId: edge.originalTarget!, handleId: edge.originalTargetHandle }
        ];

        inputs.push({
          id: portId,
          internalNodeId: internalTargets[0].nodeId,
          internalHandleId: internalTargets[0].handleId,
          direction: 'input',
          isManual: false,
        });
      }

      // Outgoing edge (subprocess -> external) - this is an output port
      // Check for both originalSource (single connection) and originalSources (multiple connections)
      if (edge.source === id && (edge.originalSource || edge.originalSources)) {
        // Get the sourceHandle which contains the port ID (e.g., "output-{externalTargetId}")
        const portId = edge.sourceHandle || `output-${edge.target}`;

        // If we have multiple internal sources, use the first one for the port display
        const internalSources = edge.originalSources || [
          { nodeId: edge.originalSource!, handleId: edge.originalSourceHandle }
        ];

        outputs.push({
          id: portId,
          internalNodeId: internalSources[0].nodeId,
          internalHandleId: internalSources[0].handleId,
          direction: 'output',
          isManual: false,
        });
      }
    });

    // Then, add manual ports (avoiding duplicates if a manual port has the same ID as an edge port)
    const existingInputIds = new Set(inputs.map(p => p.id));
    const existingOutputIds = new Set(outputs.map(p => p.id));

    // Add manual input ports
    (manualInputPorts as ManualPort[]).forEach((port) => {
      if (!existingInputIds.has(port.id)) {
        inputs.push({
          id: port.id,
          internalNodeId: '', // Manual ports don't have a specific internal node until connected
          internalHandleId: null,
          direction: 'input',
          isManual: true,
          label: port.label,
        });
      }
    });

    // Add manual output ports
    (manualOutputPorts as ManualPort[]).forEach((port) => {
      if (!existingOutputIds.has(port.id)) {
        outputs.push({
          id: port.id,
          internalNodeId: '', // Manual ports don't have a specific internal node until connected
          internalHandleId: null,
          direction: 'output',
          isManual: true,
          label: port.label,
        });
      }
    });

    return { inputPorts: inputs, outputPorts: outputs };
  }, [edges, id, manualInputPorts, manualOutputPorts, nodeVersion]);

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
      `}
    >
      {/* Flow Order Badge */}
      <FlowOrderBadge order={flowOrder} />

      {/* Dynamic Input Handles - Left side for incoming connections */}
      {/* Only render handles when there are actual ports (manual or edge-based) */}
      {inputPorts.map((port, index) => (
        <Handle
          key={port.id}
          type="target"
          position={Position.Left}
          id={port.id}
          style={{ top: getPortPosition(index, inputPorts.length) }}
          className="!w-3 !h-3 !bg-green-400 !border-2 !border-green-600 hover:!bg-green-300"
          title={port.label}
        />
      ))}

      {/* Dynamic Output Handles - Right side for outgoing connections */}
      {/* Only render handles when there are actual ports (manual or edge-based) */}
      {outputPorts.map((port, index) => (
        <Handle
          key={port.id}
          type="source"
          position={Position.Right}
          id={port.id}
          style={{ top: getPortPosition(index, outputPorts.length) }}
          className="!w-3 !h-3 !bg-blue-400 !border-2 !border-blue-600 hover:!bg-blue-300"
          title={port.label}
        />
      ))}

      {/* Content container */}
      <div className="flex flex-col gap-2">
        {/* Header with icon and label */}
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-200 shrink-0" />
          <span className="text-white font-semibold text-sm truncate flex-1" title={label}>
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
          {(inputPorts.length > 0 || outputPorts.length > 0) && (
            <div className="flex items-center gap-2 text-xs text-purple-100">
              {inputPorts.length > 0 && (
                <div className="flex items-center gap-0.5" title={`${inputPorts.length} input${inputPorts.length !== 1 ? 's' : ''}`}>
                  <ArrowLeft className="w-3 h-3" />
                  <span>{inputPorts.length}</span>
                </div>
              )}
              {outputPorts.length > 0 && (
                <div className="flex items-center gap-0.5" title={`${outputPorts.length} output${outputPorts.length !== 1 ? 's' : ''}`}>
                  <ArrowRight className="w-3 h-3" />
                  <span>{outputPorts.length}</span>
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
