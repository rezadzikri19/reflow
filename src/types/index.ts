import type { Node } from '@xyflow/react';

// ============================================================================
// Node Types
// ============================================================================

/**
 * All supported node types for the Process Flowchart Tool
 */
export type ProcessNodeType =
  | 'start'
  | 'end'
  | 'process'
  | 'decision'
  | 'subprocess'
  | 'parallel'
  | 'delay'
  | 'boundaryPort';

// ============================================================================
// Edge Types
// ============================================================================

/**
 * All supported edge/connection types for the Process Flowchart Tool
 */
export type EdgeType = 'smoothstep' | 'bezier' | 'straight' | 'simplebezier';

// ============================================================================
// Unit Types
// ============================================================================

/**
 * Supported unit types for process measurement
 */
export type UnitType =
  | 'documents'
  | 'applications'
  | 'cases'
  | 'customers'
  | 'transactions'
  | 'custom';

// ============================================================================
// Base Node Data
// ============================================================================

/**
 * Base interface for common node properties shared across all node types
 */
export interface BaseNodeData {
  /** Unique identifier for the node */
  id: string;
  /** Display label for the node */
  label: string;
  /** Optional description of what this node represents */
  description?: string;
  /** The type of node */
  nodeType: ProcessNodeType;
  /** Tags for categorizing and filtering nodes */
  tags?: string[];
  /** Index signature to satisfy Record<string, unknown> constraint */
  [key: string]: unknown;
}

// ============================================================================
// Subprocess Port Types
// ============================================================================

/**
 * Port information for subprocess nodes
 */
export interface SubprocessPort {
  /** Unique port ID (e.g., "input-node123", "output-node456-yes") */
  id: string;
  /** The internal node ID this port connects to */
  internalNodeId: string;
  /** The handle ID on the internal node (if applicable) */
  internalHandleId?: string | null;
  /** Whether this is an input or output port */
  direction: 'input' | 'output';
}

/**
 * Data for boundary port nodes (virtual nodes in sheet view)
 */
export interface BoundaryPortNodeData {
  /** Display label showing the external node name */
  label: string;
  /** Whether this is an input or output port */
  direction: 'input' | 'output';
  /** The edge ID this port represents */
  edgeId: string;
  /** The internal node ID this port connects to (primary connection) */
  internalNodeId: string;
  /** The handle ID on the internal node (if applicable) */
  internalHandleId?: string | null;
  /** All internal connections this port has (for multi-connection boundary ports) */
  allInternalConnections?: InternalNodeConnection[];
}

// ============================================================================
// Process Node Data
// ============================================================================

/**
 * Detailed data for process nodes including FTE and time calculations
 */
export interface ProcessNodeData extends BaseNodeData {
  /** Display label for the node */
  label: string;
  /** Optional description of what this node represents */
  description?: string;
  /** The type of unit being processed */
  unitType: UnitType;
  /** Custom unit name when unitType is 'custom' */
  customUnitName?: string;
  /** Time required to process one unit in minutes */
  unitTimeMinutes: number;
  /** Whether this node requires FTE (Full-Time Equivalent) calculation */
  requiresFTE: boolean;
  /** Number of FTE required per unit (if requiresFTE is true) */
  ftePerUnit?: number;
  /** Number of parallel processing capacity (for parallel nodes) */
  parallelCapacity?: number;
  /** Default quantity of units to process */
  defaultQuantity: number;
  /** Tags for categorizing and filtering nodes */
  tags?: string[];
  /** ID of parent subprocess node (for grouped nodes) */
  parentId?: string;
  /** Child node IDs (for subprocess nodes) */
  childNodeIds?: string[];
  /** Input/output ports for subprocess nodes (computed from edges) */
  ports?: SubprocessPort[];
}

// ============================================================================
// Flowchart Node & Edge Types
// ============================================================================

/**
 * Custom flowchart node extending React Flow's Node type
 * Supports both process nodes and boundary port nodes
 */
export type FlowchartNode =
  | Node<ProcessNodeData, Exclude<ProcessNodeType, 'boundaryPort'>>
  | Node<BoundaryPortNodeData, 'boundaryPort'>;

/**
 * Custom style options for edge connections
 */
export interface EdgeStyleOptions {
  /** Stroke color (hex or CSS color) */
  stroke?: string;
  /** Stroke width in pixels */
  strokeWidth?: number;
  /** Dash pattern (e.g., "6,3" for dashed) */
  strokeDasharray?: string;
  /** Whether the edge is animated */
  animated?: boolean;
  /** Edge type (smoothstep, bezier, straight, simplebezier) */
  edgeType?: EdgeType;
}

/**
 * Information about an internal node connection for boundary ports
 */
export interface InternalNodeConnection {
  /** The internal node ID */
  nodeId: string;
  /** The handle ID on the internal node (if applicable) */
  handleId?: string | null;
  /** Optional label for this connection */
  label?: string;
  /** Optional custom style for this connection */
  style?: EdgeStyleOptions;
}

/**
 * Custom flowchart edge extending React Flow's Edge type
 */
export interface FlowchartEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  animated?: boolean;
  hidden?: boolean;
  deletable?: boolean;
  selectable?: boolean;
  data?: Record<string, unknown>;
  selected?: boolean;
  markerStart?: string;
  markerEnd?: string;
  zIndex?: number;
  label?: string;
  style?: React.CSSProperties;
  className?: string;
  /** Original source before grouping (for ungrouping restoration) - single connection */
  originalSource?: string;
  /** Original target before grouping (for ungrouping restoration) - single connection */
  originalTarget?: string;
  /** Original source handle before grouping - single connection */
  originalSourceHandle?: string | null;
  /** Original target handle before grouping - single connection */
  originalTargetHandle?: string | null;
  /** All internal source nodes this boundary port connects to (for grouped boundary ports) */
  originalSources?: InternalNodeConnection[];
  /** All internal target nodes this boundary port connects to (for grouped boundary ports) */
  originalTargets?: InternalNodeConnection[];
  /** ID of the subprocess this edge belongs to (for internal edges) */
  subprocessId?: string;
}

// ============================================================================
// Flowchart Interface
// ============================================================================

/**
 * Complete flowchart definition including nodes, edges, and metadata
 */
export interface Flowchart {
  /** Unique identifier for the flowchart */
  id: string;
  /** Display name of the flowchart */
  name: string;
  /** Optional description of the flowchart */
  description?: string;
  /** Array of nodes in the flowchart */
  nodes: FlowchartNode[];
  /** Array of edges connecting nodes */
  edges: FlowchartEdge[];
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

// ============================================================================
// Scenario & Results Types
// ============================================================================

/**
 * Individual node calculation result
 */
export interface NodeResult {
  /** Node ID */
  nodeId: string;
  /** Node label */
  nodeLabel: string;
  /** Quantity of units processed */
  quantity: number;
  /** Time to process all units in minutes */
  totalMinutes: number;
  /** Time to process all units in hours */
  totalHours: number;
  /** FTE required for this node */
  fteRequired: number;
  /** Whether this node is on the critical path */
  isOnCriticalPath: boolean;
  /** Parallel capacity used (if applicable) */
  parallelCapacityUsed?: number;
}

/**
 * Results of scenario calculations
 */
export interface ScenarioResults {
  /** Total processing time in minutes */
  totalMinutes: number;
  /** Total processing time in hours */
  totalHours: number;
  /** Total processing time in days (8-hour workday) */
  totalDays: number;
  /** Total FTE required across all nodes */
  fteRequired: number;
  /** Duration of the critical path in minutes */
  criticalPathDuration: number;
  /** Individual results for each node */
  nodeResults: NodeResult[];
}

/**
 * Scenario definition for running calculations with different quantities
 */
export interface Scenario {
  /** Unique identifier for the scenario */
  id: string;
  /** ID of the flowchart this scenario belongs to */
  flowchartId: string;
  /** Display name of the scenario */
  name: string;
  /** Optional description of the scenario */
  description?: string;
  /** Map of node IDs to quantities for this scenario */
  quantities: Record<string, number>;
  /** Calculated results for this scenario */
  results?: ScenarioResults;
  /** Whether this is the baseline scenario */
  isBaseline: boolean;
  /** Color for chart visualization (hex code) */
  color: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

// ============================================================================
// Calculation Types
// ============================================================================

/**
 * Input for calculation operations
 */
export interface CalculationInput {
  /** Node to calculate for */
  node: FlowchartNode;
  /** Quantity of units to process */
  quantity: number;
  /** Working hours per day (default: 8) */
  workingHoursPerDay?: number;
  /** Working days per week (default: 5) */
  workingDaysPerWeek?: number;
}

/**
 * Output from calculation operations
 */
export interface CalculationOutput {
  /** Node ID */
  nodeId: string;
  /** Total time in minutes */
  totalMinutes: number;
  /** Total time in hours */
  totalHours: number;
  /** Total time in days */
  totalDays: number;
  /** FTE required */
  fteRequired: number;
  /** Effective parallel capacity */
  effectiveParallelCapacity: number;
}

// ============================================================================
// Graph Algorithm Types (for critical path calculation)
// ============================================================================

/**
 * Adjacency list representation of the graph
 */
export interface AdjacencyList {
  [nodeId: string]: string[];
}

/**
 * Node time duration information
 */
export interface NodeTime {
  nodeId: string;
  duration: number;
}

/**
 * Node schedule information for critical path analysis
 */
export interface NodeSchedule {
  nodeId: string;
  earliestStart: number;
  earliestFinish: number;
  latestStart: number;
  latestFinish: number;
  slack: number;
  isCritical: boolean;
}

/**
 * Result of critical path calculation
 */
export interface CriticalPathResult {
  duration: number;
  criticalPath: string[];
  nodeSchedules: NodeSchedule[];
}

/**
 * Result of topological sort
 */
export interface TopologicalSortResult {
  sorted: string[];
  hasCycle: boolean;
}

// ============================================================================
// Utility Constants
// ============================================================================

/**
 * Default values for new process nodes
 */
export const DEFAULT_PROCESS_NODE_DATA: Partial<ProcessNodeData> = {
  unitType: 'documents',
  unitTimeMinutes: 0,
  requiresFTE: false,
  defaultQuantity: 1,
  tags: [],
};

/**
 * Default colors for scenarios
 */
export const SCENARIO_COLORS: readonly string[] = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
] as const;

/**
 * Working time configuration defaults
 */
export const WORKING_TIME_DEFAULTS = {
  hoursPerDay: 8,
  daysPerWeek: 5,
  weeksPerMonth: 4.33,
  monthsPerYear: 12,
} as const;
