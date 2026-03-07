import { createContext, useContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { topologicalSort } from '../utils/pathFinding';
import type { FlowchartNode, FlowchartEdge } from '../types';

// =============================================================================
// Types
// =============================================================================

interface FlowOrderContextValue {
  /** Map of node ID to flow order (1-based) - simple numeric order */
  flowOrderMap: Map<string, number>;
  /** Map of node ID to hierarchical flow order (e.g., "2.3.5") */
  hierarchicalFlowOrderMap: Map<string, string>;
  /** Get the flow order for a specific node ID */
  getFlowOrder: (nodeId: string) => number;
  /** Get the hierarchical flow order for a specific node ID */
  getHierarchicalFlowOrder: (nodeId: string) => string;
}

// =============================================================================
// Context
// =============================================================================

const FlowOrderContext = createContext<FlowOrderContextValue>({
  flowOrderMap: new Map(),
  hierarchicalFlowOrderMap: new Map(),
  getFlowOrder: () => 0,
  getHierarchicalFlowOrder: () => '',
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
 *
 * Supports hierarchical numbering for nested subprocesses:
 * - Top-level nodes: 1, 2, 3...
 * - Nodes inside subprocess 2: 2.1, 2.2, 2.3...
 * - Nodes inside nested subprocess 2.3: 2.3.1, 2.3.2...
 */
export function FlowOrderProvider({ children, nodes, edges }: FlowOrderProviderProps) {
  const { flowOrderMap, hierarchicalFlowOrderMap } = useMemo(() => {
    const numericMap = new Map<string, number>();
    const hierarchicalMap = new Map<string, string>();

    if (nodes.length === 0) {
      return { flowOrderMap: numericMap, hierarchicalFlowOrderMap: hierarchicalMap };
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
      return { flowOrderMap: numericMap, hierarchicalFlowOrderMap: hierarchicalMap };
    }

    // Build a map of nodeId -> parentId (the subprocess that contains this node)
    // Use empty string "" to represent null (top-level) for Map key consistency
    const NULL_PARENT_KEY = '__NULL_PARENT__';
    const nodeParentMap = new Map<string, string>();
    const processNodesMap = new Map<string, FlowchartNode>();

    processNodes.forEach((node) => {
      processNodesMap.set(node.id, node);
      // Use NULL_PARENT_KEY for top-level nodes (no parent)
      const parentId = (node.data as { parentId?: string }).parentId;
      nodeParentMap.set(node.id, parentId || NULL_PARENT_KEY);
    });

    // Group nodes by their parent subprocess
    const nodesByParent = new Map<string, FlowchartNode[]>();
    processNodes.forEach((node) => {
      const parentId = nodeParentMap.get(node.id)!;
      if (!nodesByParent.has(parentId)) {
        nodesByParent.set(parentId, []);
      }
      nodesByParent.get(parentId)!.push(node);
    });

    // Filter edges by parent group (only edges between nodes in the same subprocess)
    const edgesByParent = new Map<string, FlowchartEdge[]>();
    internalEdges.forEach((edge) => {
      const sourceParent = nodeParentMap.get(edge.source);
      const targetParent = nodeParentMap.get(edge.target);
      // Only include edges where both nodes are in the same parent
      if (sourceParent === targetParent && sourceParent) {
        if (!edgesByParent.has(sourceParent)) {
          edgesByParent.set(sourceParent, []);
        }
        edgesByParent.get(sourceParent)!.push(edge);
      }
    });

    // Calculate flow order for each group (per subprocess level)
    const flowOrderByParent = new Map<string, Map<string, number>>();

    nodesByParent.forEach((groupNodes, parentId) => {
      const groupEdges = edgesByParent.get(parentId) || [];
      const { sorted } = topologicalSort(groupNodes, groupEdges);

      const orderMap = new Map<string, number>();
      sorted.forEach((nodeId, index) => {
        orderMap.set(nodeId, index + 1);
      });
      flowOrderByParent.set(parentId, orderMap);
    });

    // Build hierarchical numbers recursively
    function buildHierarchicalNumber(nodeId: string, parentPath: string): string {
      const parentId = nodeParentMap.get(nodeId);
      const orderMap = parentId ? flowOrderByParent.get(parentId) : undefined;
      const localOrder = orderMap?.get(nodeId) || 0;

      const currentNumber = parentPath ? `${parentPath}.${localOrder}` : `${localOrder}`;

      // Store both numeric and hierarchical orders
      numericMap.set(nodeId, localOrder);
      hierarchicalMap.set(nodeId, currentNumber);

      // If this node is a subprocess, recursively process its children
      const node = processNodesMap.get(nodeId);
      if (node && node.type === 'subprocess') {
        const childNodes = nodesByParent.get(nodeId) || [];
        childNodes.forEach((childNode) => {
          buildHierarchicalNumber(childNode.id, currentNumber);
        });
      }

      return currentNumber;
    }

    // Start with top-level nodes (parentId === NULL_PARENT_KEY)
    const topLevelNodes = nodesByParent.get(NULL_PARENT_KEY) || [];
    topLevelNodes.forEach((node) => {
      buildHierarchicalNumber(node.id, '');
    });

    return { flowOrderMap: numericMap, hierarchicalFlowOrderMap: hierarchicalMap };
  }, [nodes, edges]);

  const getFlowOrder = useMemo(() => {
    return (nodeId: string): number => {
      return flowOrderMap.get(nodeId) || 0;
    };
  }, [flowOrderMap]);

  const getHierarchicalFlowOrder = useMemo(() => {
    return (nodeId: string): string => {
      return hierarchicalFlowOrderMap.get(nodeId) || '';
    };
  }, [hierarchicalFlowOrderMap]);

  const value = useMemo(
    () => ({
      flowOrderMap,
      hierarchicalFlowOrderMap,
      getFlowOrder,
      getHierarchicalFlowOrder,
    }),
    [flowOrderMap, hierarchicalFlowOrderMap, getFlowOrder, getHierarchicalFlowOrder]
  );

  return (
    <FlowOrderContext.Provider value={value}>
      {children}
    </FlowOrderContext.Provider>
  );
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook to access the flow order context.
 * Returns the simple numeric flow order for a specific node ID.
 */
export function useFlowOrder(nodeId: string): number {
  const { getFlowOrder } = useContext(FlowOrderContext);
  return getFlowOrder(nodeId);
}

/**
 * Hook to get the hierarchical flow order for a specific node ID.
 * Returns strings like "2.3.5" for nested nodes.
 */
export function useHierarchicalFlowOrder(nodeId: string): string {
  const { getHierarchicalFlowOrder } = useContext(FlowOrderContext);
  return getHierarchicalFlowOrder(nodeId);
}

/**
 * Hook to get the full flow order map (numeric).
 */
export function useFlowOrderMap(): Map<string, number> {
  const { flowOrderMap } = useContext(FlowOrderContext);
  return flowOrderMap;
}

/**
 * Hook to get the full hierarchical flow order map.
 */
export function useHierarchicalFlowOrderMap(): Map<string, string> {
  const { hierarchicalFlowOrderMap } = useContext(FlowOrderContext);
  return hierarchicalFlowOrderMap;
}

export default FlowOrderContext;
