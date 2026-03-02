import { memo, useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { useReactFlow, useViewport } from '@xyflow/react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useFlowchartStore } from '../../stores/flowchartStore';
import type { FlowchartEdge, FlowchartNode, InternalNodeConnection } from '../../types';

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
  /** All internal connections for this port */
  allInternalConnections?: InternalNodeConnection[];
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
  const nodeVersion = useFlowchartStore((state) => state.nodeVersion);

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
      if (edge.target === subprocessId && (edge.originalTarget || edge.originalTargets)) {
        const externalNode = nodes.find((n: FlowchartNode) => n.id === edge.source);
        // Get all internal targets
        const internalTargets = edge.originalTargets || [
          { nodeId: edge.originalTarget!, handleId: edge.originalTargetHandle }
        ];
        inputs.push({
          edgeId: edge.id,
          externalNodeName: externalNode?.data?.label || 'Unknown',
          internalNodeId: internalTargets[0].nodeId,
          internalHandleId: internalTargets[0].handleId,
          allInternalConnections: internalTargets,
        });
      }

      // Outgoing edge (subprocess -> external) - output port
      if (edge.source === subprocessId && (edge.originalSource || edge.originalSources)) {
        const externalNode = nodes.find((n: FlowchartNode) => n.id === edge.target);
        // Get all internal sources
        const internalSources = edge.originalSources || [
          { nodeId: edge.originalSource!, handleId: edge.originalSourceHandle }
        ];
        outputs.push({
          edgeId: edge.id,
          externalNodeName: externalNode?.data?.label || 'Unknown',
          internalNodeId: internalSources[0].nodeId,
          internalHandleId: internalSources[0].handleId,
          allInternalConnections: internalSources,
        });
      }
    });

    return { inputPorts: inputs, outputPorts: outputs };
  }, [edges, nodes, subprocessId, nodeVersion]);

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

  // =============================================================================
  // Label Position Calculations
  // Must match the actual CSS layout of the labels below
  // =============================================================================

  // Input labels: container at left-2 (8px), top-12 (48px)
  // Header: ~20px height, gap-1 (4px), then labels with marginTop
  // Label dimensions: px-2 (8px each), py-1.5 (6px each), border-2 (2px each)
  // Label content: dot (10px) + gap-1 (4px) + text (max 100px) ≈ 114px + 16px padding + 4px border ≈ 134px
  const INPUT_LABEL_LEFT = 8; // left-2
  const INPUT_LABEL_WIDTH = 130; // approximate width with typical text
  const INPUT_LABEL_HEIGHT = 28; // py-1.5 (12px) + text (~16px)
  const INPUT_LABEL_RIGHT = INPUT_LABEL_LEFT + INPUT_LABEL_WIDTH; // center-right x position

  // Calculate Y positions for input labels
  // Container top: 48px (top-12)
  // Header height: ~20px
  // gap-1: 4px
  // First label marginTop: 4px, subsequent: 2px
  const INPUT_CONTAINER_TOP = 48;
  const HEADER_HEIGHT = 20;
  const HEADER_GAP = 4;
  const FIRST_LABEL_MARGIN = 4;
  const SUBSEQUENT_LABEL_MARGIN = 2;

  const inputLabelPositions = inputPorts.map((_, index) => {
    const labelTop = INPUT_CONTAINER_TOP + HEADER_HEIGHT + HEADER_GAP +
                     (index === 0 ? FIRST_LABEL_MARGIN : FIRST_LABEL_MARGIN + (index * (INPUT_LABEL_HEIGHT + SUBSEQUENT_LABEL_MARGIN)));
    return {
      y: labelTop + INPUT_LABEL_HEIGHT / 2, // center Y
    };
  });

  // Output labels: container at right-2 (8px from right), top-12 (48px)
  // Same dimensions as input labels
  const OUTPUT_LABEL_WIDTH = 130;
  const OUTPUT_LABEL_HEIGHT = 28;

  const outputLabelPositions = outputPorts.map((_, index) => {
    const labelTop = INPUT_CONTAINER_TOP + HEADER_HEIGHT + HEADER_GAP +
                     (index === 0 ? FIRST_LABEL_MARGIN : FIRST_LABEL_MARGIN + (index * (OUTPUT_LABEL_HEIGHT + SUBSEQUENT_LABEL_MARGIN)));
    return {
      y: labelTop + OUTPUT_LABEL_HEIGHT / 2, // center Y
    };
  });

  const svgWidth = containerBounds?.width || 800;
  const OUTPUT_LABEL_LEFT = svgWidth - 8 - OUTPUT_LABEL_WIDTH; // left edge of output label

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

        {/* Input connection lines - from center-right of input label to ALL internal nodes */}
        {inputPorts.map((port, index) => {
          const labelPos = inputLabelPositions[index];
          const startX = INPUT_LABEL_RIGHT; // Center-right of input label
          const startY = labelPos.y; // Vertically centered

          // Get all internal connections for this port
          const connections = port.allInternalConnections || [
            { nodeId: port.internalNodeId, handleId: port.internalHandleId }
          ];

          // Draw a line to each internal node
          return connections.map((conn, connIndex) => {
            const internalNode = internalNodePositions[conn.nodeId];
            if (!internalNode) return null;

            const endX = internalNode.screenX;
            const endY = internalNode.screenY + (internalNode.height * zoom) / 2;

            // Create a smooth curve
            const midX = (startX + endX) / 2;

            return (
              <path
                key={`input-line-${port.edgeId}-${connIndex}`}
                d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                fill="none"
                stroke="#22C55E"
                strokeWidth={2}
                strokeDasharray="6,3"
                markerEnd="url(#boundary-arrow-green)"
                opacity={0.8}
              />
            );
          });
        })}

        {/* Output connection lines - from ALL internal nodes to center-left of output label */}
        {outputPorts.map((port, index) => {
          const labelPos = outputLabelPositions[index];
          const endX = OUTPUT_LABEL_LEFT; // Center-left of output label
          const endY = labelPos.y; // Vertically centered

          // Get all internal connections for this port
          const connections = port.allInternalConnections || [
            { nodeId: port.internalNodeId, handleId: port.internalHandleId }
          ];

          // Draw a line from each internal node
          return connections.map((conn, connIndex) => {
            const internalNode = internalNodePositions[conn.nodeId];
            if (!internalNode) return null;

            const startX = internalNode.screenX + internalNode.width * zoom;
            const startY = internalNode.screenY + (internalNode.height * zoom) / 2;

            // Create a smooth curve
            const midX = (startX + endX) / 2;

            return (
              <path
                key={`output-line-${port.edgeId}-${connIndex}`}
                d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                fill="none"
                stroke="#3B82F6"
                strokeWidth={2}
                strokeDasharray="6,3"
                markerEnd="url(#boundary-arrow-blue)"
                opacity={0.8}
              />
            );
          });
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
            className="flex items-center gap-1 px-2 py-1.5 bg-green-100 border-2 border-green-400 rounded-md text-xs text-green-700 shadow-sm pointer-events-auto w-[130px]"
            style={{ marginTop: index === 0 ? '4px' : '2px' }}
          >
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full shrink-0" />
            <span className="font-semibold truncate flex-1" title={port.externalNodeName}>
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
            className="flex items-center gap-1 px-2 py-1.5 bg-blue-100 border-2 border-blue-400 rounded-md text-xs text-blue-700 shadow-sm pointer-events-auto w-[130px]"
            style={{ marginTop: index === 0 ? '4px' : '2px' }}
          >
            <span className="font-semibold truncate flex-1 text-right" title={port.externalNodeName}>
              {port.externalNodeName}
            </span>
            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(BoundaryConnections);
