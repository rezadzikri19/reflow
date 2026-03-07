import { useMemo } from 'react';
import type { FlowchartNode, FlowchartEdge } from '../types';

/**
 * Connection info for a node
 */
export interface NodeConnectionInfo {
  /** Node label */
  label: string;
  /** Node ID */
  id: string;
}

/**
 * Connections for a node (incoming and outgoing)
 */
export interface NodeConnections {
  /** Nodes that have edges pointing to this node */
  incoming: NodeConnectionInfo[];
  /** Nodes that this node has edges pointing to */
  outgoing: NodeConnectionInfo[];
}

/**
 * Map of node ID to its connections
 */
export type NodeConnectionsMap = Map<string, NodeConnections>;

/**
 * Hook to derive incoming and outgoing connections for each node from edges
 * Filters out hidden edges and handles boundary ports appropriately
 *
 * @param nodes - Array of flowchart nodes
 * @param edges - Array of flowchart edges
 * @returns Map of node ID to its connections
 */
export function useNodeConnections(
  nodes: FlowchartNode[],
  edges: FlowchartEdge[]
): NodeConnectionsMap {
  return useMemo(() => {
    const connectionsMap = new Map<string, NodeConnections>();

    // Initialize connections for all nodes
    nodes.forEach((node) => {
      connectionsMap.set(node.id, { incoming: [], outgoing: [] });
    });

    // Create a map for quick node lookup
    const nodeMap = new Map<string, FlowchartNode>();
    nodes.forEach((node) => {
      nodeMap.set(node.id, node);
    });

    // Process edges to build connections
    edges.forEach((edge) => {
      // Skip hidden edges
      if (edge.hidden) return;

      // Skip edges involving boundary ports (they are virtual nodes)
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);

      if (!sourceNode || !targetNode) return;

      // Skip if source or target is a boundary port
      if (sourceNode.data.nodeType === 'boundaryPort' || targetNode.data.nodeType === 'boundaryPort') {
        return;
      }

      // Add outgoing connection for source
      const sourceConnections = connectionsMap.get(edge.source);
      if (sourceConnections) {
        sourceConnections.outgoing.push({
          id: edge.target,
          label: targetNode.data.label || edge.target,
        });
      }

      // Add incoming connection for target
      const targetConnections = connectionsMap.get(edge.target);
      if (targetConnections) {
        targetConnections.incoming.push({
          id: edge.source,
          label: sourceNode.data.label || edge.source,
        });
      }
    });

    return connectionsMap;
  }, [nodes, edges]);
}

export default useNodeConnections;
