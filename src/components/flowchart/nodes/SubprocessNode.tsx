import { memo, useCallback, useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Layers, ExternalLink, ArrowLeft, ArrowRight } from 'lucide-react';
import type { ProcessNodeData, SubprocessPort } from '../../../types/index';
import NodeTags from './NodeTags';
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

// =============================================================================
// SubprocessNode Component
// =============================================================================

function SubprocessNode({ data, selected, id }: NodeProps) {
  const { label = 'Subprocess', description, tags, childNodeIds = [] } = (data as ProcessNodeData) || {};
  const openSubprocessSheet = useFlowchartStore((state) => state.openSubprocessSheet);
  const edges = useFlowchartStore((state) => state.edges);

  // Get child count from childNodeIds array directly
  const childCount = childNodeIds.length;

  // Compute input/output ports from edges
  const { inputPorts, outputPorts } = useMemo(() => {
    const inputs: SubprocessPort[] = [];
    const outputs: SubprocessPort[] = [];

    edges.forEach((edge) => {
      // Incoming edge (external -> subprocess) - this is an input port
      if (edge.target === id && edge.originalTarget) {
        inputs.push({
          id: `input-${edge.originalTarget}${edge.originalTargetHandle ? `-${edge.originalTargetHandle}` : ''}`,
          internalNodeId: edge.originalTarget,
          internalHandleId: edge.originalTargetHandle,
          direction: 'input',
        });
      }

      // Outgoing edge (subprocess -> external) - this is an output port
      if (edge.source === id && edge.originalSource) {
        outputs.push({
          id: `output-${edge.originalSource}${edge.originalSourceHandle ? `-${edge.originalSourceHandle}` : ''}`,
          internalNodeId: edge.originalSource,
          internalHandleId: edge.originalSourceHandle,
          direction: 'output',
        });
      }
    });

    return { inputPorts: inputs, outputPorts: outputs };
  }, [edges, id]);

  // Handle opening the subprocess sheet
  const handleOpenSheet = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    openSubprocessSheet(id);
  }, [id, openSubprocessSheet]);

  return (
    <div
      className={`
        flex flex-col gap-2
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
      {/* Dynamic Input Handles - Left side for incoming connections */}
      {inputPorts.length > 0 ? (
        inputPorts.map((port, index) => (
          <Handle
            key={port.id}
            type="target"
            position={Position.Left}
            id={port.id}
            style={{ top: getPortPosition(index, inputPorts.length) }}
            className="!w-3 !h-3 !bg-purple-300 !border-2 !border-purple-700 hover:!bg-purple-200"
          />
        ))
      ) : (
        // Default single handle if no ports detected (backward compatibility)
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3 !h-3 !bg-purple-300 !border-2 !border-purple-700 hover:!bg-purple-200"
        />
      )}

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

      {/* Dynamic Output Handles - Right side for outgoing connections */}
      {outputPorts.length > 0 ? (
        outputPorts.map((port, index) => (
          <Handle
            key={port.id}
            type="source"
            position={Position.Right}
            id={port.id}
            style={{ top: getPortPosition(index, outputPorts.length) }}
            className="!w-3 !h-3 !bg-purple-300 !border-2 !border-purple-700 hover:!bg-purple-200"
          />
        ))
      ) : (
        // Default single handle if no ports detected (backward compatibility)
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3 !h-3 !bg-purple-300 !border-2 !border-purple-700 hover:!bg-purple-200"
        />
      )}
    </div>
  );
}

export default memo(SubprocessNode);
