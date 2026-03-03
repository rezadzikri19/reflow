import type {
  FlowchartNode,
  FlowchartEdge,
  ProcessNodeData,
  ScenarioResults,
  NodeResult,
  CalculationInput,
  CalculationOutput,
  NodeTime,
} from '../types';
import {
  WORKING_TIME_DEFAULTS,
} from '../types';
import {
  findCriticalPath,
} from './pathFinding';

// =============================================================================
// Node Metrics Calculation
// =============================================================================

/**
 * Calculate processing time and FTE for a single node.
 *
 * @param input - Calculation input containing node and quantity
 * @returns Calculation output with time and FTE requirements
 */
export function calculateNodeMetrics(input: CalculationInput): CalculationOutput {
  const { node, quantity, workingHoursPerDay = WORKING_TIME_DEFAULTS.hoursPerDay } = input;
  const data = node.data as ProcessNodeData;

  // Calculate total time in minutes
  const unitTime = data.unitTimeMinutes || 0;
  const parallelCapacity = data.parallelCapacity || 1;
  const effectiveParallelCapacity = Math.max(1, parallelCapacity);

  // Total minutes = quantity * unit time / parallel capacity
  const totalMinutes = (quantity * unitTime) / effectiveParallelCapacity;

  // Convert to hours and days
  const totalHours = totalMinutes / 60;
  const totalDays = totalHours / workingHoursPerDay;

  // Calculate FTE required
  let fteRequired = 0;
  if (data.requiresFTE && data.ftePerUnit) {
    fteRequired = quantity * data.ftePerUnit;
  }

  return {
    nodeId: node.id,
    totalMinutes,
    totalHours,
    totalDays,
    fteRequired,
    effectiveParallelCapacity,
  };
}

/**
 * Calculate results for all nodes in a scenario.
 *
 * @param nodes - Array of flowchart nodes
 * @param edges - Array of flowchart edges
 * @param quantities - Map of node IDs to quantities
 * @returns Complete scenario results
 */
export function calculateScenarioResults(
  nodes: FlowchartNode[],
  edges: FlowchartEdge[],
  quantities: Record<string, number>
): ScenarioResults {
  // Calculate metrics for each node
  const nodeResults: NodeResult[] = nodes.map((node) => {
    const data = node.data as ProcessNodeData;
    const quantity = quantities[node.id] ?? data.defaultQuantity ?? 0;

    const output = calculateNodeMetrics({
      node,
      quantity,
    });

    return {
      nodeId: node.id,
      nodeLabel: data.label || node.id,
      quantity,
      totalMinutes: output.totalMinutes,
      totalHours: output.totalHours,
      fteRequired: output.fteRequired,
      isOnCriticalPath: false, // Will be updated below
      parallelCapacityUsed: output.effectiveParallelCapacity,
    };
  });

  // Prepare node times for critical path calculation
  const nodeTimes: NodeTime[] = nodeResults.map((result) => ({
    nodeId: result.nodeId,
    duration: result.totalMinutes,
  }));

  // Calculate critical path
  let criticalPathDuration = 0;
  let criticalPathNodeIds: string[] = [];

  try {
    const criticalPathResult = findCriticalPath(nodes, edges, nodeTimes);
    criticalPathDuration = criticalPathResult.duration;
    criticalPathNodeIds = criticalPathResult.criticalPath;

    // Update node results with critical path info
    const criticalPathSet = new Set(criticalPathNodeIds);
    nodeResults.forEach((result) => {
      result.isOnCriticalPath = criticalPathSet.has(result.nodeId);
    });
  } catch {
    // If critical path calculation fails (e.g., cycle detected), continue without it
    console.warn('Critical path calculation failed');
  }

  // Calculate totals
  const totalMinutes = nodeResults.reduce((sum, result) => sum + result.totalMinutes, 0);
  const totalHours = nodeResults.reduce((sum, result) => sum + result.totalHours, 0);
  const totalDays = totalHours / WORKING_TIME_DEFAULTS.hoursPerDay;
  const fteRequired = nodeResults.reduce((sum, result) => sum + result.fteRequired, 0);

  return {
    totalMinutes,
    totalHours,
    totalDays,
    fteRequired,
    criticalPathDuration,
    nodeResults,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Format minutes into a human-readable string.
 *
 * @param minutes - Total minutes
 * @returns Formatted string (e.g., "2h 30m" or "45m")
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  if (remainingMinutes === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format FTE to a readable string.
 *
 * @param fte - FTE value
 * @returns Formatted string (e.g., "1.5 FTE")
 */
export function formatFTE(fte: number): string {
  if (fte === 0) {
    return '0 FTE';
  }

  if (fte < 0.1) {
    return '< 0.1 FTE';
  }

  return `${fte.toFixed(1)} FTE`;
}

