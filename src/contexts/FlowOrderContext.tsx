import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { topologicalSort } from '../utils/pathFinding';
import type { FlowchartNode, FlowchartEdge } from '../types';

// =============================================================================
// Types
// =============================================================================

interface FlowOrderContextValue {
  /** Map of node ID to flow order (1-based) */
  flowOrderMap: Map<string, number>;
  /** Get the flow order for a specific node ID */
  getFlowOrder: (nodeId: string) => number;
}

// =============================================================================
// Context
// =============================================================================

const FlowOrderContext = createContext<FlowOrderContextValue>({
  flowOrderMap: new Map(),
  getFlowOrder: () => 0,
});

// =============================================================================
// Provider
// =============================================================================

interface FlowOrderProviderProps {
  children: ReactNode;
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
}

/**
 * Provider that calculates and provides flow order for all nodes.
 * Flow order is determined by topological sort of the graph.
 * Boundary ports, junctions, and references are excluded from flow order calculation.
 */
export function FlowOrderProvider({ children, nodes, edges }: FlowOrderProviderProps) {
  const flowOrderMap = useMemo(() => {
    const map = new Map<string, number>();

    if (nodes.length === 0) {
      return map;
    }

    // Filter out non-process nodes: boundary ports (virtual connections), junctions (path hubs), connectors (page links), and references (pointers to other nodes)
    const processNodes = nodes.filter(
      (node) => node.type !== 'boundaryPort' && node.type !== 'junction' && node.type !== 'connector' && node.type !== 'reference'
    );

    // Filter edges to only include those between process nodes
    const processNodeIds = new Set(processNodes.map((n) => n.id));
    const internalEdges = edges.filter(
      (edge) => processNodeIds.has(edge.source) && processNodeIds.has(edge.target)
    );

    if (processNodes.length === 0) {
      return map;
    }

    const { sorted } = topologicalSort(processNodes, internalEdges);

    // Assign 1-based order to each node
    sorted.forEach((nodeId, index) => {
      map.set(nodeId, index + 1);
    });

    return map;
  }, [nodes, edges]);

  const getFlowOrder = useMemo(() => {
    return (nodeId: string): number => {
      return flowOrderMap.get(nodeId) || 0;
    };
  }, [flowOrderMap]);

  const value = useMemo(
    () => ({
      flowOrderMap,
      getFlowOrder,
    }),
    [flowOrderMap, getFlowOrder]
  );

  return (
    <FlowOrderContext.Provider value={value}>
      {children}
    </FlowOrderContext.Provider>
  );
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Hook to access the flow order context.
 * Returns the flow order for a specific node ID.
 */
export function useFlowOrder(nodeId: string): number {
  const { getFlowOrder } = useContext(FlowOrderContext);
  return getFlowOrder(nodeId);
}

/**
 * Hook to get the full flow order map.
 */
export function useFlowOrderMap(): Map<string, number> {
  const { flowOrderMap } = useContext(FlowOrderContext);
  return flowOrderMap;
}

export default FlowOrderContext;
