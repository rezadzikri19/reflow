import { memo, useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { useReactFlow, useViewport } from '@xyflow/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useFlowchartStore } from '../../stores/flowchartStore';
import type { FlowchartEdge, FlowchartNode } from '../../types';

// =============================================================================
// Types
// =============================================================================

interface BoundaryConnectionsProps {
  subprocessId: string;
}

interface PortInfo {
  edgeId: string;
  externalNodeName: string;
  internalNodeId: string;
  internalHandleId?: string | null;
}

// =============================================================================
// BoundaryConnections Component
// =============================================================================

function BoundaryConnections({ subprocessId }: BoundaryConnectionsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { getNodes } = useReactFlow();
  const { zoom, x: viewportX, y: viewportY } = useViewport();

  const nodes = useFlowchartStore((state) => state.nodes);
  const edges = useFlowchartStore((state) => state.edges);

  // Track container bounds for positioning
  const [containerBounds, setContainerBounds] = useState<DOMRect | null>(null);

  useEffect(() => {
    const updateBounds = () => {
      if (containerRef.current) {
        const parent = containerRef.current.closest('.react-flow__viewport');
        if (parent) {
          setContainerBounds(parent.getBoundingClientRect());
        } else {
          // Fallback to react-flow container
          const flowContainer = containerRef.current.closest('.react-flow');
          if (flowContainer) {
            setContainerBounds(flowContainer.getBoundingClientRect());
          }
        }
      }
    };

    updateBounds();
    window.addEventListener('resize', updateBounds);

    // Also update on zoom/pan
    const timer = setTimeout(updateBounds, 100);
    return () => {
      window.removeEventListener('resize', updateBounds);
      clearTimeout(timer);
    };
  }, [zoom, viewportX, viewportY]);

  // Compute boundary ports from edges
  const { inputPorts, outputPorts } = useMemo(() => {
    const inputs: PortInfo[] = [];
    const outputs: PortInfo[] = [];

    edges.forEach((edge: FlowchartEdge) => {
      // Incoming edge (external -> subprocess) - input port
      if (edge.target === subprocessId && edge.originalTarget) {
        const externalNode = nodes.find((n: FlowchartNode) => n.id === edge.source);
        inputs.push({
          edgeId: edge.id,
          externalNodeName: externalNode?.data?.label || 'Unknown',
          internalNodeId: edge.originalTarget,
          internalHandleId: edge.originalTargetHandle,
        });
      }

      // Outgoing edge (subprocess -> external) - output port
      if (edge.source === subprocessId && edge.originalSource) {
        const externalNode = nodes.find((n: FlowchartNode) => n.id === edge.target);
        outputs.push({
          edgeId: edge.id,
          externalNodeName: externalNode?.data?.label || 'Unknown',
          internalNodeId: edge.originalSource,
          internalHandleId: edge.originalSourceHandle,
        });
      }
    });

    return { inputPorts: inputs, outputPorts: outputs };
  }, [edges, nodes, subprocessId]);

  // Convert flow coordinates to screen coordinates
  const flowToScreen = useCallback((flowX: number, flowY: number) => {
    return {
      x: flowX * zoom + viewportX,
      y: flowY * zoom + viewportY,
    };
  }, [zoom, viewportX, viewportY]);

  // Get internal node positions in screen coordinates
  const internalNodePositions = useMemo(() => {
    const allNodes = getNodes();
    const positions: Record<string, { x: number; y: number; width: number; height: number; screenX: number; screenY: number }> = {};

    allNodes.forEach((node) => {
      const width = node.measured?.width || 180;
      const height = node.measured?.height || 80;
      const screenPos = flowToScreen(node.position.x, node.position.y);

      positions[node.id] = {
        x: node.position.x,
        y: node.position.y,
        width,
        height,
        screenX: screenPos.x,
        screenY: screenPos.y,
      };
    });

    return positions;
  }, [getNodes, flowToScreen, nodes]);

  // Don't render if no ports
  if (inputPorts.length === 0 && outputPorts.length === 0) {
    return null;
  }

  // Calculate label positions
  const inputLabelYPositions = inputPorts.map((_, index) => 60 + index * 45);
  const outputLabelYPositions = outputPorts.map((_, index) => 60 + index * 45);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none z-20 overflow-hidden"
    >
      {/* SVG for drawing connection lines */}
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <marker
            id="boundary-arrow-green"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#22C55E" />
          </marker>
          <marker
            id="boundary-arrow-blue"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#3B82F6" />
          </marker>
        </defs>

        {/* Input connection lines */}
        {inputPorts.map((port, index) => {
          const internalNode = internalNodePositions[port.internalNodeId];
          if (!internalNode) return null;

          const labelY = inputLabelYPositions[index];
          const startX = 120; // Right edge of input label area
          const startY = labelY + 12; // Center of label
          const endX = internalNode.screenX;
          const endY = internalNode.screenY + (internalNode.height * zoom) / 2;

          // Create a smooth curve
          const midX = (startX + endX) / 2;

          return (
            <path
              key={`input-line-${port.edgeId}`}
              d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
              fill="none"
              stroke="#22C55E"
              strokeWidth={2}
              strokeDasharray="6,3"
              markerEnd="url(#boundary-arrow-green)"
              opacity={0.8}
            />
          );
        })}

        {/* Output connection lines */}
        {outputPorts.map((port, index) => {
          const internalNode = internalNodePositions[port.internalNodeId];
          if (!internalNode) return null;

          const labelY = outputLabelYPositions[index];
          const svgWidth = containerBounds?.width || 800;
          const endX = svgWidth - 120; // Left edge of output label area
          const endY = labelY + 12; // Center of label
          const startX = internalNode.screenX + internalNode.width * zoom;
          const startY = internalNode.screenY + (internalNode.height * zoom) / 2;

          // Create a smooth curve
          const midX = (startX + endX) / 2;

          return (
            <path
              key={`output-line-${port.edgeId}`}
              d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
              fill="none"
              stroke="#3B82F6"
              strokeWidth={2}
              strokeDasharray="6,3"
              markerEnd="url(#boundary-arrow-blue)"
              opacity={0.8}
            />
          );
        })}
      </svg>

      {/* Input boundary labels */}
      <div className="absolute left-2 top-12 flex flex-col gap-1">
        <div className="text-xs text-gray-500 font-medium flex items-center gap-1 pointer-events-auto bg-white/80 px-1 rounded">
          <ArrowLeft className="w-3 h-3" />
          <span>Inputs</span>
        </div>
        {inputPorts.map((port, index) => (
          <div
            key={`input-label-${port.edgeId}`}
            className="flex items-center gap-1 px-2 py-1.5 bg-green-100 border-2 border-green-400 rounded-md text-xs text-green-700 shadow-sm pointer-events-auto"
            style={{ marginTop: index === 0 ? '4px' : '2px' }}
          >
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full" />
            <span className="font-semibold truncate max-w-[100px]" title={port.externalNodeName}>
              {port.externalNodeName}
            </span>
          </div>
        ))}
      </div>

      {/* Output boundary labels */}
      <div className="absolute right-2 top-12 flex flex-col gap-1 items-end">
        <div className="text-xs text-gray-500 font-medium flex items-center gap-1 pointer-events-auto bg-white/80 px-1 rounded">
          <span>Outputs</span>
          <ArrowRight className="w-3 h-3" />
        </div>
        {outputPorts.map((port, index) => (
          <div
            key={`output-label-${port.edgeId}`}
            className="flex items-center gap-1 px-2 py-1.5 bg-blue-100 border-2 border-blue-400 rounded-md text-xs text-blue-700 shadow-sm pointer-events-auto"
            style={{ marginTop: index === 0 ? '4px' : '2px' }}
          >
            <span className="font-semibold truncate max-w-[100px]" title={port.externalNodeName}>
              {port.externalNodeName}
            </span>
            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(BoundaryConnections);
