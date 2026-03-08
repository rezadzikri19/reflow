import type { Node, EdgeMarkerType } from '@xyflow/react';

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
  | 'boundaryPort'
  | 'junction'
  | 'reference'
  | 'manualProcess'
  | 'connector'
  | 'terminator';

/**
 * All supported annotation types for visual elements
 * These are purely visual and do not affect process logic
 */
export type AnnotationType =
  | 'annotationRectangle'
  | 'annotationSquare'
  | 'annotationCircle'
  | 'annotationLine'
  | 'annotationTextBox';

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
// Frequency Types
// ============================================================================

/**
 * Supported frequency types for process nodes
 */
export type FrequencyType =
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'asNeeded';

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
  /** Documents associated with this node */
  documents?: string[];
  /** Data elements associated with this node */
  data?: string[];
  /** Role assigned to this node (single value, indicates responsibility) */
  role?: string;
  /** Whether the node is locked and cannot be moved */
  locked?: boolean;
  /** Current issues, bottlenecks, or inefficiencies */
  painPoints?: string;
  /** Proposed optimizations, automation ideas, or solutions */
  improvement?: string;
  /** How often this process is performed */
  frequency?: FrequencyType;
  /** Index signature to satisfy Record<string, unknown> constraint */
  [key: string]: unknown;
}

// ============================================================================
// Subprocess Port Types
// ============================================================================

/**
 * @deprecated Legacy port format. Use the unified `Port` type instead.
 * Port information for subprocess nodes (legacy format)
 */
export interface SubprocessPort {
  /** Unique port ID (legacy format: "input-node123", "output-node456-yes") */
  id: string;
  /** The internal node ID this port connects to */
  internalNodeId: string;
  /** The handle ID on the internal node (if applicable) */
  internalHandleId?: string | null;
  /** Whether this is an input or output port */
  direction: 'input' | 'output';
}

/**
 * Port definition for subprocess nodes
 * Unified port type for both auto-created and manually added ports
 */
export interface Port {
  /** Unique port ID (format: "port-in-{uuid}" or "port-out-{uuid}") */
  id: string;
  /** Whether this is an input or output port */
  direction: 'input' | 'output';
  /** Display label for the port */
  label: string;
  /** Optional stored position for the boundary port node in sheet view */
  position?: { x: number; y: number };
  /** Whether the port is locked and cannot be moved */
  locked?: boolean;
  /** Internal connections for this port (nodes inside the subprocess connected to this port) */
  internalConnections?: InternalNodeConnection[];
}

/**
 * @deprecated Use `Port` instead. This alias is kept for backward compatibility.
 */
export type ManualPort = Port;

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
  /** The port ID in the subprocess node's port array */
  portId?: string;
  /** Whether the node is locked and cannot be moved */
  locked?: boolean;
  /** Index signature to satisfy Record<string, unknown> constraint */
  [key: string]: unknown;
}

// ============================================================================
// Annotation Node Data
// ============================================================================

/**
 * Text alignment options for text box annotations
 */
export type TextAlignment = 'left' | 'center' | 'right';
export type TextVerticalAlignment = 'top' | 'middle' | 'bottom';

/**
 * Data for annotation nodes (visual elements that don't affect process logic)
 */
export interface AnnotationNodeData {
  /** Unique identifier for the annotation */
  id: string;
  /** The type of annotation element */
  annotationType: AnnotationType;
  /** Text content (for textBox type) */
  label?: string;
  /** Fill/background color (hex or CSS color) */
  fillColor?: string;
  /** Border/stroke color (hex or CSS color) */
  strokeColor?: string;
  /** Border/stroke width in pixels */
  strokeWidth?: number;
  /** Whether to hide the border/stroke */
  hideBorder?: boolean;
  /** Whether the annotation is locked and cannot be moved */
  locked?: boolean;
  /** Z-index for layering (negative = behind process nodes, positive = in front) */
  zIndex?: number;
  /** Text horizontal alignment (for textBox type) */
  textAlign?: TextAlignment;
  /** Text vertical alignment (for textBox type) */
  textVerticalAlign?: TextVerticalAlignment;
  /** Font size in pixels (for textBox type) */
  fontSize?: number;
  /** Font weight (for textBox type) */
  fontWeight?: 'normal' | 'bold';
  /** Font style (for textBox type) */
  fontStyle?: 'normal' | 'italic';
  /** Text color (for textBox type) */
  textColor?: string;
  /** Index signature to satisfy Record<string, unknown> constraint */
  [key: string]: unknown;
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
  /** Documents associated with this node */
  documents?: string[];
  /** Data elements associated with this node */
  data?: string[];
  /** Role assigned to this node (single value, indicates responsibility) */
  role?: string;
  /** ID of parent subprocess node (for grouped nodes) */
  parentId?: string;
  /** Child node IDs (for subprocess nodes) */
  childNodeIds?: string[];
  /** Input/output ports for subprocess nodes (computed from edges) */
  ports?: SubprocessPort[];
  /** Input ports for subprocess (unified - includes both auto-created and manual) */
  inputPorts?: Port[];
  /** Output ports for subprocess (unified - includes both auto-created and manual) */
  outputPorts?: Port[];
  /** @deprecated Use inputPorts instead */
  manualInputPorts?: ManualPort[];
  /** @deprecated Use outputPorts instead */
  manualOutputPorts?: ManualPort[];
}

// ============================================================================
// Flowchart Node & Edge Types
// ============================================================================

/**
 * Custom flowchart node extending React Flow's Node type
 * Supports process nodes, boundary port nodes, and annotation nodes
 */
export type FlowchartNode =
  | Node<ProcessNodeData, Exclude<ProcessNodeType, 'boundaryPort'>>
  | Node<BoundaryPortNodeData, 'boundaryPort'>
  | Node<AnnotationNodeData, AnnotationType>;

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
 * Control point for custom edge routing
 */
export interface EdgeControlPoint {
  /** Unique identifier for the control point */
  id: string;
  /** X position in the flowchart coordinate system */
  x: number;
  /** Y position in the flowchart coordinate system */
  y: number;
}

/**
 * Data stored on edges for boundary port positioning
 */
export interface EdgeData {
  /** Position of the input boundary port in subprocess sheet view */
  boundaryPortPosition?: { x: number; y: number };
  /** Position of the output boundary port in subprocess sheet view */
  boundaryPortOutPosition?: { x: number; y: number };
  /** Custom control points for edge routing */
  controlPoints?: EdgeControlPoint[];
  [key: string]: unknown;
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
  data?: EdgeData;
  selected?: boolean;
  markerStart?: EdgeMarkerType;
  markerEnd?: EdgeMarkerType;
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
  /** Direction of the connection for hybrid handles - indicates if source port is acting as input or output */
  connectionDirection?: 'input' | 'output';
}

// ============================================================================
// Sheet Interface (Independent Diagrams within a Flowchart)
// ============================================================================

/**
 * A single sheet within a flowchart workbook.
 * Sheets contain independent diagrams that can be switched between like Excel tabs.
 */
export interface Sheet {
  /** Unique identifier for the sheet */
  id: string;
  /** Display name of the sheet */
  name: string;
  /** Array of nodes in this sheet */
  nodes: FlowchartNode[];
  /** Array of edges connecting nodes in this sheet */
  edges: FlowchartEdge[];
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
}

// ============================================================================
// Flowchart Interface
// ============================================================================

/**
 * Complete flowchart definition including sheets and metadata.
 * A flowchart contains multiple sheets (like Excel workbook tabs),
 * where each sheet is an independent diagram.
 */
export interface Flowchart {
  /** Unique identifier for the flowchart */
  id: string;
  /** Display name of the flowchart */
  name: string;
  /** Optional description of the flowchart */
  description?: string;
  /** Array of sheets in the flowchart (each sheet is an independent diagram) */
  sheets: Sheet[];
  /** ID of the currently active sheet */
  activeSheetId: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  /** Schema version for migration purposes */
  version?: number;
}

// Legacy format for migration support
export interface LegacyFlowchart {
  id: string;
  name: string;
  description?: string;
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
  createdAt: Date;
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
  documents: [],
  data: [],
};

/**
 * Default values for new annotation nodes
 */
export const DEFAULT_ANNOTATION_DATA: Partial<AnnotationNodeData> = {
  fillColor: 'transparent',
  strokeColor: '#64748b', // slate-500
  strokeWidth: 2,
  hideBorder: false,
  locked: false,
  zIndex: -1, // Behind process nodes by default
  // Text formatting defaults
  textAlign: 'left',
  textVerticalAlign: 'top',
  fontSize: 14,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textColor: '#334155', // slate-700
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
