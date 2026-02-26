import type {
  FlowchartNode,
  FlowchartEdge,
  ProcessNodeData,
  ScenarioResults,
  NodeResult,
  CalculationInput,
  CalculationOutput,
} from '../types';
import {
  WORKING_TIME_DEFAULTS,
} from '../types';
import type {
  findCriticalPath,
  NodeTime,
} from './pathFinding';

// =============================================================================
// Constants
// =============================================================================

/** Number of working hours in a standard workday */
export const WORKDAY_HOURS = 8;

/** Default efficiency factor (accounts for breaks, meetings, etc.) */
export const DEFAULT_EFFICIENCY_FACTOR = 0.85;

// =============================================================================
// Core Calculation Functions
// =============================================================================

/**
 * Calculates time required for a node based on quantity and unit time.
 *
 * @param quantity - Number of units to process
 * @param unitTimeMinutes - Time required per unit in minutes
 * @returns Object containing time in minutes, hours, and days
 */
export function calculateNodeTime(
  quantity: number,
  unitTimeMinutes: number
): { minutes: number; hours: number; days: number } {
  const minutes = quantity * unitTimeMinutes;
  const hours = minutes / 60;
  const days = hours / WORKDAY_HOURS;

  return {
    minutes,
    hours,
    days,
  };
}

/**
 * Calculates Full-Time Equivalent (FTE) required based on total hours.
 *
 * @param totalHours - Total hours of work required
 * @param efficiencyFactor - Efficiency factor (default: 0.85)
 * @returns Number of FTE required
 */
export function calculateFTE(
  totalHours: number,
  efficiencyFactor: number = DEFAULT_EFFICIENCY_FACTOR
): number {
  if (efficiencyFactor <= 0) {
    throw new Error('Efficiency factor must be greater than 0');
  }
  return totalHours / efficiencyFactor;
}

// =============================================================================
// Formatting Functions
// =============================================================================

/**
 * Formats time in minutes to a human-readable string (e.g., "2h 30m").
 *
 * @param minutes - Time in minutes
 * @returns Formatted time string
 */
export function formatTime(minutes: number): string {
  if (minutes < 0) {
    return '0m';
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);

  const parts: string[] = [];

  if (hours > 0) {
    parts.push(`${hours}h`);
  }

  if (remainingMinutes > 0 || parts.length === 0) {
    parts.push(`${remainingMinutes}m`);
  }

  return parts.join(' ');
}

/**
 * Formats days to a human-readable string (e.g., "3.5 days").
 *
 * @param days - Number of days
 * @returns Formatted days string
 */
export function formatDays(days: number): string {
  if (days < 0) {
    return '0 days';
  }

  // Round to 1 decimal place for readability
  const roundedDays = Math.round(days * 10) / 10;

  if (roundedDays === 1) {
    return '1 day';
  }

  return `${roundedDays} days`;
}

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

/**
 * Calculate the difference between two scenarios.
 *
 * @param baseline - Baseline scenario results
 * @param comparison - Comparison scenario results
 * @returns Object containing differences
 */
export function calculateScenarioDifference(
  baseline: ScenarioResults,
  comparison: ScenarioResults
): {
  totalMinutesDiff: number;
  totalHoursDiff: number;
  totalDaysDiff: number;
  fteDiff: number;
  criticalPathDiff: number;
} {
  return {
    totalMinutesDiff: comparison.totalMinutes - baseline.totalMinutes,
    totalHoursDiff: comparison.totalHours - baseline.totalHours,
    totalDaysDiff: comparison.totalDays - baseline.totalDays,
    fteDiff: comparison.fteRequired - baseline.fteRequired,
    criticalPathDiff: comparison.criticalPathDuration - baseline.criticalPathDuration,
  };
}

/**
 * Calculate percentage change between two values.
 *
 * @param oldValue - Original value
 * @param newValue - New value
 * @returns Percentage change (can be negative)
 */
export function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) {
    return newValue === 0 ? 0 : 100;
  }

  return ((newValue - oldValue) / oldValue) * 100;
}
