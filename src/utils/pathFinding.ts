import {
  FlowchartNode,
  FlowchartEdge,
  AdjacencyList,
  NodeTime,
  NodeSchedule,
  CriticalPathResult,
  TopologicalSortResult,
} from '../types';

// =============================================================================
// Graph Building Functions
// =============================================================================

/**
 * Builds an adjacency list representation of the graph from nodes and edges.
 * The adjacency list maps each node ID to an array of its dependent node IDs (outgoing edges).
 *
 * @param nodes - Array of flowchart nodes
 * @param edges - Array of flowchart edges
 * @returns Adjacency list where key is source node and value is array of target nodes
 */
export function buildGraph(nodes: FlowchartNode[], edges: FlowchartEdge[]): AdjacencyList {
  const adjacencyList: AdjacencyList = {};

  // Initialize all nodes with empty arrays
  for (const node of nodes) {
    adjacencyList[node.id] = [];
  }

  // Add edges to adjacency list
  for (const edge of edges) {
    if (adjacencyList[edge.source]) {
      adjacencyList[edge.source].push(edge.target);
    }
  }

  return adjacencyList;
}

/**
 * Builds a reverse adjacency list (predecessor map) from edges.
 * Maps each node ID to an array of its dependency node IDs (incoming edges).
 *
 * @param edges - Array of flowchart edges
 * @returns Adjacency list where key is target node and value is array of source nodes
 */
export function buildReverseGraph(edges: FlowchartEdge[]): AdjacencyList {
  const reverseAdjacencyList: AdjacencyList = {};

  for (const edge of edges) {
    if (!reverseAdjacencyList[edge.target]) {
      reverseAdjacencyList[edge.target] = [];
    }
    reverseAdjacencyList[edge.target].push(edge.source);
  }

  return reverseAdjacencyList;
}

// =============================================================================
// Dependency Helper Functions
// =============================================================================

/**
 * Gets all dependencies (predecessors) of a node - nodes that must complete before this node can start.
 *
 * @param nodeId - The ID of the node to get dependencies for
 * @param edges - Array of flowchart edges
 * @returns Array of node IDs that are dependencies of the given node
 */
export function getNodeDependencies(nodeId: string, edges: FlowchartEdge[]): string[] {
  const dependencies: string[] = [];

  for (const edge of edges) {
    if (edge.target === nodeId) {
      dependencies.push(edge.source);
    }
  }

  return dependencies;
}

/**
 * Gets all dependents (successors) of a node - nodes that depend on this node.
 *
 * @param nodeId - The ID of the node to get dependents for
 * @param edges - Array of flowchart edges
 * @returns Array of node IDs that are dependents of the given node
 */
export function getNodeDependents(nodeId: string, edges: FlowchartEdge[]): string[] {
  const dependents: string[] = [];

  for (const edge of edges) {
    if (edge.source === nodeId) {
      dependents.push(edge.target);
    }
  }

  return dependents;
}

// =============================================================================
// Topological Sort Functions
// =============================================================================

/**
 * Performs topological sort on the graph using Kahn's algorithm.
 * Returns nodes in execution order (dependencies before dependents).
 *
 * @param nodes - Array of flowchart nodes
 * @param edges - Array of flowchart edges
 * @returns Object containing sorted node IDs and cycle detection flag
 */
export function topologicalSort(
  nodes: FlowchartNode[],
  edges: FlowchartEdge[]
): TopologicalSortResult {
  const adjacencyList = buildGraph(nodes, edges);
  const inDegree: Record<string, number> = {};

  // Initialize in-degree for all nodes
  for (const node of nodes) {
    inDegree[node.id] = 0;
  }

  // Calculate in-degree for each node
  for (const edge of edges) {
    if (inDegree[edge.target] !== undefined) {
      inDegree[edge.target]++;
    }
  }

  // Queue all nodes with in-degree 0
  const queue: string[] = [];
  for (const node of nodes) {
    if (inDegree[node.id] === 0) {
      queue.push(node.id);
    }
  }

  const sorted: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);

    // Reduce in-degree for all neighbors
    for (const neighbor of adjacencyList[current] || []) {
      inDegree[neighbor]--;
      if (inDegree[neighbor] === 0) {
        queue.push(neighbor);
      }
    }
  }

  // If sorted length doesn't match nodes length, there's a cycle
  const hasCycle = sorted.length !== nodes.length;

  return { sorted, hasCycle };
}

// =============================================================================
// Critical Path Functions
// =============================================================================

/**
 * Finds the critical path through the flowchart using the Critical Path Method (CPM).
 *
 * Algorithm:
 * 1. Forward Pass: Calculate earliest start (ES) and earliest finish (EF) times
 *    - ES = max(EF of all predecessors)
 *    - EF = ES + duration
 *
 * 2. Backward Pass: Calculate latest start (LS) and latest finish (LF) times
 *    - LF = min(LS of all successors)
 *    - LS = LF - duration
 *
 * 3. Calculate Slack: Slack = LS - ES = LF - EF
 *    - Critical nodes have zero slack
 *
 * @param nodes - Array of flowchart nodes
 * @param edges - Array of flowchart edges
 * @param nodeTimes - Array of node durations
 * @returns Critical path result with duration, path, and all node schedules
 */
export function findCriticalPath(
  nodes: FlowchartNode[],
  edges: FlowchartEdge[],
  nodeTimes: NodeTime[]
): CriticalPathResult {
  // Create duration map for quick lookup
  const durationMap: Record<string, number> = {};
  for (const nodeTime of nodeTimes) {
    durationMap[nodeTime.nodeId] = nodeTime.duration;
  }

  // Get topologically sorted nodes
  const { sorted, hasCycle } = topologicalSort(nodes, edges);

  if (hasCycle) {
    throw new Error('Cannot find critical path: graph contains a cycle');
  }

  // Build dependency maps
  const adjacencyList = buildGraph(nodes, edges);
  const reverseAdjacencyList = buildReverseGraph(edges);

  // Initialize schedule tracking
  const schedules: Record<string, NodeSchedule> = {};

  for (const nodeId of sorted) {
    schedules[nodeId] = {
      nodeId,
      earliestStart: 0,
      earliestFinish: 0,
      latestStart: Infinity,
      latestFinish: Infinity,
      slack: 0,
      isCritical: false,
    };
  }

  // =========================================================================
  // Forward Pass: Calculate ES and EF
  // =========================================================================
  for (const nodeId of sorted) {
    const duration = durationMap[nodeId] || 0;
    const dependencies = reverseAdjacencyList[nodeId] || [];

    // ES = max(EF of all predecessors)
    let earliestStart = 0;
    for (const dep of dependencies) {
      if (schedules[dep]) {
        earliestStart = Math.max(earliestStart, schedules[dep].earliestFinish);
      }
    }

    schedules[nodeId].earliestStart = earliestStart;
    schedules[nodeId].earliestFinish = earliestStart + duration;
  }

  // Calculate project duration (max EF of all nodes)
  let projectDuration = 0;
  for (const nodeId of sorted) {
    projectDuration = Math.max(projectDuration, schedules[nodeId].earliestFinish);
  }

  // =========================================================================
  // Backward Pass: Calculate LS and LF
  // =========================================================================
  // Process nodes in reverse topological order
  const reversedSorted = [...sorted].reverse();

  for (const nodeId of reversedSorted) {
    const duration = durationMap[nodeId] || 0;
    const dependents = adjacencyList[nodeId] || [];

    // LF = min(LS of all successors)
    // For nodes with no successors, LF = project duration
    let latestFinish = projectDuration;
    if (dependents.length > 0) {
      for (const dep of dependents) {
        if (schedules[dep]) {
          latestFinish = Math.min(latestFinish, schedules[dep].latestStart);
        }
      }
    }

    schedules[nodeId].latestFinish = latestFinish;
    schedules[nodeId].latestStart = latestFinish - duration;
  }

  // =========================================================================
  // Calculate Slack and Identify Critical Path
  // =========================================================================
  const criticalNodes: string[] = [];

  for (const nodeId of sorted) {
    const schedule = schedules[nodeId];
    schedule.slack = schedule.latestStart - schedule.earliestStart;
    schedule.isCritical = schedule.slack === 0;

    if (schedule.isCritical) {
      criticalNodes.push(nodeId);
    }
  }

  // Build the critical path by following critical nodes in order
  const criticalPath = buildCriticalPathSequence(criticalNodes, edges, adjacencyList);

  return {
    duration: projectDuration,
    criticalPath,
    nodeSchedules: Object.values(schedules),
  };
}

/**
 * Builds the critical path sequence from critical nodes.
 * Orders critical nodes by following the edges between them.
 *
 * @param criticalNodes - Array of critical node IDs
 * @param edges - Array of flowchart edges
 * @param adjacencyList - Adjacency list of the graph
 * @returns Ordered array of critical node IDs forming the critical path
 */
function buildCriticalPathSequence(
  criticalNodes: string[],
  edges: FlowchartEdge[],
  adjacencyList: AdjacencyList
): string[] {
  if (criticalNodes.length === 0) {
    return [];
  }

  const criticalSet = new Set(criticalNodes);

  // Find start nodes (critical nodes with no critical predecessors)
  const startNodes: string[] = [];
  for (const nodeId of criticalNodes) {
    const predecessors = getNodeDependencies(nodeId, edges);
    const hasCriticalPredecessor = predecessors.some((p) => criticalSet.has(p));
    if (!hasCriticalPredecessor) {
      startNodes.push(nodeId);
    }
  }

  // Build path by traversing from start nodes
  const path: string[] = [];
  const visited = new Set<string>();

  function traverse(nodeId: string): void {
    if (visited.has(nodeId)) {
      return;
    }
    visited.add(nodeId);
    path.push(nodeId);

    // Find next critical node
    const successors = adjacencyList[nodeId] || [];
    for (const successor of successors) {
      if (criticalSet.has(successor)) {
        traverse(successor);
      }
    }
  }

  // Start from each start node (typically just one)
  for (const startNode of startNodes) {
    traverse(startNode);
  }

  return path;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Gets all nodes that can be started immediately (no pending dependencies).
 *
 * @param completedNodes - Array of completed node IDs
 * @param nodes - Array of all flowchart nodes
 * @param edges - Array of flowchart edges
 * @returns Array of node IDs that can be started
 */
export function getReadyNodes(
  completedNodes: string[],
  nodes: FlowchartNode[],
  edges: FlowchartEdge[]
): string[] {
  const completedSet = new Set(completedNodes);
  const readyNodes: string[] = [];

  for (const node of nodes) {
    if (completedSet.has(node.id)) {
      continue;
    }

    const dependencies = getNodeDependencies(node.id, edges);
    const allDependenciesComplete = dependencies.every((dep) => completedSet.has(dep));

    if (allDependenciesComplete) {
      readyNodes.push(node.id);
    }
  }

  return readyNodes;
}

/**
 * Calculates the percentage completion of the project.
 *
 * @param completedNodes - Array of completed node IDs
 * @param nodes - Array of all flowchart nodes
 * @returns Percentage of completion (0-100)
 */
export function getCompletionPercentage(
  completedNodes: string[],
  nodes: FlowchartNode[]
): number {
  if (nodes.length === 0) {
    return 0;
  }

  const completedSet = new Set(completedNodes);
  const completedCount = nodes.filter((node) => completedSet.has(node.id)).length;

  return Math.round((completedCount / nodes.length) * 100);
}

/**
 * Validates that all nodes referenced in edges exist in the nodes array.
 *
 * @param nodes - Array of flowchart nodes
 * @param edges - Array of flowchart edges
 * @returns Object with validation result and any missing node IDs
 */
export function validateGraphIntegrity(
  nodes: FlowchartNode[],
  edges: FlowchartEdge[]
): { valid: boolean; missingNodes: string[] } {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const missingNodes: string[] = [];

  for (const edge of edges) {
    if (!nodeIds.has(edge.source) && !missingNodes.includes(edge.source)) {
      missingNodes.push(edge.source);
    }
    if (!nodeIds.has(edge.target) && !missingNodes.includes(edge.target)) {
      missingNodes.push(edge.target);
    }
  }

  return {
    valid: missingNodes.length === 0,
    missingNodes,
  };
}
