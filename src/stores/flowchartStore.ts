import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import type {
  FlowchartNode,
  FlowchartEdge,
  ProcessNodeData,
  ProcessNodeType,
  AnnotationType,
  AnnotationNodeData,
  EdgeType,
  EdgeStyleOptions,
  Port,
  InternalNodeConnection,
  FrequencyType,
  UnitType,
  Sheet,
  LegacyFlowchart,
  EdgeControlPoint,
} from '../types';
import {
  DEFAULT_PROCESS_NODE_DATA,
  DEFAULT_ANNOTATION_DATA,
} from '../types';
import type {
  FlowchartRecord,
} from '../db/database';
import { getDescendantIds } from '../utils/nodeHierarchy';

// Re-export the FlowchartRecord type for use in migration functions
type FlowchartRecordWithVersion = FlowchartRecord & { version?: number };
import {
  saveFlowchart as dbSaveFlowchart,
  loadFlowchart as dbLoadFlowchart,
} from '../db/database';
import { insertControlPointSorted } from '../utils/edgePathUtils';

// =============================================================================
// Migration Utilities
// =============================================================================

const CURRENT_SCHEMA_VERSION = 3;

/**
 * Migrate legacy flowchart format (v1: direct nodes/edges) to new sheet format (v2)
 */
function migrateToSheetFormat(legacy: LegacyFlowchart): Sheet[] {
  const mainSheetId = uuidv4();
  return [{
    id: mainSheetId,
    name: 'Main',
    nodes: legacy.nodes,
    edges: legacy.edges,
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt,
  }];
}

/**
 * Check if a record is in legacy format (v1) or new sheet format (v2+)
 */
function isLegacyFormat(record: FlowchartRecord): boolean {
  // Legacy format has nodes/edges at root level
  return 'nodes' in record && Array.isArray((record as unknown as LegacyFlowchart).nodes);
}

/**
 * Migrate port property names and ID formats
 * - Renames inputPorts → inputPorts, outputPorts → outputPorts
 * - Converts old port ID formats to new unified format:
 *   - "manual-input-{uuid}" → "port-in-{uuid}"
 *   - "manual-output-{uuid}" → "port-out-{uuid}"
 *   - "input-{externalNodeId}" → "port-in-{uuid}" (generates new UUID)
 *   - "output-{externalNodeId}" → "port-out-{uuid}" (generates new UUID)
 */
function migratePorts(node: FlowchartNode): FlowchartNode {
  if (node.type !== 'subprocess') return node;

  const data = node.data as ProcessNodeData;
  const migratedData = { ...data };
  let hasChanges = false;

  // Migrate manualInputPorts → inputPorts
  if (data.manualInputPorts && !data.inputPorts) {
    hasChanges = true;
    migratedData.inputPorts = (data.manualInputPorts as Port[]).map(port => {
      let newId = port.id;
      // Convert old ID formats to new unified format
      if (port.id.startsWith('manual-input-')) {
        newId = port.id.replace('manual-input-', 'port-in-');
      } else if (port.id.startsWith('input-') && !port.id.startsWith('port-in-')) {
        // Old auto-created format - generate new UUID
        newId = `port-in-${uuidv4()}`;
      }
      return { ...port, id: newId };
    });
    delete migratedData.manualInputPorts;
  }

  // Migrate manualOutputPorts → outputPorts
  if (data.manualOutputPorts && !data.outputPorts) {
    hasChanges = true;
    migratedData.outputPorts = (data.manualOutputPorts as Port[]).map(port => {
      let newId = port.id;
      // Convert old ID formats to new unified format
      if (port.id.startsWith('manual-output-')) {
        newId = port.id.replace('manual-output-', 'port-out-');
      } else if (port.id.startsWith('output-') && !port.id.startsWith('port-out-')) {
        // Old auto-created format - generate new UUID
        newId = `port-out-${uuidv4()}`;
      }
      return { ...port, id: newId };
    });
    delete migratedData.manualOutputPorts;
  }

  // Also check for existing inputPorts/outputPorts that might have old ID formats
  if (data.inputPorts) {
    const migratedInputPorts = data.inputPorts.map(port => {
      let newId = port.id;
      if (port.id.startsWith('manual-input-')) {
        newId = port.id.replace('manual-input-', 'port-in-');
      } else if (port.id.startsWith('input-') && !port.id.startsWith('port-in-')) {
        newId = `port-in-${uuidv4()}`;
      }
      return newId !== port.id ? { ...port, id: newId } : port;
    });
    if (migratedInputPorts.some((p, i) => p.id !== data.inputPorts![i].id)) {
      hasChanges = true;
      migratedData.inputPorts = migratedInputPorts;
    }
  }

  if (data.outputPorts) {
    const migratedOutputPorts = data.outputPorts.map(port => {
      let newId = port.id;
      if (port.id.startsWith('manual-output-')) {
        newId = port.id.replace('manual-output-', 'port-out-');
      } else if (port.id.startsWith('output-') && !port.id.startsWith('port-out-')) {
        newId = `port-out-${uuidv4()}`;
      }
      return newId !== port.id ? { ...port, id: newId } : port;
    });
    if (migratedOutputPorts.some((p, i) => p.id !== data.outputPorts![i].id)) {
      hasChanges = true;
      migratedData.outputPorts = migratedOutputPorts;
    }
  }

  return hasChanges ? { ...node, data: migratedData } : node;
}

/**
 * Migrate a sheet's nodes to the new port format
 */
function migrateSheetPorts(sheet: Sheet): Sheet {
  return {
    ...sheet,
    nodes: sheet.nodes.map(migratePorts),
  };
}

/**
 * Check if a record needs port migration (schema version < 3)
 */
function needsPortMigration(record: FlowchartRecordWithVersion): boolean {
  return !record.version || record.version < 3;
}

// =============================================================================
// Node Filter Types
// =============================================================================

/**
 * Filter mode type for toggling between simple and advanced filter
 */
export type FilterMode = 'simple' | 'advanced';

/**
 * Cursor mode type for canvas interaction
 */
export type CursorMode = 'select' | 'pan';

/**
 * Filter state for node filtering functionality
 */
export interface NodeFilterState {
  /** Selected tags for filtering */
  filterTags: string[];
  /** Selected roles for filtering */
  filterRoles: string[];
  /** Selected documents for filtering */
  filterDocuments: string[];
  /** Selected data elements for filtering */
  filterData: string[];
  /** Text search query for filtering across label, description, painPoints, improvement */
  filterSearchText: string;
  /** Selected node types for filtering */
  filterNodeTypes: ProcessNodeType[];
  /** Selected frequencies for filtering */
  filterFrequencies: FrequencyType[];
  /** Selected unit types for filtering */
  filterUnitTypes: UnitType[];
  /** Filter by locked status (null = any) */
  filterLocked: boolean | null;
  /** Filter by requiresFTE status (null = any) */
  filterRequiresFTE: boolean | null;
  /** Filter by presence of pain points (null = any) */
  filterHasPainPoints: boolean | null;
  /** Filter by presence of improvement (null = any) */
  filterHasImprovement: boolean | null;
  /** Selected sheet IDs for filtering */
  filterSheets: string[];
  /** Whether the filter panel is visible */
  isFilterPanelOpen: boolean;
  /** Current filter mode: simple (chip-based) or advanced (rule-based) */
  filterMode: FilterMode;
}

// =============================================================================
// Store Types
// =============================================================================

// =============================================================================
// History Types
// =============================================================================

/**
 * Snapshot of sheet state for undo/redo functionality
 */
export interface SheetSnapshot {
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
  actionType: string;
  timestamp: number;
}

interface FlowchartState {
  /** Array of sheets (independent diagrams within the flowchart) */
  sheets: Sheet[];
  /** ID of the currently active sheet (for switching between independent diagrams) */
  activeSheetId: string;
  /** Currently active subprocess ID (null = main flowchart view, ID = viewing that subprocess) */
  activeSubprocessId: string | null;
  /** Stack of parent subprocess IDs for breadcrumb navigation */
  subprocessNavigationStack: string[];
  /** Nodes from the active sheet (for backward compatibility - derived from sheets) */
  nodes: FlowchartNode[];
  /** Edges from the active sheet (for backward compatibility - derived from sheets) */
  edges: FlowchartEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  flowchartId: string | null;
  flowchartName: string;
  isDirty: boolean;
  showGrid: boolean;
  showMinimap: boolean;
  /** Node version counter for forcing re-renders */
  nodeVersion: number;
  /** Edge version counter for forcing re-renders */
  edgeVersion: number;
  /** Default edge type for new connections */
  defaultEdgeType: EdgeType;
  /** Node filter state */
  filterTags: string[];
  filterRoles: string[];
  filterDocuments: string[];
  filterData: string[];
  filterSearchText: string;
  filterNodeTypes: ProcessNodeType[];
  filterFrequencies: FrequencyType[];
  filterUnitTypes: UnitType[];
  filterLocked: boolean | null;
  filterRequiresFTE: boolean | null;
  filterHasPainPoints: boolean | null;
  filterHasImprovement: boolean | null;
  filterSystems: string[];
  filterHasRisk: boolean | null;
  filterSheets: string[];
  isFilterPanelOpen: boolean;
  filterMode: FilterMode;
  /** Clipboard state for copy/paste */
  clipboardNodes: FlowchartNode[];
  clipboardEdges: FlowchartEdge[];
  /** Source flowchart ID for clipboard (for cross-flowchart paste) */
  clipboardSourceFlowchartId: string | null;
  /** Source sheet ID for clipboard (for cross-sheet paste) */
  clipboardSourceSheetId: string | null;
  /** History state for undo/redo */
  past: SheetSnapshot[];
  future: SheetSnapshot[];
  /** Maximum history depth */
  maxHistoryDepth: number;
  /** Highlighted node IDs from ListView selection (for Flowchart visual filtering) */
  highlightedNodeIds: string[];
  /** Current cursor mode for canvas interaction */
  cursorMode: CursorMode;
}

// =============================================================================
// Computed Selectors (for backward compatibility)
// =============================================================================

/**
 * Get nodes from the active sheet
 * This selector provides backward compatibility for code that expects state.nodes
 */
export const getActiveNodes = (state: FlowchartState): FlowchartNode[] => {
  const sheet = state.sheets.find(s => s.id === state.activeSheetId);
  return sheet?.nodes || [];
};

/**
 * Get edges from the active sheet
 * This selector provides backward compatibility for code that expects state.edges
 */
export const getActiveEdges = (state: FlowchartState): FlowchartEdge[] => {
  const sheet = state.sheets.find(s => s.id === state.activeSheetId);
  return sheet?.edges || [];
};

interface FlowchartActions {
  addNode: (type: ProcessNodeType, position: { x: number; y: number }) => void;
  addAnnotationNode: (type: AnnotationType, position: { x: number; y: number }) => void;
  updateAnnotationNode: (nodeId: string, data: Partial<AnnotationNodeData>) => void;
  createReferenceToNode: (referencedNodeId: string, position?: { x: number; y: number }) => string | null;
  updateNode: (nodeId: string, data: Partial<ProcessNodeData>) => void;
  deleteNode: (nodeId: string) => void;
  deleteNodes: (nodeIds: string[]) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setSelectedEdgeId: (edgeId: string | null) => void;
  addEdge: (source: string, target: string, sourceHandle?: string, targetHandle?: string) => void;
  updateEdge: (edgeId: string, data: Record<string, unknown>) => void;
  deleteEdge: (edgeId: string) => void;
  deleteEdges: (edgeIds: string[]) => void;
  setNodes: (nodes: FlowchartNode[]) => void;
  setEdges: (edges: FlowchartEdge[]) => void;
  saveFlowchart: () => Promise<void>;
  loadFlowchart: (id: string) => Promise<boolean>;
  loadFlowchartFromVersion: (version: { sheets: Sheet[]; activeSheetId: string }) => void;
  newFlowchart: (name?: string) => void;
  markDirty: () => void;
  reset: () => void;
  toggleGrid: () => void;
  toggleMinimap: () => void;
  setDefaultEdgeType: (edgeType: EdgeType) => void;
  // Subprocess grouping actions
  groupNodesIntoSubprocess: (nodeIds: string[], label?: string) => string | null;
  ungroupSubprocess: (subprocessId: string) => void;
  // Subprocess navigation actions (hierarchical drill-down)
  openSubprocessSheet: (subprocessId: string) => void;
  closeActiveSubprocess: () => void;
  navigateBackSubprocess: () => void;
  navigateToSubprocess: (subprocessId: string | null) => void;
  // Sheet management actions (independent diagrams within a flowchart)
  createSheet: (name?: string) => string;
  deleteSheet: (sheetId: string) => void;
  renameSheet: (sheetId: string, name: string) => void;
  setActiveSheet: (sheetId: string) => void;
  duplicateSheet: (sheetId: string) => string;
  getActiveSheet: () => Sheet | undefined;
  getNodes: () => FlowchartNode[];
  getEdges: () => FlowchartEdge[];
  // Boundary port connection actions
  updateBoundaryPortConnection: (
    originalEdgeId: string,
    direction: 'input' | 'output',
    newInternalNodeId: string,
    newHandleId?: string | null
  ) => void;
  // Add a new boundary port connection (creates a new edge for multiple connections support)
  addBoundaryPortEdge: (
    originalEdgeId: string,
    direction: 'input' | 'output',
    newInternalNodeId: string,
    newHandleId?: string | null
  ) => void;
  // Remove a specific boundary port connection (removes one internal connection from the array)
  removeBoundaryPortConnection: (
    originalEdgeId: string,
    direction: 'input' | 'output',
    internalNodeId: string,
    handleId?: string | null
  ) => void;
  // Update style/label of a specific boundary port connection
  updateBoundaryConnectionStyle: (
    originalEdgeId: string,
    direction: 'input' | 'output',
    connectionIndex: number,
    style?: EdgeStyleOptions,
    label?: string
  ) => void;
  // Manual port actions for subprocess nodes
  addManualPort: (subprocessId: string, direction: 'input' | 'output', label?: string) => string;
  updateManualPort: (subprocessId: string, portId: string, updates: Partial<Pick<Port, 'label' | 'position' | 'locked' | 'handlePosition'>>) => void;
  deleteManualPort: (subprocessId: string, portId: string) => void;
  // Manual port internal connection actions
  addManualPortConnection: (
    subprocessId: string,
    portId: string,
    internalNodeId: string,
    handleId?: string | null
  ) => void;
  removeManualPortConnection: (
    subprocessId: string,
    portId: string,
    internalNodeId: string,
    handleId?: string | null
  ) => void;
  // Lock/unlock actions
  lockNodes: (nodeIds: string[]) => void;
  unlockNodes: (nodeIds: string[]) => void;
  // Filter actions
  setFilterTags: (tags: string[]) => void;
  setFilterRoles: (roles: string[]) => void;
  setFilterDocuments: (documents: string[]) => void;
  setFilterData: (data: string[]) => void;
  setFilterSearchText: (text: string) => void;
  setFilterNodeTypes: (nodeTypes: ProcessNodeType[]) => void;
  setFilterFrequencies: (frequencies: FrequencyType[]) => void;
  setFilterUnitTypes: (unitTypes: UnitType[]) => void;
  setFilterLocked: (locked: boolean | null) => void;
  setFilterRequiresFTE: (requiresFTE: boolean | null) => void;
  setFilterHasPainPoints: (hasPainPoints: boolean | null) => void;
  setFilterHasImprovement: (hasImprovement: boolean | null) => void;
  setFilterSystems: (systems: string[]) => void;
  setFilterHasRisk: (hasRisk: boolean | null) => void;
  setFilterSheets: (sheets: string[]) => void;
  clearAllFilters: () => void;
  toggleFilterPanel: () => void;
  setFilterPanelOpen: (isOpen: boolean) => void;
  setFilterMode: (mode: FilterMode) => void;
  setCursorMode: (mode: CursorMode) => void;
  // Highlighted nodes actions (ListView -> Flowchart visual filtering)
  setHighlightedNodes: (nodeIds: string[]) => void;
  toggleHighlightedNode: (nodeId: string) => void;
  clearHighlightedNodes: () => void;
  // Clipboard actions (copy/paste)
  copySelectedNodes: () => void;
  pasteNodes: (position?: { x: number; y: number }) => void;
  cutSelectedNodes: () => void;
  hasClipboardContent: () => boolean;
  getClipboardSourceInfo: () => { nodeCount: number; edgeCount: number; sourceFlowchartId: string | null; sourceSheetId: string | null; isFromCurrentFlowchart: boolean } | null;
  // History actions (undo/redo)
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clearHistory: () => void;
  saveSnapshot: (actionType: string) => void;
  // Control point actions for edge routing
  addControlPoint: (edgeId: string, position: { x: number; y: number }) => void;
  updateControlPoint: (edgeId: string, pointId: string, position: { x: number; y: number }) => void;
  removeControlPoint: (edgeId: string, pointId: string) => void;
  clearControlPoints: (edgeId: string) => void;
  // Control point actions for boundary edge routing (inside sub-processes)
  addBoundaryEdgeControlPoint: (subprocessId: string, portId: string, direction: 'input' | 'output', connectionIndex: number, position: { x: number; y: number }) => void;
  updateBoundaryEdgeControlPoint: (subprocessId: string, portId: string, direction: 'input' | 'output', connectionIndex: number, pointId: string, position: { x: number; y: number }) => void;
  removeBoundaryEdgeControlPoint: (subprocessId: string, portId: string, direction: 'input' | 'output', connectionIndex: number, pointId: string) => void;
  // Repair/cleanup actions
  repairChildNodeIds: () => void;
}

type FlowchartStore = FlowchartState & FlowchartActions;

// =============================================================================
// Initial State
// =============================================================================

const DEFAULT_SHEET_ID = 'main-sheet';

const initialState: FlowchartState = {
  sheets: [{
    id: DEFAULT_SHEET_ID,
    name: 'Main',
    nodes: [],
    edges: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }],
  activeSheetId: DEFAULT_SHEET_ID,
  activeSubprocessId: null,
  subprocessNavigationStack: [],
  nodes: [], // Derived from active sheet for backward compatibility
  edges: [], // Derived from active sheet for backward compatibility
  selectedNodeId: null,
  selectedEdgeId: null,
  flowchartId: null,
  flowchartName: 'Untitled Flowchart',
  isDirty: false,
  showGrid: true,
  showMinimap: true,
  nodeVersion: 0,
  edgeVersion: 0,
  defaultEdgeType: 'smoothstep',
  filterTags: [],
  filterRoles: [],
  filterDocuments: [],
  filterData: [],
  filterSearchText: '',
  filterNodeTypes: [],
  filterFrequencies: [],
  filterUnitTypes: [],
  filterLocked: null,
  filterRequiresFTE: null,
  filterHasPainPoints: null,
  filterHasImprovement: null,
  filterSystems: [],
  filterHasRisk: null,
  filterSheets: [],
  isFilterPanelOpen: false,
  filterMode: 'simple',
  // Clipboard state
  clipboardNodes: [],
  clipboardEdges: [],
  clipboardSourceFlowchartId: null,
  clipboardSourceSheetId: null,
  // History state
  past: [],
  future: [],
  maxHistoryDepth: 50,
  // Highlighted nodes for visual filtering
  highlightedNodeIds: [],
  // Cursor mode for canvas interaction
  cursorMode: 'select',
};

// =============================================================================
// Helper function to sync nodes/edges from active sheet
// =============================================================================

const syncNodesAndEdgesFromActiveSheet = (state: FlowchartState) => {
  const sheet = state.sheets.find(s => s.id === state.activeSheetId);
  if (sheet) {
    state.nodes = sheet.nodes;
    state.edges = sheet.edges;
  }
};

// =============================================================================
// Store Definition
// =============================================================================

export const useFlowchartStore = create<FlowchartStore>()(
  persist(
    immer((set, get) => ({
      ...initialState,

      // =============================================================================
      // Sheet Helper Methods
      // =============================================================================

      getActiveSheet: (): Sheet | undefined => {
        const state = get();
        return state.sheets.find(s => s.id === state.activeSheetId);
      },

      getNodes: (): FlowchartNode[] => {
        const state = get();
        const sheet = state.sheets.find(s => s.id === state.activeSheetId);
        return sheet?.nodes || [];
      },

      getEdges: (): FlowchartEdge[] => {
        const state = get();
        const sheet = state.sheets.find(s => s.id === state.activeSheetId);
        return sheet?.edges || [];
      },

      // =============================================================================
      // Sheet Management Actions
      // =============================================================================

      createSheet: (name?: string): string => {
        const id = uuidv4();
        const now = new Date();

        set((state) => {
          const sheetName = name || `Sheet ${state.sheets.length + 1}`;
          state.sheets.push({
            id,
            name: sheetName,
            nodes: [],
            edges: [],
            createdAt: now,
            updatedAt: now,
          });
          state.activeSheetId = id;
          state.activeSubprocessId = null;
          state.subprocessNavigationStack = [];
          state.selectedNodeId = null;
          state.isDirty = true;
          // Sync nodes/edges from the new active sheet (empty)
          syncNodesAndEdgesFromActiveSheet(state);
        });

        return id;
      },

      deleteSheet: (sheetId: string) => {
        set((state) => {
          // Don't delete if it's the only sheet
          if (state.sheets.length <= 1) return;

          const sheetIndex = state.sheets.findIndex(s => s.id === sheetId);
          if (sheetIndex === -1) return;

          state.sheets.splice(sheetIndex, 1);

          // If the deleted sheet was active, switch to the first sheet
          if (state.activeSheetId === sheetId) {
            state.activeSheetId = state.sheets[0].id;
            state.activeSubprocessId = null;
            state.subprocessNavigationStack = [];
            state.selectedNodeId = null;
            // Sync nodes/edges from the new active sheet
            syncNodesAndEdgesFromActiveSheet(state);
          }

          state.isDirty = true;
        });
      },

      renameSheet: (sheetId: string, name: string) => {
        set((state) => {
          const sheet = state.sheets.find(s => s.id === sheetId);
          if (sheet) {
            sheet.name = name;
            sheet.updatedAt = new Date();
            state.isDirty = true;
          }
        });
      },

      setActiveSheet: (sheetId: string) => {
        set((state) => {
          const sheet = state.sheets.find(s => s.id === sheetId);
          if (sheet) {
            state.activeSheetId = sheetId;
            state.activeSubprocessId = null;
            state.subprocessNavigationStack = [];
            state.selectedNodeId = null;
            state.selectedEdgeId = null;
            // Clear selection on all sheets to prevent copy/paste issues
            state.sheets.forEach(s => {
              s.nodes.forEach(n => { n.selected = false; });
            });
            // Sync nodes/edges from the new active sheet
            syncNodesAndEdgesFromActiveSheet(state);
          }
        });
      },

      duplicateSheet: (sheetId: string): string => {
        const state = get();
        const sheet = state.sheets.find(s => s.id === sheetId);
        if (!sheet) return '';

        const newId = uuidv4();
        const now = new Date();

        set((state) => {
          state.sheets.push({
            id: newId,
            name: `${sheet.name} (Copy)`,
            nodes: JSON.parse(JSON.stringify(sheet.nodes)), // Deep clone
            edges: JSON.parse(JSON.stringify(sheet.edges)), // Deep clone
            createdAt: now,
            updatedAt: now,
          });
          state.isDirty = true;
        });

        return newId;
      },

      // =============================================================================
      // Node Actions (modified to work within active sheet)
      // =============================================================================

      addNode: (type: ProcessNodeType, position: { x: number; y: number }) => {
        const id = uuidv4();

        // Save snapshot for undo before making changes
        get().saveSnapshot('Add node');

        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          const newNode = {
            id,
            type,
            position,
            data: {
              id,
              label: `${type.charAt(0).toUpperCase() + type.slice(1)} ${sheet.nodes.length + 1}`,
              nodeType: type,
              ...DEFAULT_PROCESS_NODE_DATA,
              // Set parentId if we're inside a subprocess sheet
              ...(state.activeSubprocessId ? { parentId: state.activeSubprocessId } : {}),
            } as ProcessNodeData,
          } as FlowchartNode;

          sheet.nodes.push(newNode);

          sheet.updatedAt = new Date();
          state.isDirty = true;
          syncNodesAndEdgesFromActiveSheet(state);
        });
      },

      addAnnotationNode: (type: AnnotationType, position: { x: number; y: number }) => {
        const id = uuidv4();

        // Save snapshot for undo before making changes
        get().saveSnapshot('Add annotation');

        // Default sizes for different annotation types
        const defaultSizes: Record<AnnotationType, { width: number; height: number }> = {
          annotationRectangle: { width: 150, height: 100 },
          annotationSquare: { width: 100, height: 100 },
          annotationCircle: { width: 100, height: 100 },
          annotationLine: { width: 150, height: 4 },
          annotationTextBox: { width: 150, height: 60 },
        };

        const defaultLabels: Record<AnnotationType, string> = {
          annotationRectangle: '',
          annotationSquare: '',
          annotationCircle: '',
          annotationLine: '',
          annotationTextBox: 'Text',
        };

        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          const size = defaultSizes[type];

          const newNode = {
            id,
            type,
            position,
            width: size.width,
            height: size.height,
            data: {
              id,
              annotationType: type,
              label: defaultLabels[type],
              ...DEFAULT_ANNOTATION_DATA,
            } as AnnotationNodeData,
            zIndex: -1,
          } as FlowchartNode;

          sheet.nodes.push(newNode);
          sheet.updatedAt = new Date();
          state.isDirty = true;
          syncNodesAndEdgesFromActiveSheet(state);
        });
      },

      updateAnnotationNode: (nodeId: string, data: Partial<AnnotationNodeData>) => {
        // Save snapshot for undo before making changes
        get().saveSnapshot('Update annotation');

        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          const nodeIndex = sheet.nodes.findIndex((n) => n.id === nodeId);
          if (nodeIndex !== -1) {
            const node = sheet.nodes[nodeIndex];

            // Build the updated node
            const updatedNode: FlowchartNode = {
              ...node,
              data: {
                ...node.data,
                ...data,
              },
            } as FlowchartNode;

            // If zIndex is being updated, also set it on the node level (React Flow uses this for layering)
            if (data.zIndex !== undefined) {
              (updatedNode as FlowchartNode & { zIndex: number }).zIndex = data.zIndex;
            }

            sheet.nodes[nodeIndex] = updatedNode;
            sheet.updatedAt = new Date();
            state.isDirty = true;
            syncNodesAndEdgesFromActiveSheet(state);
          }
        });
      },

      createReferenceToNode: (referencedNodeId: string, position?: { x: number; y: number }): string | null => {
        const id = uuidv4();

        const state = get();
        const sheet = state.sheets.find(s => s.id === state.activeSheetId);
        if (!sheet) return null;

        // Find the referenced node to get its label
        const referencedNode = sheet.nodes.find(n => n.id === referencedNodeId);
        if (!referencedNode) return null;

        const referencedLabel = (referencedNode.data as ProcessNodeData).label || 'Node';

        // Calculate position - default to offset from referenced node
        const refPosition = referencedNode.position;
        const newPosition = position || {
          x: refPosition.x + 150,
          y: refPosition.y + 50,
        };

        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          const newNode: FlowchartNode = {
            id,
            type: 'reference',
            position: newPosition,
            data: {
              id,
              label: `Ref: ${referencedLabel}`,
              nodeType: 'reference',
              referencedNodeId,
              ...DEFAULT_PROCESS_NODE_DATA,
              // Set parentId if we're inside a subprocess sheet
              ...(state.activeSubprocessId ? { parentId: state.activeSubprocessId } : {}),
            } as ProcessNodeData,
          };

          sheet.nodes.push(newNode as FlowchartNode);

          sheet.updatedAt = new Date();
          state.isDirty = true;
          syncNodesAndEdgesFromActiveSheet(state);
        });

        return id;
      },

      updateNode: (nodeId: string, data: Partial<ProcessNodeData>) => {
        // Save snapshot for undo before making changes
        get().saveSnapshot('Update node');

        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          const nodeIndex = sheet.nodes.findIndex((n) => n.id === nodeId);
          if (nodeIndex !== -1) {
            sheet.nodes[nodeIndex].data = {
              ...sheet.nodes[nodeIndex].data,
              ...data,
            } as ProcessNodeData;
            sheet.updatedAt = new Date();
            state.isDirty = true;

            // If the node's label changed, update connected manual port labels
            if (data.label !== undefined) {
              const newLabel = data.label;

              // Find all edges where this node is the source (connected to subprocess manual input ports)
              sheet.edges.forEach((edge) => {
                if (edge.source === nodeId && edge.targetHandle?.startsWith('port-in-')) {
                  // Find the target subprocess node and update the input port label
                  const targetNodeIndex = sheet.nodes.findIndex((n) => n.id === edge.target);
                  if (targetNodeIndex !== -1) {
                    const targetNode = sheet.nodes[targetNodeIndex];
                    if (targetNode.type === 'subprocess') {
                      const targetData = targetNode.data as ProcessNodeData;
                      const inputPorts = targetData.inputPorts || [];
                      const portIndex = inputPorts.findIndex(p => p.id === edge.targetHandle);
                      if (portIndex !== -1) {
                        inputPorts[portIndex] = { ...inputPorts[portIndex], label: newLabel };
                        sheet.nodes[targetNodeIndex] = {
                          ...targetNode,
                          data: { ...targetData, inputPorts: [...inputPorts] },
                        } as FlowchartNode;
                      }
                    }
                  }
                }

                // Find all edges where this node is the target (connected from subprocess output ports)
                if (edge.target === nodeId && edge.sourceHandle?.startsWith('port-out-')) {
                  // Find the source subprocess node and update the output port label
                  const sourceNodeIndex = sheet.nodes.findIndex((n) => n.id === edge.source);
                  if (sourceNodeIndex !== -1) {
                    const sourceNode = sheet.nodes[sourceNodeIndex];
                    if (sourceNode.type === 'subprocess') {
                      const sourceData = sourceNode.data as ProcessNodeData;
                      const outputPorts = sourceData.outputPorts || [];
                      const portIndex = outputPorts.findIndex(p => p.id === edge.sourceHandle);
                      if (portIndex !== -1) {
                        outputPorts[portIndex] = { ...outputPorts[portIndex], label: newLabel };
                        sheet.nodes[sourceNodeIndex] = {
                          ...sourceNode,
                          data: { ...sourceData, outputPorts: [...outputPorts] },
                        } as FlowchartNode;
                      }
                    }
                  }
                }
              });
            }

            // If the node's role changed, update reference nodes that reference this node
            if (data.role !== undefined) {
              const newRole = data.role;

              // Find all reference nodes that reference this node
              sheet.nodes.forEach((node, index) => {
                if (node.type === 'reference') {
                  const refData = node.data as { referencedNodeId?: string; role?: string[] };
                  if (refData.referencedNodeId === nodeId) {
                    sheet.nodes[index] = {
                      ...node,
                      data: { ...refData, role: newRole },
                    } as FlowchartNode;
                  }
                }
              });
            }

            // Sync all syncable properties to reference nodes
            // Properties that should be synced: label, description, tags, documents, data, systems, role,
            // frequency, painPoints, improvement, risk, unitType, customUnitName, unitTimeMinutes, defaultQuantity
            const syncableProperties = [
              'label', 'description', 'tags', 'documents', 'data', 'systems', 'role',
              'frequency', 'painPoints', 'improvement', 'risk', 'unitType', 'customUnitName',
              'unitTimeMinutes', 'defaultQuantity'
            ] as const;

            const hasSyncableChange = syncableProperties.some(prop => data[prop as keyof ProcessNodeData] !== undefined);

            if (hasSyncableChange) {
              // Find all reference nodes that reference this node
              sheet.nodes.forEach((node, index) => {
                if (node.type === 'reference') {
                  const refData = node.data as ProcessNodeData & { referencedNodeId?: string };
                  if (refData.referencedNodeId === nodeId) {
                    // Create updated data object with only the changed syncable properties
                    const updatedData: Record<string, unknown> = { ...refData };
                    syncableProperties.forEach(prop => {
                      if (data[prop as keyof ProcessNodeData] !== undefined) {
                        updatedData[prop] = data[prop as keyof ProcessNodeData];
                      }
                    });
                    sheet.nodes[index] = {
                      ...node,
                      data: updatedData as ProcessNodeData,
                    } as FlowchartNode;
                  }
                }
              });
            }
          }
          syncNodesAndEdgesFromActiveSheet(state);
        });
      },

      deleteNode: (nodeId: string) => {
        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          // Find the node being deleted
          const nodeToDelete = sheet.nodes.find((n) => n.id === nodeId);

          // If deleting a subprocess, include all descendants (children, grandchildren, etc.)
          let idsToDelete = new Set<string>([nodeId]);
          if (nodeToDelete?.type === 'subprocess') {
            // Recursively find all descendant node IDs
            const findDescendants = (parentId: string) => {
              sheet.nodes.forEach(n => {
                if (n.data.parentId === parentId && !idsToDelete.has(n.id)) {
                  idsToDelete.add(n.id);
                  // If this child is also a subprocess, recurse
                  if (n.type === 'subprocess') {
                    findDescendants(n.id);
                  }
                }
              });
            };
            findDescendants(nodeId);
          }

          // Remove the nodes (including all descendants)
          sheet.nodes = sheet.nodes.filter((n) => !idsToDelete.has(n.id));

          // Remove all edges connected to any of the deleted nodes
          sheet.edges = sheet.edges.filter(
            (e) => !idsToDelete.has(e.source) && !idsToDelete.has(e.target)
          );

          // Clear selection if any deleted node was selected
          if (state.selectedNodeId && idsToDelete.has(state.selectedNodeId)) {
            state.selectedNodeId = null;
          }

          sheet.updatedAt = new Date();
          state.isDirty = true;
          syncNodesAndEdgesFromActiveSheet(state);
        });
      },

      deleteNodes: (nodeIds: string[]) => {
        if (nodeIds.length === 0) return;

        // Save snapshot for undo before making changes
        get().saveSnapshot(`Delete ${nodeIds.length} node${nodeIds.length > 1 ? 's' : ''}`);

        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          // Start with the explicitly selected node IDs
          const idsToDelete = new Set<string>(nodeIds);

          // For each subprocess being deleted, include all descendants
          nodeIds.forEach(nodeId => {
            const node = sheet.nodes.find(n => n.id === nodeId);
            if (node?.type === 'subprocess') {
              // Recursively find all descendant node IDs
              const findDescendants = (parentId: string) => {
                sheet.nodes.forEach(n => {
                  if (n.data.parentId === parentId && !idsToDelete.has(n.id)) {
                    idsToDelete.add(n.id);
                    // If this child is also a subprocess, recurse
                    if (n.type === 'subprocess') {
                      findDescendants(n.id);
                    }
                  }
                });
              };
              findDescendants(nodeId);
            }
          });

          // Remove the nodes (including all descendants)
          sheet.nodes = sheet.nodes.filter((n) => !idsToDelete.has(n.id));

          // Remove all edges connected to any of the deleted nodes
          sheet.edges = sheet.edges.filter(
            (e) => !idsToDelete.has(e.source) && !idsToDelete.has(e.target)
          );

          // Clear selection if any deleted node was selected
          if (state.selectedNodeId && idsToDelete.has(state.selectedNodeId)) {
            state.selectedNodeId = null;
          }

          sheet.updatedAt = new Date();
          state.isDirty = true;
          syncNodesAndEdgesFromActiveSheet(state);
        });
      },

      setSelectedNode: (nodeId: string | null) => {
        set((state) => {
          state.selectedNodeId = nodeId;
          const activeSheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (activeSheet) {
            // First, clear selected property on ALL nodes in ALL sheets
            state.sheets.forEach(sheet => {
              sheet.nodes.forEach(n => { n.selected = false; });
            });
            // Then set selected on the node in the active sheet (if any)
            if (nodeId) {
              const node = activeSheet.nodes.find(n => n.id === nodeId);
              if (node) {
                node.selected = true;
              }
            }
          }
        });
      },

      setSelectedEdgeId: (edgeId: string | null) => {
        set((state) => {
          state.selectedEdgeId = edgeId;
          // Clear selected property on nodes in all OTHER sheets when edge is selected
          if (edgeId) {
            state.sheets.forEach(sheet => {
              if (sheet.id !== state.activeSheetId) {
                sheet.nodes.forEach(n => { n.selected = false; });
              }
            });
          }
        });
      },

      addEdge: (source: string, target: string, sourceHandle?: string, targetHandle?: string) => {
        // Save snapshot for undo before making changes
        get().saveSnapshot('Add connection');

        // Normalize handle values (treat null and undefined as equivalent)
        const normalizedSourceHandle = sourceHandle || null;
        const normalizedTargetHandle = targetHandle || null;
        const id = `edge-${source}-${normalizedSourceHandle || 'default'}-${target}-${normalizedTargetHandle || 'default'}`;

        // Check if connecting to a port that might not have a handle rendered yet
        const isPortConnection =
          (normalizedTargetHandle && normalizedTargetHandle.startsWith('port-in-')) ||
          (normalizedSourceHandle && normalizedSourceHandle.startsWith('port-out-'));

        // For port connections, we need to ensure the handle exists before adding the edge
        // Increment nodeVersion first in a separate update to trigger re-render
        if (isPortConnection) {
          set((state) => {
            state.nodeVersion += 1;
          });

          // Use queueMicrotask to allow React to re-render before adding the edge
          queueMicrotask(() => {
            set((state) => {
              const sheet = state.sheets.find(s => s.id === state.activeSheetId);
              if (!sheet) return;

              // Check if edge already exists
              const edgeExists = sheet.edges.some(
                (e) => e.source === source && e.target === target &&
                       (e.sourceHandle || null) === normalizedSourceHandle &&
                       (e.targetHandle || null) === normalizedTargetHandle
              );

              if (!edgeExists) {
                const newEdge: FlowchartEdge = {
                  id,
                  source,
                  target,
                  sourceHandle: normalizedSourceHandle,
                  targetHandle: normalizedTargetHandle,
                  type: state.defaultEdgeType,
                  connectionDirection: 'output', // Default direction for hybrid handles
                };

                sheet.edges.push(newEdge);
                sheet.updatedAt = new Date();
                state.edgeVersion += 1;
                state.isDirty = true;

                // Update port labels when connecting external nodes
                if (normalizedTargetHandle && normalizedTargetHandle.startsWith('port-in-')) {
                  const targetNode = sheet.nodes.find(n => n.id === target);
                  if (targetNode && targetNode.type === 'subprocess') {
                    const sourceNode = sheet.nodes.find(n => n.id === source);
                    const sourceLabel = (sourceNode?.data as ProcessNodeData)?.label || 'Unknown';
                    const inputPorts = (targetNode.data as ProcessNodeData).inputPorts || [];
                    const portIndex = inputPorts.findIndex(p => p.id === normalizedTargetHandle);
                    if (portIndex !== -1) {
                      inputPorts[portIndex] = { ...inputPorts[portIndex], label: sourceLabel };
                      sheet.nodes = sheet.nodes.map(n =>
                        n.id === target
                          ? { ...n, data: { ...n.data, inputPorts: [...inputPorts] } } as FlowchartNode
                          : n
                      );
                    }
                  }
                }

                if (normalizedSourceHandle && normalizedSourceHandle.startsWith('port-out-')) {
                  const sourceNode = sheet.nodes.find(n => n.id === source);
                  if (sourceNode && sourceNode.type === 'subprocess') {
                    const targetNode = sheet.nodes.find(n => n.id === target);
                    const targetLabel = (targetNode?.data as ProcessNodeData)?.label || 'Unknown';
                    const outputPorts = (sourceNode.data as ProcessNodeData).outputPorts || [];
                    const portIndex = outputPorts.findIndex(p => p.id === normalizedSourceHandle);
                    if (portIndex !== -1) {
                      outputPorts[portIndex] = { ...outputPorts[portIndex], label: targetLabel };
                      sheet.nodes = sheet.nodes.map(n =>
                        n.id === source
                          ? { ...n, data: { ...n.data, outputPorts: [...outputPorts] } } as FlowchartNode
                          : n
                      );
                    }
                  }
                }
                syncNodesAndEdgesFromActiveSheet(state);
              }
            });
          });
        } else {
          // Non-manual port connections: add edge immediately
          set((state) => {
            const sheet = state.sheets.find(s => s.id === state.activeSheetId);
            if (!sheet) return;

            // Check if edge already exists
            const edgeExists = sheet.edges.some(
              (e) => e.source === source && e.target === target &&
                     (e.sourceHandle || null) === normalizedSourceHandle &&
                     (e.targetHandle || null) === normalizedTargetHandle
            );

            if (!edgeExists) {
              const newEdge: FlowchartEdge = {
                id,
                source,
                target,
                sourceHandle: normalizedSourceHandle,
                targetHandle: normalizedTargetHandle,
                type: state.defaultEdgeType,
                connectionDirection: 'output', // Default direction for hybrid handles
              };

              sheet.edges.push(newEdge);
              sheet.updatedAt = new Date();
              state.edgeVersion += 1;
              state.isDirty = true;
              syncNodesAndEdgesFromActiveSheet(state);
            }
          });
        }
      },

      updateEdge: (edgeId: string, data: Record<string, unknown>) => {
        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          const edgeIndex = sheet.edges.findIndex((e) => e.id === edgeId);
          if (edgeIndex !== -1) {
            sheet.edges[edgeIndex] = {
              ...sheet.edges[edgeIndex],
              ...data,
            } as FlowchartEdge;
            sheet.updatedAt = new Date();
            state.isDirty = true;
            syncNodesAndEdgesFromActiveSheet(state);
          }
        });
      },

      deleteEdge: (edgeId: string) => {
        // Save snapshot for undo before making changes
        get().saveSnapshot('Delete connection');

        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          // Find the edge before deleting to check if it's connected to manual ports
          const edge = sheet.edges.find((e) => e.id === edgeId);
          if (!edge) return;

          // Handle edge-based ports: convert to manual ports when edge is deleted
          // This preserves the port even when the external connection is removed

          // Check if this is an incoming edge to a subprocess (input port)
          if (edge.target && edge.originalTarget) {
            const targetNodeIndex = sheet.nodes.findIndex((n) => n.id === edge.target);
            if (targetNodeIndex !== -1) {
              const targetNode = sheet.nodes[targetNodeIndex];
              if (targetNode.type === 'subprocess') {
                const targetData = targetNode.data as ProcessNodeData;
                const inputPorts = targetData.inputPorts || [];

                // Check if this port already exists in the manual ports array
                // If it does, this is an edge connected to an existing manual port - just reset label
                // If it doesn't, this is an edge-based port - convert to manual port
                const existingPortIndex = edge.targetHandle
                  ? inputPorts.findIndex(p => p.id === edge.targetHandle)
                  : -1;

                if (existingPortIndex !== -1) {
                  // Port already exists in manual ports - just reset the label to default
                  const defaultLabel = `Input ${existingPortIndex + 1}`;
                  inputPorts[existingPortIndex] = { ...inputPorts[existingPortIndex], label: defaultLabel };
                  sheet.nodes[targetNodeIndex] = {
                    ...targetNode,
                    data: { ...targetData, inputPorts: [...inputPorts] },
                  } as FlowchartNode;
                } else {
                  // This is an edge-based port - convert to manual port
                  const portLabel = `Input ${inputPorts.length + 1}`;
                  const edgeData = edge.data as { boundaryPortPosition?: { x: number; y: number } } | undefined;
                  const newPort: Port = {
                    id: `port-in-${uuidv4()}`,
                    direction: 'input',
                    label: portLabel,
                    position: edgeData?.boundaryPortPosition,
                    internalConnections: edge.originalTargets ? [...edge.originalTargets] : undefined,
                  };

                  sheet.nodes[targetNodeIndex] = {
                    ...targetNode,
                    data: {
                      ...targetData,
                      inputPorts: [...inputPorts, newPort],
                    },
                  } as FlowchartNode;
                }
              }
            }
          }

          // Check if this is an outgoing edge from a subprocess (output port)
          if (edge.source && edge.originalSource) {
            const sourceNodeIndex = sheet.nodes.findIndex((n) => n.id === edge.source);
            if (sourceNodeIndex !== -1) {
              const sourceNode = sheet.nodes[sourceNodeIndex];
              if (sourceNode.type === 'subprocess') {
                const sourceData = sourceNode.data as ProcessNodeData;
                const outputPorts = sourceData.outputPorts || [];

                // Check if this port already exists in the manual ports array
                // If it does, this is an edge connected to an existing manual port - just reset label
                // If it doesn't, this is an edge-based port - convert to manual port
                const existingPortIndex = edge.sourceHandle
                  ? outputPorts.findIndex(p => p.id === edge.sourceHandle)
                  : -1;

                if (existingPortIndex !== -1) {
                  // Port already exists in manual ports - just reset the label to default
                  const defaultLabel = `Output ${existingPortIndex + 1}`;
                  outputPorts[existingPortIndex] = { ...outputPorts[existingPortIndex], label: defaultLabel };
                  sheet.nodes[sourceNodeIndex] = {
                    ...sourceNode,
                    data: { ...sourceData, outputPorts: [...outputPorts] },
                  } as FlowchartNode;
                } else {
                  // This is an edge-based port - convert to manual port
                  const portLabel = `Output ${outputPorts.length + 1}`;
                  const edgeData = edge.data as { boundaryPortOutPosition?: { x: number; y: number } } | undefined;
                  const newPort: Port = {
                    id: `port-out-${uuidv4()}`,
                    direction: 'output',
                    label: portLabel,
                    position: edgeData?.boundaryPortOutPosition,
                    internalConnections: edge.originalSources ? [...edge.originalSources] : undefined,
                  };

                  sheet.nodes[sourceNodeIndex] = {
                    ...sourceNode,
                    data: {
                      ...sourceData,
                      outputPorts: [...outputPorts, newPort],
                    },
                  } as FlowchartNode;
                }
              }
            }
          }

          // Handle existing manual port label reset logic
          if (edge.targetHandle?.startsWith('port-in-')) {
            const targetNodeIndex = sheet.nodes.findIndex((n) => n.id === edge.target);
            if (targetNodeIndex !== -1) {
              const targetNode = sheet.nodes[targetNodeIndex];
              if (targetNode.type === 'subprocess') {
                const targetData = targetNode.data as ProcessNodeData;
                const inputPorts = targetData.inputPorts || [];
                const portIndex = inputPorts.findIndex(p => p.id === edge.targetHandle);
                if (portIndex !== -1) {
                  // Reset to default label
                  const defaultLabel = `Input ${portIndex + 1}`;
                  inputPorts[portIndex] = { ...inputPorts[portIndex], label: defaultLabel };
                  sheet.nodes[targetNodeIndex] = {
                    ...targetNode,
                    data: { ...targetData, inputPorts: [...inputPorts] },
                  } as FlowchartNode;
                }
              }
            }
          }

          // Reset manual output port label if edge was connected from one
          if (edge.sourceHandle?.startsWith('port-out-')) {
            const sourceNodeIndex = sheet.nodes.findIndex((n) => n.id === edge.source);
            if (sourceNodeIndex !== -1) {
              const sourceNode = sheet.nodes[sourceNodeIndex];
              if (sourceNode.type === 'subprocess') {
                const sourceData = sourceNode.data as ProcessNodeData;
                const outputPorts = sourceData.outputPorts || [];
                const portIndex = outputPorts.findIndex(p => p.id === edge.sourceHandle);
                if (portIndex !== -1) {
                  // Reset to default label
                  const defaultLabel = `Output ${portIndex + 1}`;
                  outputPorts[portIndex] = { ...outputPorts[portIndex], label: defaultLabel };
                  sheet.nodes[sourceNodeIndex] = {
                    ...sourceNode,
                    data: { ...sourceData, outputPorts: [...outputPorts] },
                  } as FlowchartNode;
                }
              }
            }
          }

          sheet.edges = sheet.edges.filter((e) => e.id !== edgeId);
          sheet.updatedAt = new Date();
          state.edgeVersion += 1;
          state.nodeVersion += 1;
          state.isDirty = true;
          syncNodesAndEdgesFromActiveSheet(state);
        });
      },

      deleteEdges: (edgeIds: string[]) => {
        if (edgeIds.length === 0) return;

        // Save snapshot for undo before making changes
        get().saveSnapshot(`Delete ${edgeIds.length} connection${edgeIds.length > 1 ? 's' : ''}`);

        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          const idsSet = new Set(edgeIds);

          // Process each edge
          sheet.edges.forEach((edge) => {
            if (!idsSet.has(edge.id)) return;

            // Convert edge-based ports to manual ports when edge is deleted
            // This preserves the port even when the external connection is removed

            // Check if this is an incoming edge to a subprocess (input port)
            if (edge.target && edge.originalTarget) {
              const targetNodeIndex = sheet.nodes.findIndex((n) => n.id === edge.target);
              if (targetNodeIndex !== -1) {
                const targetNode = sheet.nodes[targetNodeIndex];
                if (targetNode.type === 'subprocess') {
                  const targetData = targetNode.data as ProcessNodeData;
                  const inputPorts = targetData.inputPorts || [];

                  // Check if this port already exists in the manual ports array
                  const existingPortIndex = edge.targetHandle
                    ? inputPorts.findIndex(p => p.id === edge.targetHandle)
                    : -1;

                  if (existingPortIndex !== -1) {
                    // Port already exists - just reset the label to default
                    const defaultLabel = `Input ${existingPortIndex + 1}`;
                    inputPorts[existingPortIndex] = { ...inputPorts[existingPortIndex], label: defaultLabel };
                    sheet.nodes[targetNodeIndex] = {
                      ...targetNode,
                      data: { ...targetData, inputPorts: [...inputPorts] },
                    } as FlowchartNode;
                  } else {
                    // This is an edge-based port - convert to manual port
                    const portLabel = `Input ${inputPorts.length + 1}`;
                    const edgeData = edge.data as { boundaryPortPosition?: { x: number; y: number } } | undefined;
                    const newPort: Port = {
                      id: `port-in-${uuidv4()}`,
                      direction: 'input',
                      label: portLabel,
                      position: edgeData?.boundaryPortPosition,
                      internalConnections: edge.originalTargets ? [...edge.originalTargets] : undefined,
                    };

                    sheet.nodes[targetNodeIndex] = {
                      ...targetNode,
                      data: {
                        ...targetData,
                        inputPorts: [...inputPorts, newPort],
                      },
                    } as FlowchartNode;
                  }
                }
              }
            }

            // Check if this is an outgoing edge from a subprocess (output port)
            if (edge.source && edge.originalSource) {
              const sourceNodeIndex = sheet.nodes.findIndex((n) => n.id === edge.source);
              if (sourceNodeIndex !== -1) {
                const sourceNode = sheet.nodes[sourceNodeIndex];
                if (sourceNode.type === 'subprocess') {
                  const sourceData = sourceNode.data as ProcessNodeData;
                  const outputPorts = sourceData.outputPorts || [];

                  // Check if this port already exists in the manual ports array
                  const existingPortIndex = edge.sourceHandle
                    ? outputPorts.findIndex(p => p.id === edge.sourceHandle)
                    : -1;

                  if (existingPortIndex !== -1) {
                    // Port already exists - just reset the label to default
                    const defaultLabel = `Output ${existingPortIndex + 1}`;
                    outputPorts[existingPortIndex] = { ...outputPorts[existingPortIndex], label: defaultLabel };
                    sheet.nodes[sourceNodeIndex] = {
                      ...sourceNode,
                      data: { ...sourceData, outputPorts: [...outputPorts] },
                    } as FlowchartNode;
                  } else {
                    // This is an edge-based port - convert to manual port
                    const portLabel = `Output ${outputPorts.length + 1}`;
                    const edgeData = edge.data as { boundaryPortOutPosition?: { x: number; y: number } } | undefined;
                    const newPort: Port = {
                      id: `port-out-${uuidv4()}`,
                      direction: 'output',
                      label: portLabel,
                      position: edgeData?.boundaryPortOutPosition,
                      internalConnections: edge.originalSources ? [...edge.originalSources] : undefined,
                    };

                    sheet.nodes[sourceNodeIndex] = {
                      ...sourceNode,
                      data: {
                        ...sourceData,
                        outputPorts: [...outputPorts, newPort],
                      },
                    } as FlowchartNode;
                  }
                }
              }
            }

            // Reset manual input port label if edge was connected to one
            if (edge.targetHandle?.startsWith('port-in-')) {
              const targetNodeIndex = sheet.nodes.findIndex((n) => n.id === edge.target);
              if (targetNodeIndex !== -1) {
                const targetNode = sheet.nodes[targetNodeIndex];
                if (targetNode.type === 'subprocess') {
                  const targetData = targetNode.data as ProcessNodeData;
                  const inputPorts = targetData.inputPorts || [];
                  const portIndex = inputPorts.findIndex(p => p.id === edge.targetHandle);
                  if (portIndex !== -1) {
                    const defaultLabel = `Input ${portIndex + 1}`;
                    inputPorts[portIndex] = { ...inputPorts[portIndex], label: defaultLabel };
                    sheet.nodes[targetNodeIndex] = {
                      ...targetNode,
                      data: { ...targetData, inputPorts: [...inputPorts] },
                    } as FlowchartNode;
                  }
                }
              }
            }

            // Reset manual output port label if edge was connected from one
            if (edge.sourceHandle?.startsWith('port-out-')) {
              const sourceNodeIndex = sheet.nodes.findIndex((n) => n.id === edge.source);
              if (sourceNodeIndex !== -1) {
                const sourceNode = sheet.nodes[sourceNodeIndex];
                if (sourceNode.type === 'subprocess') {
                  const sourceData = sourceNode.data as ProcessNodeData;
                  const outputPorts = sourceData.outputPorts || [];
                  const portIndex = outputPorts.findIndex(p => p.id === edge.sourceHandle);
                  if (portIndex !== -1) {
                    const defaultLabel = `Output ${portIndex + 1}`;
                    outputPorts[portIndex] = { ...outputPorts[portIndex], label: defaultLabel };
                    sheet.nodes[sourceNodeIndex] = {
                      ...sourceNode,
                      data: { ...sourceData, outputPorts: [...outputPorts] },
                    } as FlowchartNode;
                  }
                }
              }
            }
          });

          sheet.edges = sheet.edges.filter((e) => !idsSet.has(e.id));
          sheet.updatedAt = new Date();
          state.edgeVersion += 1;
          state.nodeVersion += 1;
          state.isDirty = true;
          syncNodesAndEdgesFromActiveSheet(state);
        });
      },

      setNodes: (nodes: FlowchartNode[]) => {
        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;
          sheet.nodes = nodes;
          sheet.updatedAt = new Date();
          state.nodeVersion += 1;
          state.isDirty = true;
          // Sync state.nodes for backward compatibility
          syncNodesAndEdgesFromActiveSheet(state);
        });
      },

      setEdges: (edges: FlowchartEdge[]) => {
        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;
          sheet.edges = edges;
          sheet.updatedAt = new Date();
          state.edgeVersion += 1;
          state.isDirty = true;
          // Sync state.edges for backward compatibility
          syncNodesAndEdgesFromActiveSheet(state);
        });
      },

      saveFlowchart: async () => {
        const state = get();

        const flowchartRecord: FlowchartRecord = {
          id: state.flowchartId || uuidv4(),
          name: state.flowchartName,
          sheets: state.sheets,
          activeSheetId: state.activeSheetId,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: CURRENT_SCHEMA_VERSION,
        } as unknown as FlowchartRecord;

        await dbSaveFlowchart(flowchartRecord);

        set((s) => {
          s.flowchartId = flowchartRecord.id;
          s.isDirty = false;
        });
      },

      loadFlowchart: async (id: string) => {
        const record = await dbLoadFlowchart(id);

        if (record) {
          // Check if this is a legacy format (v1) that needs migration
          if (isLegacyFormat(record)) {
            // Migrate to new sheet format
            const migratedSheets = migrateToSheetFormat(record as unknown as LegacyFlowchart);
            // Also migrate port formats
            const portMigratedSheets = migratedSheets.map(migrateSheetPorts);

            set((state) => {
              state.flowchartId = record.id;
              state.flowchartName = record.name;
              state.sheets = portMigratedSheets;
              state.activeSheetId = portMigratedSheets[0].id;
              state.activeSubprocessId = null;
              state.subprocessNavigationStack = [];
              state.selectedNodeId = null;
              state.isDirty = true; // Mark dirty so user saves in new format
              // Clear history when loading a different flowchart
              state.past = [];
              state.future = [];
              // Keep clipboard for cross-flowchart paste
              // Clear source tracking but preserve content
              state.clipboardSourceFlowchartId = null;
              state.clipboardSourceSheetId = null;
              syncNodesAndEdgesFromActiveSheet(state);
            });
          } else {
            // New format (v2+)
            const newRecord = record as unknown as { sheets: Sheet[]; activeSheetId: string; version?: number };

            // Check if port migration is needed (version < 3)
            const sheets = needsPortMigration(record as unknown as FlowchartRecord)
              ? newRecord.sheets.map(migrateSheetPorts)
              : newRecord.sheets;

            set((state) => {
              state.flowchartId = record.id;
              state.flowchartName = record.name;
              state.sheets = sheets;
              state.activeSheetId = newRecord.activeSheetId || sheets[0]?.id || DEFAULT_SHEET_ID;
              state.activeSubprocessId = null;
              state.subprocessNavigationStack = [];
              state.selectedNodeId = null;
              state.isDirty = false;
              // Clear history when loading a different flowchart
              state.past = [];
              state.future = [];
              // Keep clipboard for cross-flowchart paste
              // Clear source tracking but preserve content
              state.clipboardSourceFlowchartId = null;
              state.clipboardSourceSheetId = null;
              syncNodesAndEdgesFromActiveSheet(state);
            });
          }
          return true;
        }

        return false;
      },

      loadFlowchartFromVersion: (version: { sheets: Sheet[]; activeSheetId: string }) => {
        set((state) => {
          state.sheets = version.sheets;
          state.activeSheetId = version.activeSheetId || version.sheets[0]?.id || DEFAULT_SHEET_ID;
          state.activeSubprocessId = null;
          state.subprocessNavigationStack = [];
          state.selectedNodeId = null;
          state.isDirty = true; // Mark dirty so user saves after restoring
          // Clear history when loading from version
          state.past = [];
          state.future = [];
          // Clear clipboard
          state.clipboardNodes = [];
          state.clipboardEdges = [];
          syncNodesAndEdgesFromActiveSheet(state);
        });
      },

      newFlowchart: (name?: string) => {
        const mainSheetId = uuidv4();
        const now = new Date();

        set((state) => {
          state.sheets = [{
            id: mainSheetId,
            name: 'Main',
            nodes: [],
            edges: [],
            createdAt: now,
            updatedAt: now,
          }];
          state.activeSheetId = mainSheetId;
          state.activeSubprocessId = null;
          state.subprocessNavigationStack = [];
          state.selectedNodeId = null;
          state.flowchartId = null;
          state.flowchartName = name || 'Untitled Flowchart';
          state.isDirty = false;
          // Clear history when creating a new flowchart
          state.past = [];
          state.future = [];
          // Clear clipboard
          state.clipboardNodes = [];
          state.clipboardEdges = [];
          // Sync nodes/edges from the new empty sheet
          syncNodesAndEdgesFromActiveSheet(state);
        });
      },

      markDirty: () => {
        set((state) => {
          state.isDirty = true;
        });
      },

      toggleGrid: () => {
        set((state) => {
          state.showGrid = !state.showGrid;
        });
      },

      toggleMinimap: () => {
        set((state) => {
          state.showMinimap = !state.showMinimap;
        });
      },

      setDefaultEdgeType: (edgeType: EdgeType) => {
        set((state) => {
          state.defaultEdgeType = edgeType;
        });
      },

      // =============================================================================
      // Subprocess Grouping Actions
      // =============================================================================

      /**
       * Group multiple nodes into a subprocess container
       * @param nodeIds - IDs of nodes to group
       * @param label - Optional label for the subprocess
       * @returns The ID of the created subprocess, or null if grouping failed
       */
      groupNodesIntoSubprocess: (nodeIds: string[], label?: string) => {
        const state = get();
        const sheet = state.sheets.find(s => s.id === state.activeSheetId);
        if (!sheet) return null;

        // Validation: Need at least 2 nodes
        if (nodeIds.length < 2) {
          console.warn('Cannot group: Need at least 2 nodes');
          return null;
        }

        // Get the nodes to group
        const nodesToGroup = sheet.nodes.filter(n => nodeIds.includes(n.id));

        // Validation: All nodes must exist
        if (nodesToGroup.length !== nodeIds.length) {
          console.warn('Cannot group: Some nodes not found');
          return null;
        }

        // Validation: Cannot group start/end nodes
        const hasStartEnd = nodesToGroup.some(n => n.type === 'start' || n.type === 'end');
        if (hasStartEnd) {
          console.warn('Cannot group: Start and end nodes cannot be grouped');
          return null;
        }

        // Validation: All nodes must have the same parent (can only group nodes from the same level)
        const parentIds = new Set(nodesToGroup.map(n => n.data.parentId || null));
        if (parentIds.size > 1) {
          console.warn('Cannot group: Nodes from different subprocesses');
          return null;
        }

        // Get common parent (null for root level)
        const commonParentId = nodesToGroup[0].data.parentId || null;

        // Save snapshot for undo before making changes
        get().saveSnapshot('Group nodes into subprocess');

        // Calculate bounding box of selected nodes
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodesToGroup.forEach(node => {
          minX = Math.min(minX, node.position.x);
          minY = Math.min(minY, node.position.y);
          // Approximate node dimensions (can be refined with actual measurements)
          const nodeWidth = 180;
          const nodeHeight = 100;
          maxX = Math.max(maxX, node.position.x + nodeWidth);
          maxY = Math.max(maxY, node.position.y + nodeHeight);
        });

        // Add padding for the subprocess container
        const padding = 40;
        const subprocessX = minX - padding;
        const subprocessY = minY - padding;

        // Create subprocess node
        const subprocessId = uuidv4();
        const subprocessNode: FlowchartNode = {
          id: subprocessId,
          type: 'subprocess',
          position: { x: subprocessX, y: subprocessY },
          data: {
            id: subprocessId,
            label: label || 'Subprocess',
            nodeType: 'subprocess',
            parentId: commonParentId || undefined, // Inherit parent for nesting support
            // childNodeIds is now computed from parentId relationships - not stored
            isExpanded: true,
            inputPorts: [],
            outputPorts: [],
            ...DEFAULT_PROCESS_NODE_DATA,
          } as ProcessNodeData,
        };

        // Update child nodes with parentId and convert to relative positions
        const updatedNodes = sheet.nodes.map(node => {
          if (nodeIds.includes(node.id)) {
            return {
              ...node,
              position: {
                x: node.position.x - subprocessX,
                y: node.position.y - subprocessY,
              },
              data: {
                ...node.data,
                parentId: subprocessId,
              },
            } as FlowchartNode;
          }
          return node;
        });

        // Transform edges - group by unique external connections
        // Step 1: Categorize all edges
        const internalEdges: FlowchartEdge[] = [];
        const incomingEdges: FlowchartEdge[] = []; // external -> child
        const outgoingEdges: FlowchartEdge[] = []; // child -> external
        const externalEdges: FlowchartEdge[] = [];

        sheet.edges.forEach(edge => {
          const sourceIsChild = nodeIds.includes(edge.source);
          const targetIsChild = nodeIds.includes(edge.target);

          if (sourceIsChild && targetIsChild) {
            // Internal edge (between children)
            internalEdges.push({
              ...edge,
              subprocessId: subprocessId,
            });
          } else if (!sourceIsChild && targetIsChild) {
            // Incoming edge (external -> child)
            incomingEdges.push(edge);
          } else if (sourceIsChild && !targetIsChild) {
            // Outgoing edge (child -> external)
            outgoingEdges.push(edge);
          } else {
            // External edge (unrelated to subprocess)
            externalEdges.push(edge);
          }
        });

        // Step 2: Group incoming edges by unique external SOURCE
        // One input port per unique external source, tracking all internal targets
        const incomingBySource = new Map<string, FlowchartEdge[]>();
        incomingEdges.forEach(edge => {
          const sourceKey = edge.source; // Group by external source
          if (!incomingBySource.has(sourceKey)) {
            incomingBySource.set(sourceKey, []);
          }
          incomingBySource.get(sourceKey)!.push(edge);
        });

        // Create merged incoming edges (one per unique external source)
        const mergedIncomingEdges: FlowchartEdge[] = [];
        incomingBySource.forEach((edges, externalSourceId) => {
          // Collect all internal targets
          const originalTargets = edges.map(e => ({
            nodeId: e.target,
            handleId: e.targetHandle,
          }));

          // Use the first edge as the base, but track all internal connections
          const baseEdge = edges[0];
          const portId = `port-in-${uuidv4()}`;

          mergedIncomingEdges.push({
            id: `edge-${externalSourceId}-${subprocessId}-input`,
            source: externalSourceId,
            target: subprocessId,
            sourceHandle: baseEdge.sourceHandle,
            targetHandle: portId,
            type: baseEdge.type,
            // Keep first target for backward compatibility
            originalTarget: baseEdge.target,
            originalTargetHandle: baseEdge.targetHandle,
            // Store ALL internal targets for the boundary port
            originalTargets: originalTargets,
          });
        });

        // Add input ports to subprocess node
        const createdInputPorts: Port[] = mergedIncomingEdges.map((edge, idx) => ({
          id: edge.targetHandle || `port-in-${idx}`,
          direction: 'input' as const,
          label: `Input ${idx + 1}`,
          handlePosition: 'left' as const,
        }));
        subprocessNode.data.inputPorts = createdInputPorts;

        // Step 3: Group outgoing edges by unique external TARGET
        // One output port per unique external target, tracking all internal sources
        const outgoingByTarget = new Map<string, FlowchartEdge[]>();
        outgoingEdges.forEach(edge => {
          const targetKey = edge.target; // Group by external target
          if (!outgoingByTarget.has(targetKey)) {
            outgoingByTarget.set(targetKey, []);
          }
          outgoingByTarget.get(targetKey)!.push(edge);
        });

        // Create merged outgoing edges (one per unique external target)
        const mergedOutgoingEdges: FlowchartEdge[] = [];
        outgoingByTarget.forEach((edges, externalTargetId) => {
          // Collect all internal sources
          const originalSources = edges.map(e => ({
            nodeId: e.source,
            handleId: e.sourceHandle,
          }));

          // Use the first edge as the base, but track all internal connections
          const baseEdge = edges[0];
          const portId = `port-out-${uuidv4()}`;

          mergedOutgoingEdges.push({
            id: `edge-${subprocessId}-${externalTargetId}-output`,
            source: subprocessId,
            target: externalTargetId,
            sourceHandle: portId,
            targetHandle: baseEdge.targetHandle,
            type: baseEdge.type,
            // Keep first source for backward compatibility
            originalSource: baseEdge.source,
            originalSourceHandle: baseEdge.sourceHandle,
            // Store ALL internal sources for the boundary port
            originalSources: originalSources,
          });
        });

        // Add output ports to subprocess node
        const createdOutputPorts: Port[] = mergedOutgoingEdges.map((edge, idx) => ({
          id: edge.sourceHandle || `port-out-${idx}`,
          direction: 'output' as const,
          label: `Output ${idx + 1}`,
          handlePosition: 'right' as const,
        }));
        subprocessNode.data.outputPorts = createdOutputPorts;

        // Combine all edges
        const updatedEdges = [
          ...internalEdges,
          ...mergedIncomingEdges,
          ...mergedOutgoingEdges,
          ...externalEdges,
        ];

        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;
          sheet.nodes = [...updatedNodes, subprocessNode];
          sheet.edges = updatedEdges;
          sheet.updatedAt = new Date();
          state.isDirty = true;
          syncNodesAndEdgesFromActiveSheet(state);
        });

        return subprocessId;
      },

      /**
       * Ungroup a subprocess, restoring children to the canvas
       * @param subprocessId - ID of the subprocess to ungroup
       */
      ungroupSubprocess: (subprocessId: string) => {
        const state = get();
        const sheet = state.sheets.find(s => s.id === state.activeSheetId);
        if (!sheet) return;

        const subprocessNode = sheet.nodes.find(n => n.id === subprocessId);
        if (!subprocessNode || subprocessNode.type !== 'subprocess') {
          console.warn('Cannot ungroup: Subprocess not found');
          return;
        }

        // Save snapshot for undo before making changes
        get().saveSnapshot('Ungroup subprocess');

        // Get child IDs from parentId relationships (single source of truth)
        const childIds = new Set(sheet.nodes.filter(n => n.data.parentId === subprocessId).map(n => n.id));
        const inputPorts = (subprocessNode.data.inputPorts || []) as Port[];
        const outputPorts = (subprocessNode.data.outputPorts || []) as Port[];

        // Restore edges - expand merged edges back to individual connections
        const restoredEdges: FlowchartEdge[] = [];
        const processedEdgeIds = new Set<string>();

        sheet.edges.forEach(edge => {
          // Internal edges (between children) - keep them, just remove subprocessId marker
          if (edge.subprocessId === subprocessId) {
            const { subprocessId: _, ...restEdge } = edge;
            restoredEdges.push(restEdge as FlowchartEdge);
            processedEdgeIds.add(edge.id);
            return;
          }

          // Expand incoming edges (external -> subprocess) back to individual edges
          if (edge.target === subprocessId && edge.originalTargets) {
            // Create one edge per internal target
            edge.originalTargets.forEach((conn, index) => {
              restoredEdges.push({
                id: index === 0 ? edge.id : `edge-${edge.source}-${conn.nodeId}-${index}`,
                source: edge.source,
                target: conn.nodeId,
                sourceHandle: edge.sourceHandle,
                targetHandle: conn.handleId,
                type: edge.type,
              } as FlowchartEdge);
            });
            processedEdgeIds.add(edge.id);
            return;
          }

          // Fallback for old format incoming edges (single originalTarget)
          if (edge.target === subprocessId && edge.originalTarget) {
            const { originalTarget, originalTargetHandle, originalTargets, ...restEdge } = edge;
            restoredEdges.push({
              ...restEdge,
              target: originalTarget,
              targetHandle: originalTargetHandle,
            } as FlowchartEdge);
            processedEdgeIds.add(edge.id);
            return;
          }

          // Expand outgoing edges (subprocess -> external) back to individual edges
          if (edge.source === subprocessId && edge.originalSources) {
            // Create one edge per internal source
            edge.originalSources.forEach((conn, index) => {
              restoredEdges.push({
                id: index === 0 ? edge.id : `edge-${conn.nodeId}-${edge.target}-${index}`,
                source: conn.nodeId,
                target: edge.target,
                sourceHandle: conn.handleId,
                targetHandle: edge.targetHandle,
                type: edge.type,
              } as FlowchartEdge);
            });
            processedEdgeIds.add(edge.id);
            return;
          }

          // Fallback for old format outgoing edges (single originalSource)
          if (edge.source === subprocessId && edge.originalSource) {
            const { originalSource, originalSourceHandle, originalSources, ...restEdge } = edge;
            restoredEdges.push({
              ...restEdge,
              source: originalSource,
              sourceHandle: originalSourceHandle,
            } as FlowchartEdge);
            processedEdgeIds.add(edge.id);
            return;
          }

          // External edge - keep unchanged
          if (edge.source !== subprocessId && edge.target !== subprocessId) {
            restoredEdges.push(edge);
            processedEdgeIds.add(edge.id);
          }
        });

        // Handle manual input ports - create edges from external sources to internal targets
        inputPorts.forEach(port => {
          if (!port.internalConnections || port.internalConnections.length === 0) {
            return;
          }

          // Find external edges connected to this manual port
          const externalEdges = sheet.edges.filter(
            edge => edge.target === subprocessId && edge.targetHandle === port.id
          );

          externalEdges.forEach(externalEdge => {
            // For each internal connection, create a new edge from the external source
            port.internalConnections!.forEach((conn, index) => {
              const newEdgeId = index === 0 && externalEdges.length === 1
                ? externalEdge.id
                : `edge-${externalEdge.source}-${conn.nodeId}-${Date.now()}-${index}`;
              restoredEdges.push({
                id: newEdgeId,
                source: externalEdge.source,
                target: conn.nodeId,
                sourceHandle: externalEdge.sourceHandle,
                targetHandle: conn.handleId,
                type: externalEdge.type,
                style: externalEdge.style,
                animated: externalEdge.animated,
              } as FlowchartEdge);
            });
            processedEdgeIds.add(externalEdge.id);
          });
        });

        // Handle manual output ports - create edges from internal sources to external targets
        outputPorts.forEach(port => {
          if (!port.internalConnections || port.internalConnections.length === 0) {
            return;
          }

          // Find external edges connected from this manual port
          const externalEdges = sheet.edges.filter(
            edge => edge.source === subprocessId && edge.sourceHandle === port.id
          );

          externalEdges.forEach(externalEdge => {
            // For each internal connection, create a new edge to the external target
            port.internalConnections!.forEach((conn, index) => {
              const newEdgeId = index === 0 && externalEdges.length === 1
                ? externalEdge.id
                : `edge-${conn.nodeId}-${externalEdge.target}-${Date.now()}-${index}`;
              restoredEdges.push({
                id: newEdgeId,
                source: conn.nodeId,
                target: externalEdge.target,
                sourceHandle: conn.handleId,
                targetHandle: externalEdge.targetHandle,
                type: externalEdge.type,
                style: externalEdge.style,
                animated: externalEdge.animated,
              } as FlowchartEdge);
            });
            processedEdgeIds.add(externalEdge.id);
          });
        });

        // Get the subprocess's parent before ungrouping (for nested subprocess support)
        const subprocessParentId = subprocessNode.data.parentId;

        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          // Update child nodes: inherit parent's parentId and convert back to absolute positions
          sheet.nodes = sheet.nodes
            .filter(n => n.id !== subprocessId) // Remove subprocess node
            .map(node => {
              if (childIds.has(node.id)) {
                return {
                  ...node,
                  position: {
                    x: node.position.x + subprocessNode.position.x,
                    y: node.position.y + subprocessNode.position.y,
                  },
                  data: {
                    ...node.data,
                    // Children inherit the subprocess's parent (stay at same nesting level)
                    parentId: subprocessParentId || undefined,
                  },
                } as FlowchartNode;
              }
              return node;
            });

          sheet.edges = restoredEdges;
          sheet.updatedAt = new Date();
          // Close sheet if viewing this subprocess
          if (state.activeSubprocessId === subprocessId) {
            state.activeSubprocessId = null;
          }
          state.isDirty = true;
          syncNodesAndEdgesFromActiveSheet(state);
        });
      },

      // =============================================================================
      // Subprocess Navigation Actions
      // =============================================================================

      /**
       * Open a subprocess in a sheet view
       * @param subprocessId - ID of the subprocess to open
       */
      openSubprocessSheet: (subprocessId: string) => {
        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          // Verify the subprocess exists
          const subprocessNode = sheet.nodes.find(n => n.id === subprocessId && n.type === 'subprocess');
          if (subprocessNode) {
            // Push current subprocess to navigation stack before switching
            if (state.activeSubprocessId) {
              state.subprocessNavigationStack.push(state.activeSubprocessId);
            }
            state.activeSubprocessId = subprocessId;
            state.selectedNodeId = null; // Clear selection when switching
            state.selectedEdgeId = null;
            // Clear selected property on ALL nodes in ALL sheets to prevent stale selection
            state.sheets.forEach(s => {
              s.nodes.forEach(n => { n.selected = false; });
            });
          }
        });
      },

      /**
       * Close the currently active subprocess and return to main view
       */
      closeActiveSubprocess: () => {
        set((state) => {
          state.activeSubprocessId = null;
          state.subprocessNavigationStack = []; // Clear navigation stack
          state.selectedNodeId = null; // Clear selection when closing
          state.selectedEdgeId = null;
          // Clear selected property on all nodes to prevent stale selection issues
          state.sheets.forEach(sheet => {
            sheet.nodes.forEach(n => { n.selected = false; });
          });
        });
      },

      /**
       * Navigate back to the previous subprocess in the navigation stack
       */
      navigateBackSubprocess: () => {
        set((state) => {
          if (state.subprocessNavigationStack.length > 0) {
            state.activeSubprocessId = state.subprocessNavigationStack.pop()!;
          } else {
            state.activeSubprocessId = null;
          }
          state.selectedNodeId = null;
          state.selectedEdgeId = null;
          // Clear selected property on all nodes
          state.sheets.forEach(sheet => {
            sheet.nodes.forEach(n => { n.selected = false; });
          });
        });
      },

      /**
       * Navigate to a specific subprocess in the navigation history (for breadcrumb navigation)
       * @param subprocessId - The subprocess ID to navigate to, or null for main view
       */
      navigateToSubprocess: (subprocessId: string | null) => {
        set((state) => {
          if (subprocessId === null) {
            // Navigate to main view - clear entire stack
            state.subprocessNavigationStack = [];
            state.activeSubprocessId = null;
          } else {
            // Find the target in the stack and navigate to it
            const targetIndex = state.subprocessNavigationStack.indexOf(subprocessId);
            if (targetIndex !== -1) {
              // Pop everything after the target (inclusive) and set activeSubprocessId
              state.subprocessNavigationStack = state.subprocessNavigationStack.slice(0, targetIndex);
              state.activeSubprocessId = subprocessId;
            } else if (state.activeSubprocessId === subprocessId) {
              // Already on this subprocess - do nothing
            } else {
              // Not in stack and not current - just navigate directly
              if (state.activeSubprocessId) {
                state.subprocessNavigationStack.push(state.activeSubprocessId);
              }
              state.activeSubprocessId = subprocessId;
            }
          }
          state.selectedNodeId = null;
          state.selectedEdgeId = null;
          // Clear selected property on all nodes
          state.sheets.forEach(sheet => {
            sheet.nodes.forEach(n => { n.selected = false; });
          });
        });
      },

      /**
       * Update a boundary port connection to point to a different internal node
       * This modifies the original edge's originalSource or originalTarget
       */
      updateBoundaryPortConnection: (
        originalEdgeId: string,
        direction: 'input' | 'output',
        newInternalNodeId: string,
        newHandleId?: string | null
      ) => {
        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          const edge = sheet.edges.find((e) => e.id === originalEdgeId);
          if (!edge) return;

          if (direction === 'input') {
            // Input port: update originalTarget (the internal node the edge connects to)
            edge.originalTarget = newInternalNodeId;
            edge.originalTargetHandle = newHandleId || null;
          } else {
            // Output port: update originalSource (the internal node the edge comes from)
            edge.originalSource = newInternalNodeId;
            edge.originalSourceHandle = newHandleId || null;
          }
          sheet.updatedAt = new Date();
          state.isDirty = true;
        });
      },

      /**
       * Add a new boundary port edge (for multiple connections support)
       * Reuses existing boundary ports when the external source/target is the same,
       * instead of creating duplicate ports.
       */
      addBoundaryPortEdge: (
        originalEdgeId: string,
        direction: 'input' | 'output',
        newInternalNodeId: string,
        newHandleId?: string | null
      ) => {
        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          const originalEdge = sheet.edges.find((e) => e.id === originalEdgeId);
          if (!originalEdge) return;

          const subprocessId = originalEdge.target; // for input
          const normalizedHandle = newHandleId || null;

          if (direction === 'input') {
            // For input ports: check if an edge already exists with the same external source
            // and the same subprocess as target
            const existingEdge = sheet.edges.find((e) =>
              e.source === originalEdge.source &&
              e.target === subprocessId &&
              (e.sourceHandle || null) === (originalEdge.sourceHandle || null) &&
              e.originalTargets
            );

            if (existingEdge) {
              // Reuse existing edge: add new internal node to originalTargets array
              const newTarget = { nodeId: newInternalNodeId, handleId: normalizedHandle };
              if (!existingEdge.originalTargets) {
                existingEdge.originalTargets = [];
              }
              // Check if this node is already in the targets
              const alreadyExists = existingEdge.originalTargets.some(
                t => t.nodeId === newInternalNodeId && (t.handleId || null) === normalizedHandle
              );
              if (!alreadyExists) {
                existingEdge.originalTargets.push(newTarget);
              }
            } else {
              // Create a new incoming edge: external -> subprocess (with new originalTarget)
              const newEdgeId = `edge-${originalEdge.source}-${subprocessId}-${Date.now()}`;
              const portId = `input-${originalEdge.source}`;
              const newEdge: FlowchartEdge = {
                id: newEdgeId,
                source: originalEdge.source,
                target: subprocessId,
                sourceHandle: originalEdge.sourceHandle,
                targetHandle: portId,
                originalTarget: newInternalNodeId,
                originalTargetHandle: normalizedHandle,
                originalTargets: [{ nodeId: newInternalNodeId, handleId: normalizedHandle }],
                type: state.defaultEdgeType,
              };
              sheet.edges.push(newEdge);
            }
          } else {
            // For output ports: check if an edge already exists with the subprocess as source
            // and the same external target
            const existingEdge = sheet.edges.find((e) =>
              e.source === originalEdge.source &&
              e.target === originalEdge.target &&
              (e.targetHandle || null) === (originalEdge.targetHandle || null) &&
              e.originalSources
            );

            if (existingEdge) {
              // Reuse existing edge: add new internal node to originalSources array
              const newSource = { nodeId: newInternalNodeId, handleId: normalizedHandle };
              if (!existingEdge.originalSources) {
                existingEdge.originalSources = [];
              }
              // Check if this node is already in the sources
              const alreadyExists = existingEdge.originalSources.some(
                s => s.nodeId === newInternalNodeId && (s.handleId || null) === normalizedHandle
              );
              if (!alreadyExists) {
                existingEdge.originalSources.push(newSource);
              }
            } else {
              // Create a new outgoing edge: subprocess -> external (with new originalSource)
              const newEdgeId = `edge-${originalEdge.source}-${originalEdge.target}-${Date.now()}`;
              const portId = `output-${originalEdge.target}`;
              const newEdge: FlowchartEdge = {
                id: newEdgeId,
                source: originalEdge.source, // This is the subprocess ID
                target: originalEdge.target,
                sourceHandle: portId,
                targetHandle: originalEdge.targetHandle,
                originalSource: newInternalNodeId,
                originalSourceHandle: normalizedHandle,
                originalSources: [{ nodeId: newInternalNodeId, handleId: normalizedHandle }],
                type: state.defaultEdgeType,
              };
              sheet.edges.push(newEdge);
            }
          }
          sheet.updatedAt = new Date();
          state.isDirty = true;
        });
      },

      /**
       * Remove a specific boundary port connection
       * Removes one internal connection from the originalSources or originalTargets array
       * If the array becomes empty, deletes the entire edge
       */
      removeBoundaryPortConnection: (
        originalEdgeId: string,
        direction: 'input' | 'output',
        internalNodeId: string,
        handleId?: string | null
      ) => {
        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          const edgeIndex = sheet.edges.findIndex((e) => e.id === originalEdgeId);
          if (edgeIndex === -1) return;

          const edge = sheet.edges[edgeIndex];
          const normalizedHandle = handleId || null;

          if (direction === 'input' && edge.originalTargets) {
            // Remove the specific internal target from the array
            const originalLength = edge.originalTargets.length;
            edge.originalTargets = edge.originalTargets.filter(
              t => !(t.nodeId === internalNodeId && (t.handleId || null) === normalizedHandle)
            );

            // If no connections remain, delete the entire edge
            if (edge.originalTargets.length === 0) {
              sheet.edges.splice(edgeIndex, 1);
            } else {
              // Update the primary connection (first in array) for backward compatibility
              edge.originalTarget = edge.originalTargets[0].nodeId;
              edge.originalTargetHandle = edge.originalTargets[0].handleId;
            }

            // Only mark dirty if something actually changed
            if (edge.originalTargets.length !== originalLength) {
              sheet.updatedAt = new Date();
              state.isDirty = true;
            }
          } else if (direction === 'output' && edge.originalSources) {
            // Remove the specific internal source from the array
            const originalLength = edge.originalSources.length;
            edge.originalSources = edge.originalSources.filter(
              s => !(s.nodeId === internalNodeId && (s.handleId || null) === normalizedHandle)
            );

            // If no connections remain, delete the entire edge
            if (edge.originalSources.length === 0) {
              sheet.edges.splice(edgeIndex, 1);
            } else {
              // Update the primary connection (first in array) for backward compatibility
              edge.originalSource = edge.originalSources[0].nodeId;
              edge.originalSourceHandle = edge.originalSources[0].handleId;
            }

            // Only mark dirty if something actually changed
            if (edge.originalSources.length !== originalLength) {
              sheet.updatedAt = new Date();
              state.isDirty = true;
            }
          }
        });
      },

      /**
       * Update style and/or label of a specific boundary port connection
       * @param originalEdgeId - The ID of the original edge containing the boundary connections
       * @param direction - 'input' for originalTargets, 'output' for originalSources
       * @param connectionIndex - Index of the connection in the array
       * @param style - Optional new style options
       * @param label - Optional new label
       */
      updateBoundaryConnectionStyle: (
        originalEdgeId: string,
        direction: 'input' | 'output',
        connectionIndex: number,
        style?: EdgeStyleOptions,
        label?: string
      ) => {
        set((state) => {
          // Edge ID format: "boundary-edge-out-{portId}" e.g., "boundary-edge-out-port-out-uuid"
          // Extract portId from edge ID: "boundary-edge-out-port-out-uuid" -> "port-out-uuid"
          const portIdMatch = originalEdgeId.match(/^boundary-edge-(in|out)-(.+)$/);
          if (!portIdMatch) return state;

          const portId = portIdMatch[2]; // e.g., "port-out-uuid"

          // Find the subprocess node that has this port - search in all sheets
          let targetSheet: Sheet | undefined;
          let subprocessNode: FlowchartNode | undefined;

          for (const sheet of state.sheets) {
            subprocessNode = sheet.nodes.find(n => {
              const nodeData = n.data as ProcessNodeData;
              const ports = direction === 'input' ? nodeData.inputPorts : nodeData.outputPorts;
              return ports?.some(p => p.id === portId);
            });
            if (subprocessNode) {
              targetSheet = sheet;
              break;
            }
          }

          if (!subprocessNode || !targetSheet) return state;

          const nodeData = subprocessNode.data as ProcessNodeData;
          const ports = direction === 'input' ? nodeData.inputPorts : nodeData.outputPorts;
          const port = ports?.find(p => p.id === portId);

          if (!port || !port.internalConnections || !port.internalConnections[connectionIndex]) {
            return state;
          }

          // Update the style and label in the internal connection
          const connection = port.internalConnections[connectionIndex];
          if (style !== undefined) {
            connection.style = style;
          }
          if (label !== undefined) {
            connection.label = label;
          }

          // Trigger recalculation of virtual edges
          targetSheet.updatedAt = new Date();
          state.isDirty = true;
          state.edgeVersion += 1;
        });
      },

      // =============================================================================
      // Manual Port Actions
      // =============================================================================

      /**
       * Add a manual port to a subprocess node
       * @param subprocessId - The ID of the subprocess node
       * @param direction - 'input' or 'output'
       * @param label - Optional label for the port (defaults to "Input N" or "Output N")
       * @returns The ID of the created port
       */
      addManualPort: (subprocessId: string, direction: 'input' | 'output', label?: string): string => {
        const portId = direction === 'input' ? `port-in-${uuidv4()}` : `port-out-${uuidv4()}`;
        const defaultLabel = label || `${direction === 'input' ? 'Input' : 'Output'}`;

        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          const nodeIndex = sheet.nodes.findIndex((n) => n.id === subprocessId && n.type === 'subprocess');
          if (nodeIndex === -1) return;

          const node = sheet.nodes[nodeIndex];
          const nodeData = node.data as ProcessNodeData;

          // Get existing ports and count for default labeling
          const existingPorts = direction === 'input'
            ? (nodeData.inputPorts || [])
            : (nodeData.outputPorts || []);

          const portLabel = label || `${defaultLabel} ${existingPorts.length + 1}`;

          // Calculate initial position based on existing internal nodes or existing ports
          // Get children from parentId relationships (single source of truth)
          const childNodes = sheet.nodes.filter(n => n.data.parentId === subprocessId);

          let initialPosition = { x: 0, y: 0 };

          if (childNodes.length > 0) {
            // Has internal nodes - position based on them
            const xPositions = childNodes.map(n => n.position.x);
            const yPositions = childNodes.map(n => n.position.y);
            const avgY = yPositions.reduce((a, b) => a + b, 0) / yPositions.length;

            if (direction === 'input') {
              const minX = Math.min(...xPositions);
              initialPosition = { x: minX - 180, y: avgY };
            } else {
              const maxX = Math.max(...xPositions.map((x, i) => x + (childNodes[i].measured?.width || 180)));
              initialPosition = { x: maxX + 60, y: avgY };
            }
          } else {
            // No internal nodes - use default canvas positions with vertical distribution
            const existingPortsInDirection = existingPorts.length;
            const verticalSpacing = 80;
            const centerY = 200; // Default center Y position

            if (direction === 'input') {
              // Position input ports on the left side
              const startY = centerY - ((existingPortsInDirection) * verticalSpacing) / 2;
              initialPosition = { x: 50, y: startY + existingPortsInDirection * verticalSpacing };
            } else {
              // Position output ports on the right side
              const startY = centerY - ((existingPortsInDirection) * verticalSpacing) / 2;
              initialPosition = { x: 500, y: startY + existingPortsInDirection * verticalSpacing };
            }
          }

          const newPort: Port = {
            id: portId,
            direction,
            label: portLabel,
            position: initialPosition,
            // Default handlePosition: left for inputs, right for outputs
            handlePosition: direction === 'input' ? 'left' : 'right',
          };

          if (direction === 'input') {
            sheet.nodes[nodeIndex] = {
              ...node,
              data: {
                ...nodeData,
                inputPorts: [...existingPorts, newPort],
              },
            } as FlowchartNode;
          } else {
            sheet.nodes[nodeIndex] = {
              ...node,
              data: {
                ...nodeData,
                outputPorts: [...existingPorts, newPort],
              },
            } as FlowchartNode;
          }

          sheet.updatedAt = new Date();
          state.nodeVersion += 1;
          state.edgeVersion += 1; // Trigger edge recalculation since port positions change
          state.isDirty = true;
          syncNodesAndEdgesFromActiveSheet(state);
        });

        return portId;
      },

      /**
       * Update a manual port's properties
       * @param subprocessId - The ID of the subprocess node
       * @param portId - The ID of the port to update
       * @param updates - Partial updates (label, position, locked, handlePosition)
       */
      updateManualPort: (subprocessId: string, portId: string, updates: Partial<Pick<Port, 'label' | 'position' | 'locked' | 'handlePosition'>>) => {
        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          const nodeIndex = sheet.nodes.findIndex((n) => n.id === subprocessId && n.type === 'subprocess');
          if (nodeIndex === -1) return;

          const node = sheet.nodes[nodeIndex];
          const nodeData = node.data as ProcessNodeData;

          // Check input ports
          const inputPorts = nodeData.inputPorts || [];
          const inputIndex = inputPorts.findIndex(p => p.id === portId);

          if (inputIndex !== -1) {
            inputPorts[inputIndex] = { ...inputPorts[inputIndex], ...updates };
            sheet.nodes[nodeIndex] = {
              ...node,
              data: { ...nodeData, inputPorts: [...inputPorts] },
            } as FlowchartNode;
            sheet.updatedAt = new Date();
            state.nodeVersion += 1;
            state.edgeVersion += 1; // Trigger edge recalculation for port position changes
            state.isDirty = true;
            syncNodesAndEdgesFromActiveSheet(state);
            return;
          }

          // Check output ports
          const outputPorts = nodeData.outputPorts || [];
          const outputIndex = outputPorts.findIndex(p => p.id === portId);

          if (outputIndex !== -1) {
            outputPorts[outputIndex] = { ...outputPorts[outputIndex], ...updates };
            sheet.nodes[nodeIndex] = {
              ...node,
              data: { ...nodeData, outputPorts: [...outputPorts] },
            } as FlowchartNode;
            sheet.updatedAt = new Date();
            state.nodeVersion += 1;
            state.edgeVersion += 1; // Trigger edge recalculation for port position changes
            state.isDirty = true;
            syncNodesAndEdgesFromActiveSheet(state);
          }
        });
      },

      /**
       * Delete a manual port and any associated edges
       * @param subprocessId - The ID of the subprocess node
       * @param portId - The ID of the port to delete
       */
      deleteManualPort: (subprocessId: string, portId: string) => {
        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          const nodeIndex = sheet.nodes.findIndex((n) => n.id === subprocessId && n.type === 'subprocess');
          if (nodeIndex === -1) return;

          const node = sheet.nodes[nodeIndex];
          const nodeData = node.data as ProcessNodeData;

          // Determine direction and remove from appropriate array
          const inputPorts = nodeData.inputPorts || [];
          const outputPorts = nodeData.outputPorts || [];

          const isInput = inputPorts.some(p => p.id === portId);
          const isOutput = outputPorts.some(p => p.id === portId);

          if (isInput) {
            sheet.nodes[nodeIndex] = {
              ...node,
              data: {
                ...nodeData,
                inputPorts: inputPorts.filter(p => p.id !== portId),
              },
            } as FlowchartNode;
          } else if (isOutput) {
            sheet.nodes[nodeIndex] = {
              ...node,
              data: {
                ...nodeData,
                outputPorts: outputPorts.filter(p => p.id !== portId),
              },
            } as FlowchartNode;
          } else {
            return; // Port not found
          }

          // Remove any edges connected to this port
          // For input ports: edges where targetHandle is the portId
          // For output ports: edges where sourceHandle is the portId
          sheet.edges = sheet.edges.filter(edge => {
            const targetMatches = edge.target === subprocessId && edge.targetHandle === portId;
            const sourceMatches = edge.source === subprocessId && edge.sourceHandle === portId;
            return !targetMatches && !sourceMatches;
          });

          sheet.updatedAt = new Date();
          state.nodeVersion += 1;
          state.edgeVersion += 1;
          state.isDirty = true;
          syncNodesAndEdgesFromActiveSheet(state);
        });
      },

      /**
       * Add an internal connection to a manual port
       * This is called when connecting from a manual boundary port to an internal node
       */
      addManualPortConnection: (
        subprocessId: string,
        portId: string,
        internalNodeId: string,
        handleId?: string | null
      ) => {
        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          const nodeIndex = sheet.nodes.findIndex((n) => n.id === subprocessId && n.type === 'subprocess');
          if (nodeIndex === -1) return;

          const node = sheet.nodes[nodeIndex];
          const nodeData = node.data as ProcessNodeData;

          // Find the port and add the connection
          const inputPorts = nodeData.inputPorts || [];
          const outputPorts = nodeData.outputPorts || [];

          const inputPortIndex = inputPorts.findIndex(p => p.id === portId);
          const outputPortIndex = outputPorts.findIndex(p => p.id === portId);

          const newConnection: InternalNodeConnection = {
            nodeId: internalNodeId,
            handleId: handleId || null,
          };

          if (inputPortIndex !== -1) {
            const port = inputPorts[inputPortIndex];
            const existingConnections = port.internalConnections || [];
            // Check if connection already exists
            const exists = existingConnections.some(
              c => c.nodeId === internalNodeId && (c.handleId || null) === (handleId || null)
            );
            if (!exists) {
              inputPorts[inputPortIndex] = {
                ...port,
                internalConnections: [...existingConnections, newConnection],
              };
              sheet.nodes[nodeIndex] = {
                ...node,
                data: { ...nodeData, inputPorts: [...inputPorts] },
              } as FlowchartNode;
              sheet.updatedAt = new Date();
              state.nodeVersion += 1;
              state.edgeVersion += 1; // Trigger edge recalculation for virtual edges
              state.isDirty = true;
              syncNodesAndEdgesFromActiveSheet(state);
            }
          } else if (outputPortIndex !== -1) {
            const port = outputPorts[outputPortIndex];
            const existingConnections = port.internalConnections || [];
            // Check if connection already exists
            const exists = existingConnections.some(
              c => c.nodeId === internalNodeId && (c.handleId || null) === (handleId || null)
            );
            if (!exists) {
              outputPorts[outputPortIndex] = {
                ...port,
                internalConnections: [...existingConnections, newConnection],
              };
              sheet.nodes[nodeIndex] = {
                ...node,
                data: { ...nodeData, outputPorts: [...outputPorts] },
              } as FlowchartNode;
              sheet.updatedAt = new Date();
              state.nodeVersion += 1;
              state.edgeVersion += 1; // Trigger edge recalculation for virtual edges
              state.isDirty = true;
              syncNodesAndEdgesFromActiveSheet(state);
            }
          }
        });
      },

      /**
       * Remove an internal connection from a manual port
       * This is called when deleting a virtual edge from a manual boundary port
       */
      removeManualPortConnection: (
        subprocessId: string,
        portId: string,
        internalNodeId: string,
        handleId?: string | null
      ) => {
        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          const nodeIndex = sheet.nodes.findIndex((n) => n.id === subprocessId && n.type === 'subprocess');
          if (nodeIndex === -1) return;

          const node = sheet.nodes[nodeIndex];
          const nodeData = node.data as ProcessNodeData;

          const inputPorts = nodeData.inputPorts || [];
          const outputPorts = nodeData.outputPorts || [];

          const inputPortIndex = inputPorts.findIndex(p => p.id === portId);
          const outputPortIndex = outputPorts.findIndex(p => p.id === portId);

          const normalizedHandle = handleId || null;

          if (inputPortIndex !== -1) {
            const port = inputPorts[inputPortIndex];
            const connections = port.internalConnections || [];
            const filteredConnections = connections.filter(
              c => !(c.nodeId === internalNodeId && (c.handleId || null) === normalizedHandle)
            );
            inputPorts[inputPortIndex] = {
              ...port,
              internalConnections: filteredConnections,
            };
            sheet.nodes[nodeIndex] = {
              ...node,
              data: { ...nodeData, inputPorts: [...inputPorts] },
            } as FlowchartNode;
            sheet.updatedAt = new Date();
            state.nodeVersion += 1;
            state.edgeVersion += 1; // Trigger edge recalculation for virtual edges
            state.isDirty = true;
            syncNodesAndEdgesFromActiveSheet(state);
          } else if (outputPortIndex !== -1) {
            const port = outputPorts[outputPortIndex];
            const connections = port.internalConnections || [];
            const filteredConnections = connections.filter(
              c => !(c.nodeId === internalNodeId && (c.handleId || null) === normalizedHandle)
            );
            outputPorts[outputPortIndex] = {
              ...port,
              internalConnections: filteredConnections,
            };
            sheet.nodes[nodeIndex] = {
              ...node,
              data: { ...nodeData, outputPorts: [...outputPorts] },
            } as FlowchartNode;
            sheet.updatedAt = new Date();
            state.nodeVersion += 1;
            state.edgeVersion += 1; // Trigger edge recalculation for virtual edges
            state.isDirty = true;
            syncNodesAndEdgesFromActiveSheet(state);
          }
        });
      },

      /**
       * Lock nodes so they cannot be moved
       */
      lockNodes: (nodeIds: string[]) => {
        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          nodeIds.forEach((nodeId) => {
            const nodeIndex = sheet.nodes.findIndex((n) => n.id === nodeId);
            if (nodeIndex !== -1) {
              sheet.nodes[nodeIndex] = {
                ...sheet.nodes[nodeIndex],
                data: {
                  ...sheet.nodes[nodeIndex].data,
                  locked: true,
                },
              } as FlowchartNode;
            }
          });
          sheet.updatedAt = new Date();
          state.isDirty = true;
          state.nodeVersion += 1;
          syncNodesAndEdgesFromActiveSheet(state);
        });
      },

      /**
       * Unlock nodes so they can be moved again
       */
      unlockNodes: (nodeIds: string[]) => {
        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          nodeIds.forEach((nodeId) => {
            const nodeIndex = sheet.nodes.findIndex((n) => n.id === nodeId);
            if (nodeIndex !== -1) {
              sheet.nodes[nodeIndex] = {
                ...sheet.nodes[nodeIndex],
                data: {
                  ...sheet.nodes[nodeIndex].data,
                  locked: false,
                },
              } as FlowchartNode;
            }
          });
          sheet.updatedAt = new Date();
          state.isDirty = true;
          state.nodeVersion += 1;
          syncNodesAndEdgesFromActiveSheet(state);
        });
      },

      // =============================================================================
      // Filter Actions
      // =============================================================================

      /**
       * Set filter tags
       */
      setFilterTags: (tags: string[]) => {
        set((state) => {
          state.filterTags = tags;
        });
      },

      /**
       * Set filter sheets
       */
      setFilterSheets: (sheets: string[]) => {
        set((state) => {
          state.filterSheets = sheets;
        });
      },

      /**
       * Set filter roles
       */
      setFilterRoles: (roles: string[]) => {
        set((state) => {
          state.filterRoles = roles;
        });
      },

      /**
       * Set filter documents
       */
      setFilterDocuments: (documents: string[]) => {
        set((state) => {
          state.filterDocuments = documents;
        });
      },

      /**
       * Set filter data
       */
      setFilterData: (data: string[]) => {
        set((state) => {
          state.filterData = data;
        });
      },

      /**
       * Set filter search text
       */
      setFilterSearchText: (text: string) => {
        set((state) => {
          state.filterSearchText = text;
        });
      },

      /**
       * Set filter node types
       */
      setFilterNodeTypes: (nodeTypes: ProcessNodeType[]) => {
        set((state) => {
          state.filterNodeTypes = nodeTypes;
        });
      },

      /**
       * Set filter frequencies
       */
      setFilterFrequencies: (frequencies: FrequencyType[]) => {
        set((state) => {
          state.filterFrequencies = frequencies;
        });
      },

      /**
       * Set filter unit types
       */
      setFilterUnitTypes: (unitTypes: UnitType[]) => {
        set((state) => {
          state.filterUnitTypes = unitTypes;
        });
      },

      /**
       * Set filter locked status
       */
      setFilterLocked: (locked: boolean | null) => {
        set((state) => {
          state.filterLocked = locked;
        });
      },

      /**
       * Set filter requiresFTE status
       */
      setFilterRequiresFTE: (requiresFTE: boolean | null) => {
        set((state) => {
          state.filterRequiresFTE = requiresFTE;
        });
      },

      /**
       * Set filter hasPainPoints status
       */
      setFilterHasPainPoints: (hasPainPoints: boolean | null) => {
        set((state) => {
          state.filterHasPainPoints = hasPainPoints;
        });
      },

      /**
       * Set filter hasImprovement status
       */
      setFilterHasImprovement: (hasImprovement: boolean | null) => {
        set((state) => {
          state.filterHasImprovement = hasImprovement;
        });
      },

      /**
       * Set filter systems
       */
      setFilterSystems: (systems: string[]) => {
        set((state) => {
          state.filterSystems = systems;
        });
      },

      /**
       * Set filter hasRisk status
       */
      setFilterHasRisk: (hasRisk: boolean | null) => {
        set((state) => {
          state.filterHasRisk = hasRisk;
        });
      },

      /**
       * Clear all filters
       */
      clearAllFilters: () => {
        set((state) => {
          state.filterTags = [];
          state.filterRoles = [];
          state.filterDocuments = [];
          state.filterData = [];
          state.filterSearchText = '';
          state.filterNodeTypes = [];
          state.filterFrequencies = [];
          state.filterUnitTypes = [];
          state.filterLocked = null;
          state.filterRequiresFTE = null;
          state.filterHasPainPoints = null;
          state.filterHasImprovement = null;
          state.filterSystems = [];
          state.filterHasRisk = null;
          state.filterSheets = [];
        });
      },

      /**
       * Toggle filter panel visibility
       */
      toggleFilterPanel: () => {
        set((state) => {
          state.isFilterPanelOpen = !state.isFilterPanelOpen;
        });
      },

      /**
       * Set filter panel open state
       */
      setFilterPanelOpen: (isOpen: boolean) => {
        set((state) => {
          state.isFilterPanelOpen = isOpen;
        });
      },

      /**
       * Set filter mode (simple or advanced)
       */
      setFilterMode: (mode: FilterMode) => {
        set((state) => {
          state.filterMode = mode;
        });
      },

      /**
       * Set cursor mode for canvas interaction
       */
      setCursorMode: (mode: CursorMode) => {
        set((state) => {
          state.cursorMode = mode;
        });
      },

      // =============================================================================
      // Highlighted Nodes Actions (ListView -> Flowchart visual filtering)
      // =============================================================================

      /**
       * Set the highlighted nodes (replaces current selection)
       */
      setHighlightedNodes: (nodeIds: string[]) => {
        set((state) => {
          state.highlightedNodeIds = nodeIds;
        });
      },

      /**
       * Toggle a node's highlight status
       */
      toggleHighlightedNode: (nodeId: string) => {
        set((state) => {
          const index = state.highlightedNodeIds.indexOf(nodeId);
          if (index === -1) {
            state.highlightedNodeIds.push(nodeId);
          } else {
            state.highlightedNodeIds.splice(index, 1);
          }
        });
      },

      /**
       * Clear all highlighted nodes
       */
      clearHighlightedNodes: () => {
        set((state) => {
          state.highlightedNodeIds = [];
        });
      },

      // =============================================================================
      // Clipboard Actions (Copy/Paste)
      // =============================================================================

      /**
       * Copy selected nodes and their internal connections to clipboard
       * When copying a subprocess, also includes all child nodes
       */
      copySelectedNodes: () => {
        const state = get();
        const sheet = state.sheets.find(s => s.id === state.activeSheetId);
        if (!sheet) return;

        const selectedNodes = sheet.nodes.filter(n => n.selected);
        if (selectedNodes.length === 0) return;

        const selectedIds = new Set(selectedNodes.map(n => n.id));
        const nodesToCopy = [...selectedNodes];

        // Recursively add all descendant nodes (children, grandchildren, etc.) of subprocesses
        const addAllDescendants = (subprocessId: string) => {
          // Get children from parentId relationships (single source of truth)
          const children = sheet.nodes.filter(n => n.data.parentId === subprocessId);
          children.forEach(childNode => {
            if (!selectedIds.has(childNode.id)) {
              nodesToCopy.push(childNode);
              selectedIds.add(childNode.id);

              // Recursively add descendants if this child is also a subprocess
              if (childNode.type === 'subprocess') {
                addAllDescendants(childNode.id);
              }
            }
          });
        };

        // For each selected subprocess, also include ALL its descendants
        selectedNodes.forEach(node => {
          if (node.type === 'subprocess') {
            addAllDescendants(node.id);
          }
        });

        // Get all IDs including children
        const allCopiedIds = new Set(nodesToCopy.map(n => n.id));

        // Get internal edges (both ends in the copied set)
        const internalEdges = sheet.edges.filter(e =>
          allCopiedIds.has(e.source) && allCopiedIds.has(e.target)
        );

        // Deep clone to avoid reference issues
        const clonedNodes = JSON.parse(JSON.stringify(nodesToCopy));
        set({
          clipboardNodes: clonedNodes,
          clipboardEdges: JSON.parse(JSON.stringify(internalEdges)),
          clipboardSourceFlowchartId: state.flowchartId,
          clipboardSourceSheetId: state.activeSheetId,
        });
      },

      /**
       * Paste nodes from clipboard at offset position
       * Handles parent-child relationships for subprocess nodes
       * Handles manual port labels based on whether connected external nodes were also copied
       */
      pasteNodes: (position?: { x: number; y: number }) => {
        const state = get();
        if (state.clipboardNodes.length === 0) return;

        const OFFSET = position ?? { x: 50, y: 50 };
        const idMap = new Map<string, string>();

        // Save snapshot for undo
        get().saveSnapshot('Paste nodes');

        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          // First pass: create ID mapping for all nodes
          state.clipboardNodes.forEach(node => {
            const newId = uuidv4();
            idMap.set(node.id, newId);
          });

          // Build a map of external nodes that connect to subprocess ports
          // Key: subprocessId, Value: Map of portId -> externalNodeId
          // Handles both manual ports (manual-input-xxx) and auto-created ports (input-xxx)
          const subprocessExternalConnections = new Map<string, Map<string, string>>();

          state.clipboardEdges.forEach(edge => {
            // Check if this edge connects to a subprocess port
            const sourceNode = state.clipboardNodes.find(n => n.id === edge.source);
            const targetNode = state.clipboardNodes.find(n => n.id === edge.target);

            // Case: External node -> Subprocess input port
            // Unified format: "port-in-xxx"
            if (targetNode?.type === 'subprocess' && edge.targetHandle) {
              const isInputPort = edge.targetHandle.startsWith('port-in-');
              if (isInputPort) {
                const portId = edge.targetHandle;
                if (!subprocessExternalConnections.has(edge.target)) {
                  subprocessExternalConnections.set(edge.target, new Map());
                }
                subprocessExternalConnections.get(edge.target)!.set(portId, edge.source);
              }
            }
            // Case: Subprocess output port -> External node
            // Unified format: "port-out-xxx"
            if (sourceNode?.type === 'subprocess' && edge.sourceHandle) {
              const isOutputPort = edge.sourceHandle.startsWith('port-out-');
              if (isOutputPort) {
                const portId = edge.sourceHandle;
                if (!subprocessExternalConnections.has(edge.source)) {
                  subprocessExternalConnections.set(edge.source, new Map());
                }
                subprocessExternalConnections.get(edge.source)!.set(portId, edge.target);
              }
            }
          });

          // Track port ID changes for updating edge handles and internal connection handleIds
          // Key: oldPortId, Value: newPortId
          const portIdMap = new Map<string, string>();

          // First pass: build portIdMap for all ports
          state.clipboardNodes.forEach(node => {
            if (node.type === 'subprocess') {
              const nodeData = node.data as ProcessNodeData;

              // Map input ports
              (nodeData.inputPorts || []).forEach((port: Port) => {
                const oldPortId = port.id;
                const newPortId = `port-in-${uuidv4()}`;
                portIdMap.set(oldPortId, newPortId);
              });

              // Map output ports
              (nodeData.outputPorts || []).forEach((port: Port) => {
                const oldPortId = port.id;
                const newPortId = `port-out-${uuidv4()}`;
                portIdMap.set(oldPortId, newPortId);
              });
            }
          });

          // Clone nodes with new IDs
          const newNodes = state.clipboardNodes.map(node => {
            const newId = idMap.get(node.id)!;
            const nodeData = node.data as ProcessNodeData;

            // Create a deep copy of the node data
            const newData = {
              ...JSON.parse(JSON.stringify(nodeData)),
              id: newId,
              locked: false, // Pasted nodes are unlocked by default
            };

            // Handle parentId mapping:
            // - If the node had a parent that was ALSO copied, map to the new parent ID
            // - If the node had a parent that was NOT copied (external), update based on context
            // - If the node had no parent, it becomes a direct child of the target (if any)
            if (newData.parentId) {
              if (idMap.has(newData.parentId)) {
                // Parent was also copied - map to new parent ID (this preserves internal hierarchy)
                newData.parentId = idMap.get(newData.parentId);
              } else if (state.activeSubprocessId) {
                // Parent wasn't copied but we're inside a subprocess - use current subprocess
                newData.parentId = state.activeSubprocessId;
              } else {
                // Parent wasn't copied and we're not inside a subprocess
                // Clear the parentId to avoid orphan reference
                newData.parentId = undefined;
              }
            } else if (state.activeSubprocessId) {
              // Node had no parent but we're pasting into a subprocess - become child of target
              newData.parentId = state.activeSubprocessId;
            }

            // Handle ports for subprocess nodes
            if (node.type === 'subprocess') {
              const originalSubprocessId = node.id;
              const externalConnections = subprocessExternalConnections.get(originalSubprocessId);

              // Update input ports - always generate new port IDs for pasted nodes
              if (newData.inputPorts) {
                newData.inputPorts = newData.inputPorts.map((port: Port, index: number) => {
                  const oldPortId = port.id;
                  // Use the pre-built portIdMap
                  const newPortId = portIdMap.get(oldPortId) || `port-in-${uuidv4()}`;
                  let newLabel = `Input ${index + 1}`;

                  // Check if this port has an external connection that was also copied
                  const externalNodeId = externalConnections?.get(oldPortId);

                  if (externalNodeId) {
                    // External node was copied - get its new name for the label
                    const externalNode = state.clipboardNodes.find(n => n.id === externalNodeId);
                    if (externalNode) {
                      const externalNodeData = externalNode.data as ProcessNodeData;
                      newLabel = externalNodeData.label || `Input ${index + 1}`;
                    }
                  }

                  // Update internal connections with new node IDs AND new port handle IDs
                  const newInternalConnections = (port.internalConnections || []).map((conn: InternalNodeConnection) => {
                    const newNodeId = idMap.get(conn.nodeId) || conn.nodeId;
                    // If handleId is a port ID, map it to the new port ID
                    let newHandleId = conn.handleId;
                    if (conn.handleId && portIdMap.has(conn.handleId)) {
                      newHandleId = portIdMap.get(conn.handleId) || conn.handleId;
                    }
                    return {
                      ...conn,
                      nodeId: newNodeId,
                      handleId: newHandleId,
                    };
                  });

                  return {
                    ...port,
                    id: newPortId,
                    label: newLabel,
                    // Update internal connections with new node IDs
                    internalConnections: newInternalConnections,
                    // Clear position to use default positioning
                    position: undefined,
                  };
                });
              }

              // Update output ports - always generate new port IDs for pasted nodes
              if (newData.outputPorts) {
                newData.outputPorts = newData.outputPorts.map((port: Port, index: number) => {
                  const oldPortId = port.id;
                  // Use the pre-built portIdMap
                  const newPortId = portIdMap.get(oldPortId) || `port-out-${uuidv4()}`;
                  let newLabel = `Output ${index + 1}`;

                  // Check if this port has an external connection that was also copied
                  const externalNodeId = externalConnections?.get(oldPortId);

                  if (externalNodeId) {
                    // External node was copied - get its new name for the label
                    const externalNode = state.clipboardNodes.find(n => n.id === externalNodeId);
                    if (externalNode) {
                      const externalNodeData = externalNode.data as ProcessNodeData;
                      newLabel = externalNodeData.label || `Output ${index + 1}`;
                    }
                  }

                  // Track port ID change
                  portIdMap.set(oldPortId, newPortId);

                  return {
                    ...port,
                    id: newPortId,
                    label: newLabel,
                    // Update internal connections with new node IDs AND new port handle IDs
                    internalConnections: (port.internalConnections || []).map((conn: InternalNodeConnection) => {
                      const newNodeId = idMap.get(conn.nodeId) || conn.nodeId;
                      // If handleId is a port ID, map it to the new port ID
                      let newHandleId = conn.handleId;
                      if (conn.handleId && portIdMap.has(conn.handleId)) {
                        newHandleId = portIdMap.get(conn.handleId) || conn.handleId;
                      }
                      return {
                        ...conn,
                        nodeId: newNodeId,
                        handleId: newHandleId,
                      };
                    }),
                    // Clear position to use default positioning
                    position: undefined,
                  };
                });
              }
            }

            return {
              ...JSON.parse(JSON.stringify(node)),
              id: newId,
              position: {
                x: node.position.x + OFFSET.x,
                y: node.position.y + OFFSET.y,
              },
              selected: true,
              data: newData,
            } as FlowchartNode;
          });

          // Clone edges with updated IDs
          // Also update port handles if port IDs changed
          const newEdges = state.clipboardEdges.map(edge => {
            const newEdge = {
              ...JSON.parse(JSON.stringify(edge)),
              id: `edge-${uuidv4()}`,
              source: idMap.get(edge.source)!,
              target: idMap.get(edge.target)!,
            };

            // Update targetHandle if it's a port ID that changed
            if (edge.targetHandle && portIdMap.has(edge.targetHandle)) {
              newEdge.targetHandle = portIdMap.get(edge.targetHandle);
            }

            // Update sourceHandle if it's a port ID that changed
            if (edge.sourceHandle && portIdMap.has(edge.sourceHandle)) {
              newEdge.sourceHandle = portIdMap.get(edge.sourceHandle);
            }

            return newEdge;
          });

          // Deselect existing nodes
          sheet.nodes = sheet.nodes.map(n => ({ ...n, selected: false }));

          // Add new nodes and edges
          sheet.nodes = [...sheet.nodes, ...newNodes];
          sheet.edges = [...sheet.edges, ...newEdges];

          sheet.updatedAt = new Date();
          state.isDirty = true;
          state.nodeVersion += 1;
          state.edgeVersion += 1;
          syncNodesAndEdgesFromActiveSheet(state);
        });
      },

      /**
       * Cut selected nodes (copy + delete)
       */
      cutSelectedNodes: () => {
        const state = get();
        const sheet = state.sheets.find(s => s.id === state.activeSheetId);
        if (!sheet) return;

        const selectedNodes = sheet.nodes.filter(n => n.selected);
        if (selectedNodes.length === 0) return;

        // First copy
        get().copySelectedNodes();

        // Then delete using deleteNodes (parentId is the single source of truth)
        const nodeIdsToDelete = selectedNodes.map(n => n.id);
        get().deleteNodes(nodeIdsToDelete);
      },

      /**
       * Check if clipboard has content
       */
      hasClipboardContent: () => {
        const state = get();
        return state.clipboardNodes.length > 0;
      },

      /**
       * Get clipboard source info for display
       */
      getClipboardSourceInfo: () => {
        const state = get();
        if (state.clipboardNodes.length === 0) return null;

        return {
          nodeCount: state.clipboardNodes.length,
          edgeCount: state.clipboardEdges.length,
          sourceFlowchartId: state.clipboardSourceFlowchartId,
          sourceSheetId: state.clipboardSourceSheetId,
          isFromCurrentFlowchart: state.clipboardSourceFlowchartId === state.flowchartId,
        };
      },

      // =============================================================================
      // History Actions (Undo/Redo)
      // =============================================================================

      /**
       * Save a snapshot for undo (internal helper - used by other actions)
       */
      saveSnapshot: (actionType: string) => {
        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          const snapshot: SheetSnapshot = {
            nodes: JSON.parse(JSON.stringify(sheet.nodes)),
            edges: JSON.parse(JSON.stringify(sheet.edges)),
            actionType,
            timestamp: Date.now(),
          };

          state.past.push(snapshot);
          state.future = []; // Clear redo stack on new action

          // Limit history depth
          if (state.past.length > state.maxHistoryDepth) {
            state.past.shift();
          }
        });
      },

      /**
       * Undo the last action
       */
      undo: () => {
        const state = get();
        if (state.past.length === 0) return;

        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          // Save current state to future
          const currentSnapshot: SheetSnapshot = {
            nodes: JSON.parse(JSON.stringify(sheet.nodes)),
            edges: JSON.parse(JSON.stringify(sheet.edges)),
            actionType: 'Current state',
            timestamp: Date.now(),
          };
          state.future.push(currentSnapshot);

          // Restore previous state
          const previousState = state.past.pop()!;
          sheet.nodes = previousState.nodes;
          sheet.edges = previousState.edges;
          sheet.updatedAt = new Date();
          state.isDirty = true;
          state.nodeVersion += 1;
          state.edgeVersion += 1;
          syncNodesAndEdgesFromActiveSheet(state);
        });
      },

      /**
       * Redo the last undone action
       */
      redo: () => {
        const state = get();
        if (state.future.length === 0) return;

        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          // Save current state to past
          const currentSnapshot: SheetSnapshot = {
            nodes: JSON.parse(JSON.stringify(sheet.nodes)),
            edges: JSON.parse(JSON.stringify(sheet.edges)),
            actionType: 'Before redo',
            timestamp: Date.now(),
          };
          state.past.push(currentSnapshot);

          // Restore future state
          const nextState = state.future.pop()!;
          sheet.nodes = nextState.nodes;
          sheet.edges = nextState.edges;
          sheet.updatedAt = new Date();
          state.isDirty = true;
          state.nodeVersion += 1;
          state.edgeVersion += 1;
          syncNodesAndEdgesFromActiveSheet(state);
        });
      },

      /**
       * Check if undo is available
       */
      canUndo: () => {
        const state = get();
        return state.past.length > 0;
      },

      /**
       * Check if redo is available
       */
      canRedo: () => {
        const state = get();
        return state.future.length > 0;
      },

      /**
       * Clear history stacks
       */
      clearHistory: () => {
        set((state) => {
          state.past = [];
          state.future = [];
        });
      },

      /**
       * Add a control point to an edge
       */
      addControlPoint: (edgeId: string, position: { x: number; y: number }) => {
        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          const edgeIndex = sheet.edges.findIndex((e) => e.id === edgeId);
          if (edgeIndex === -1) return;

          const edge = sheet.edges[edgeIndex];
          const currentData = (edge.data || {}) as { controlPoints?: EdgeControlPoint[] };
          const currentControlPoints = currentData.controlPoints || [];

          // Find source and target positions for sorted insertion
          // We need to get the actual node positions to calculate the proper order
          const sourceNode = sheet.nodes.find(n => n.id === edge.source);
          const targetNode = sheet.nodes.find(n => n.id === edge.target);

          if (!sourceNode || !targetNode) return;

          const source = { x: sourceNode.position.x, y: sourceNode.position.y };
          const target = { x: targetNode.position.x, y: targetNode.position.y };

          // Insert control point sorted by position along the path
          const newControlPoints = insertControlPointSorted(
            currentControlPoints,
            position,
            source,
            target
          );

          sheet.edges[edgeIndex] = {
            ...edge,
            data: {
              ...currentData,
              controlPoints: newControlPoints,
            },
          };
          sheet.updatedAt = new Date();
          state.isDirty = true;
          syncNodesAndEdgesFromActiveSheet(state);
        });
      },

      /**
       * Update a control point position
       */
      updateControlPoint: (edgeId: string, pointId: string, position: { x: number; y: number }) => {
        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          const edgeIndex = sheet.edges.findIndex((e) => e.id === edgeId);
          if (edgeIndex === -1) return;

          const edge = sheet.edges[edgeIndex];
          const currentData = (edge.data || {}) as { controlPoints?: EdgeControlPoint[] };
          const currentControlPoints = currentData.controlPoints || [];

          const updatedControlPoints = currentControlPoints.map(cp =>
            cp.id === pointId ? { ...cp, x: position.x, y: position.y } : cp
          );

          sheet.edges[edgeIndex] = {
            ...edge,
            data: {
              ...currentData,
              controlPoints: updatedControlPoints,
            },
          };
          sheet.updatedAt = new Date();
          state.isDirty = true;
          syncNodesAndEdgesFromActiveSheet(state);
        });
      },

      /**
       * Remove a control point from an edge
       */
      removeControlPoint: (edgeId: string, pointId: string) => {
        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          const edgeIndex = sheet.edges.findIndex((e) => e.id === edgeId);
          if (edgeIndex === -1) return;

          const edge = sheet.edges[edgeIndex];
          const currentData = (edge.data || {}) as { controlPoints?: EdgeControlPoint[] };
          const currentControlPoints = currentData.controlPoints || [];

          const updatedControlPoints = currentControlPoints.filter(cp => cp.id !== pointId);

          sheet.edges[edgeIndex] = {
            ...edge,
            data: {
              ...currentData,
              controlPoints: updatedControlPoints.length > 0 ? updatedControlPoints : undefined,
            },
          };
          sheet.updatedAt = new Date();
          state.isDirty = true;
          syncNodesAndEdgesFromActiveSheet(state);
        });
      },

      /**
       * Clear all control points from an edge
       */
      clearControlPoints: (edgeId: string) => {
        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          const edgeIndex = sheet.edges.findIndex((e) => e.id === edgeId);
          if (edgeIndex === -1) return;

          const edge = sheet.edges[edgeIndex];
          const currentData = (edge.data || {}) as { controlPoints?: EdgeControlPoint[] };

          sheet.edges[edgeIndex] = {
            ...edge,
            data: {
              ...currentData,
              controlPoints: undefined,
            },
          };
          sheet.updatedAt = new Date();
          state.isDirty = true;
          syncNodesAndEdgesFromActiveSheet(state);
        });
      },

      /**
       * Add a control point to a boundary edge (inside sub-process)
       * Handles both manual ports and edge-based (auto-generated) ports
       */
      addBoundaryEdgeControlPoint: (subprocessId: string, portId: string, direction: 'input' | 'output', connectionIndex: number, position: { x: number; y: number }) => {
        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          // Check if this is an edge-based port (portId is actually an edge ID)
          const edge = sheet.edges.find(e => e.id === portId);
          const isEdgeBased = !!edge;

          if (isEdgeBased) {
            // Handle edge-based port - update edge.originalTargets or edge.originalSources
            const connections = direction === 'input' ? edge.originalTargets : edge.originalSources;
            if (!connections || connectionIndex >= connections.length) return;

            const connection = connections[connectionIndex];
            const currentControlPoints = connection.controlPoints || [];

            // Get positions for sorted insertion
            const boundaryPortPosition = (edge.data as { boundaryPortPosition?: { x: number; y: number }; boundaryPortOutPosition?: { x: number; y: number } })?.[
              direction === 'input' ? 'boundaryPortPosition' : 'boundaryPortOutPosition'
            ] || { x: 0, y: 0 };
            const internalNode = sheet.nodes.find(n => n.id === connection.nodeId);
            if (!internalNode) return;

            const source = direction === 'input' ? boundaryPortPosition : internalNode.position;
            const target = direction === 'input' ? internalNode.position : boundaryPortPosition;

            // Insert control point sorted by position along the path
            const newControlPoints = insertControlPointSorted(
              currentControlPoints,
              position,
              source,
              target
            );

            // Update the connection
            connections[connectionIndex] = {
              ...connection,
              controlPoints: newControlPoints,
            };

            sheet.updatedAt = new Date();
            state.isDirty = true;
            syncNodesAndEdgesFromActiveSheet(state);
          } else {
            // Handle manual port - update port.internalConnections
            const subprocessNodeIndex = sheet.nodes.findIndex(n => n.id === subprocessId);
            if (subprocessNodeIndex === -1) return;

            const subprocessNode = sheet.nodes[subprocessNodeIndex];
            if (subprocessNode.type !== 'subprocess') return;

            const nodeData = subprocessNode.data as ProcessNodeData;
            const ports = direction === 'input' ? nodeData.inputPorts : nodeData.outputPorts;
            if (!ports) return;

            // Find the port by ID
            const portIndex = ports.findIndex(p => p.id === portId);
            if (portIndex === -1) return;

            const port = ports[portIndex];
            if (!port.internalConnections || port.internalConnections.length === 0) return;

            // Ensure connection index is valid
            if (connectionIndex >= port.internalConnections.length) return;

            const connection = port.internalConnections[connectionIndex];
            const currentControlPoints = connection.controlPoints || [];

            // Get source and target positions for sorted insertion
            const boundaryPortPosition = port.position || { x: 0, y: 0 };
            const internalNode = sheet.nodes.find(n => n.id === connection.nodeId);
            if (!internalNode) return;

            const source = direction === 'input' ? boundaryPortPosition : internalNode.position;
            const target = direction === 'input' ? internalNode.position : boundaryPortPosition;

            // Insert control point sorted by position along the path
            const newControlPoints = insertControlPointSorted(
              currentControlPoints,
              position,
              source,
              target
            );

            // Update the connection with new control points
            port.internalConnections[connectionIndex] = {
              ...connection,
              controlPoints: newControlPoints,
            };

            sheet.nodes[subprocessNodeIndex] = {
              ...subprocessNode,
              data: {
                ...nodeData,
                [direction === 'input' ? 'inputPorts' : 'outputPorts']: ports,
              } as ProcessNodeData,
            };
            sheet.updatedAt = new Date();
            state.isDirty = true;
            syncNodesAndEdgesFromActiveSheet(state);
          }
        });
      },

      /**
       * Update a control point position on a boundary edge (inside sub-process)
       * Handles both manual ports and edge-based (auto-generated) ports
       */
      updateBoundaryEdgeControlPoint: (subprocessId: string, portId: string, direction: 'input' | 'output', connectionIndex: number, pointId: string, position: { x: number; y: number }) => {
        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          // Check if this is an edge-based port (portId is actually an edge ID)
          const edge = sheet.edges.find(e => e.id === portId);
          const isEdgeBased = !!edge;

          if (isEdgeBased) {
            // Handle edge-based port - update edge.originalTargets or edge.originalSources
            const connections = direction === 'input' ? edge.originalTargets : edge.originalSources;
            if (!connections || connectionIndex >= connections.length) return;

            const connection = connections[connectionIndex];
            if (!connection.controlPoints) return;

            // Update the specific control point
            const updatedControlPoints = connection.controlPoints.map(cp =>
              cp.id === pointId ? { ...cp, x: position.x, y: position.y } : cp
            );

            connections[connectionIndex] = {
              ...connection,
              controlPoints: updatedControlPoints,
            };

            sheet.updatedAt = new Date();
            state.isDirty = true;
            syncNodesAndEdgesFromActiveSheet(state);
          } else {
            // Handle manual port - update port.internalConnections
            const subprocessNodeIndex = sheet.nodes.findIndex(n => n.id === subprocessId);
            if (subprocessNodeIndex === -1) return;

            const subprocessNode = sheet.nodes[subprocessNodeIndex];
            if (subprocessNode.type !== 'subprocess') return;

            const nodeData = subprocessNode.data as ProcessNodeData;
            const ports = direction === 'input' ? nodeData.inputPorts : nodeData.outputPorts;
            if (!ports) return;

            // Find the port by ID
            const portIndex = ports.findIndex(p => p.id === portId);
            if (portIndex === -1) return;

            const port = ports[portIndex];
            if (!port.internalConnections || port.internalConnections.length === 0) return;

            // Ensure connection index is valid
            if (connectionIndex >= port.internalConnections.length) return;

            const connection = port.internalConnections[connectionIndex];
            if (!connection.controlPoints) return;

            // Update the specific control point
            const updatedControlPoints = connection.controlPoints.map(cp =>
              cp.id === pointId ? { ...cp, x: position.x, y: position.y } : cp
            );

            // Update the connection with updated control points
            port.internalConnections[connectionIndex] = {
              ...connection,
              controlPoints: updatedControlPoints,
            };

            sheet.nodes[subprocessNodeIndex] = {
              ...subprocessNode,
              data: {
                ...nodeData,
                [direction === 'input' ? 'inputPorts' : 'outputPorts']: ports,
              } as ProcessNodeData,
            };
            sheet.updatedAt = new Date();
            state.isDirty = true;
            syncNodesAndEdgesFromActiveSheet(state);
          }
        });
      },

      /**
       * Remove a control point from a boundary edge (inside sub-process)
       * Handles both manual ports and edge-based (auto-generated) ports
       */
      removeBoundaryEdgeControlPoint: (subprocessId: string, portId: string, direction: 'input' | 'output', connectionIndex: number, pointId: string) => {
        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          // Check if this is an edge-based port (portId is actually an edge ID)
          const edge = sheet.edges.find(e => e.id === portId);
          const isEdgeBased = !!edge;

          if (isEdgeBased) {
            // Handle edge-based port - update edge.originalTargets or edge.originalSources
            const connections = direction === 'input' ? edge.originalTargets : edge.originalSources;
            if (!connections || connectionIndex >= connections.length) return;

            const connection = connections[connectionIndex];
            if (!connection.controlPoints) return;

            // Remove the specific control point
            const updatedControlPoints = connection.controlPoints.filter(cp => cp.id !== pointId);

            connections[connectionIndex] = {
              ...connection,
              controlPoints: updatedControlPoints.length > 0 ? updatedControlPoints : undefined,
            };

            sheet.updatedAt = new Date();
            state.isDirty = true;
            syncNodesAndEdgesFromActiveSheet(state);
          } else {
            // Handle manual port - update port.internalConnections
            const subprocessNodeIndex = sheet.nodes.findIndex(n => n.id === subprocessId);
            if (subprocessNodeIndex === -1) return;

            const subprocessNode = sheet.nodes[subprocessNodeIndex];
            if (subprocessNode.type !== 'subprocess') return;

            const nodeData = subprocessNode.data as ProcessNodeData;
            const ports = direction === 'input' ? nodeData.inputPorts : nodeData.outputPorts;
            if (!ports) return;

            // Find the port by ID
            const portIndex = ports.findIndex(p => p.id === portId);
            if (portIndex === -1) return;

            const port = ports[portIndex];
            if (!port.internalConnections || port.internalConnections.length === 0) return;

            // Ensure connection index is valid
            if (connectionIndex >= port.internalConnections.length) return;

            const connection = port.internalConnections[connectionIndex];
            if (!connection.controlPoints) return;

            // Remove the specific control point
            const updatedControlPoints = connection.controlPoints.filter(cp => cp.id !== pointId);

            // Update the connection with updated control points
            port.internalConnections[connectionIndex] = {
              ...connection,
              controlPoints: updatedControlPoints.length > 0 ? updatedControlPoints : undefined,
            };

            sheet.nodes[subprocessNodeIndex] = {
              ...subprocessNode,
              data: {
                ...nodeData,
                [direction === 'input' ? 'inputPorts' : 'outputPorts']: ports,
              } as ProcessNodeData,
            };
            sheet.updatedAt = new Date();
            state.isDirty = true;
            syncNodesAndEdgesFromActiveSheet(state);
          }
        });
      },

      /**
       * Repair parentId relationships for all nodes
       * Deletes orphan nodes (nodes whose parentId points to non-existent subprocess)
       * Also deletes all nested children of those orphan nodes
       * Note: childNodeIds is now computed from parentId - no longer stored/updated
       */
      repairChildNodeIds: () => {
        set((state) => {
          let deletedOrphanCount = 0;

          state.sheets.forEach(sheet => {
            // Find all subprocesses and their IDs
            const subprocessIds = new Set(
              sheet.nodes.filter(n => n.type === 'subprocess').map(n => n.id)
            );

            // Find all nodes whose parentId points to non-existent subprocess
            const orphanNodeIds = new Set<string>();

            sheet.nodes.forEach(node => {
              const nodeData = node.data as ProcessNodeData;
              const parentId = nodeData.parentId;

              // If node has a parentId but parent doesn't exist, mark as orphan
              if (parentId && !subprocessIds.has(parentId)) {
                orphanNodeIds.add(node.id);
              }
            });

            // For each orphan node, also collect all its nested descendants to delete
            const nodesToDelete = new Set<string>(orphanNodeIds);
            orphanNodeIds.forEach(orphanId => {
              const descendants = getDescendantIds(orphanId, sheet.nodes);
              descendants.forEach(id => nodesToDelete.add(id));
            });

            // Delete all orphan nodes and their descendants
            if (nodesToDelete.size > 0) {
              const nodeCountBefore = sheet.nodes.length;
              sheet.nodes = sheet.nodes.filter(node => !nodesToDelete.has(node.id));
              deletedOrphanCount += nodeCountBefore - sheet.nodes.length;

              // Also delete edges connected to deleted nodes
              sheet.edges = sheet.edges.filter(edge =>
                !nodesToDelete.has(edge.source) && !nodesToDelete.has(edge.target)
              );
            }
          });

          if (deletedOrphanCount > 0) {
            state.isDirty = true;
            state.nodeVersion += 1; // Force re-render
            // Sync nodes from active sheet so UI updates immediately
            syncNodesAndEdgesFromActiveSheet(state);
          }
        });
      },

      reset: () => {
        set(initialState);
      },
    })),
    {
      name: 'flowchart-storage',
      partialize: (state) => ({
        selectedNodeId: state.selectedNodeId,
        flowchartId: state.flowchartId,
        showGrid: state.showGrid,
        showMinimap: state.showMinimap,
        defaultEdgeType: state.defaultEdgeType,
      }),
      onRehydrateStorage: () => (state) => {
        // After localStorage hydration, load the flowchart from IndexedDB
        // This ensures the name and data come from the actual saved flowchart
        if (state?.flowchartId) {
          state.loadFlowchart(state.flowchartId);
        }
      },
    }
  )
);

// =============================================================================
// Selector Hooks
// =============================================================================

export const useNodes = () => useFlowchartStore((state) => {
  const sheet = state.sheets.find(s => s.id === state.activeSheetId);
  return sheet?.nodes || [];
});
export const useEdges = () => useFlowchartStore((state) => {
  const sheet = state.sheets.find(s => s.id === state.activeSheetId);
  return sheet?.edges || [];
});
export const useSheets = () => useFlowchartStore((state) => state.sheets);
export const useActiveSheetId = () => useFlowchartStore((state) => state.activeSheetId);
export const useActiveSubprocessId = () => useFlowchartStore((state) => state.activeSubprocessId);
export const useSubprocessNavigationStack = () => useFlowchartStore((state) => state.subprocessNavigationStack);
export const useSelectedNodeId = () => useFlowchartStore((state) => state.selectedNodeId);
export const useFlowchartId = () => useFlowchartStore((state) => state.flowchartId);
export const useFlowchartName = () => useFlowchartStore((state) => state.flowchartName);
export const useIsDirty = () => useFlowchartStore((state) => state.isDirty);
export const useShowGrid = () => useFlowchartStore((state) => state.showGrid);
export const useShowMinimap = () => useFlowchartStore((state) => state.showMinimap);

export const useSelectedNode = () => {
  const state = useFlowchartStore();
  const sheet = state.sheets.find(s => s.id === state.activeSheetId);
  const selectedNodeId = state.selectedNodeId;

  if (!selectedNodeId || !sheet) return null;
  return sheet.nodes.find((n) => n.id === selectedNodeId) || null;
};

// Filter selector hooks
export const useFilterTags = () => useFlowchartStore((state) => state.filterTags);
export const useFilterRoles = () => useFlowchartStore((state) => state.filterRoles);
export const useFilterDocuments = () => useFlowchartStore((state) => state.filterDocuments);
export const useFilterData = () => useFlowchartStore((state) => state.filterData);
export const useFilterSearchText = () => useFlowchartStore((state) => state.filterSearchText);
export const useFilterNodeTypes = () => useFlowchartStore((state) => state.filterNodeTypes);
export const useFilterFrequencies = () => useFlowchartStore((state) => state.filterFrequencies);
export const useFilterUnitTypes = () => useFlowchartStore((state) => state.filterUnitTypes);
export const useFilterLocked = () => useFlowchartStore((state) => state.filterLocked);
export const useFilterRequiresFTE = () => useFlowchartStore((state) => state.filterRequiresFTE);
export const useFilterHasPainPoints = () => useFlowchartStore((state) => state.filterHasPainPoints);
export const useFilterHasImprovement = () => useFlowchartStore((state) => state.filterHasImprovement);
export const useFilterSystems = () => useFlowchartStore((state) => state.filterSystems);
export const useFilterHasRisk = () => useFlowchartStore((state) => state.filterHasRisk);
export const useFilterSheets = () => useFlowchartStore((state) => state.filterSheets);
export const useIsFilterPanelOpen = () => useFlowchartStore((state) => state.isFilterPanelOpen);
export const useFilterMode = () => useFlowchartStore((state) => state.filterMode);
export const useCursorMode = () => useFlowchartStore((state) => state.cursorMode);

/**
 * Get highlighted node IDs from ListView selection
 */
export const useHighlightedNodeIds = () => useFlowchartStore((state) => state.highlightedNodeIds);

/**
 * Check if there are any highlighted nodes
 */
export const useHasHighlightedNodes = () => useFlowchartStore((state) => state.highlightedNodeIds.length > 0);

/**
 * Check if any filters are active
 */
export const useHasActiveFilters = () => {
  const filterMode = useFlowchartStore((state) => state.filterMode);
  const filterTags = useFlowchartStore((state) => state.filterTags);
  const filterRoles = useFlowchartStore((state) => state.filterRoles);
  const filterDocuments = useFlowchartStore((state) => state.filterDocuments);
  const filterData = useFlowchartStore((state) => state.filterData);
  const filterSearchText = useFlowchartStore((state) => state.filterSearchText);
  const filterNodeTypes = useFlowchartStore((state) => state.filterNodeTypes);
  const filterFrequencies = useFlowchartStore((state) => state.filterFrequencies);
  const filterUnitTypes = useFlowchartStore((state) => state.filterUnitTypes);
  const filterLocked = useFlowchartStore((state) => state.filterLocked);
  const filterRequiresFTE = useFlowchartStore((state) => state.filterRequiresFTE);
  const filterHasPainPoints = useFlowchartStore((state) => state.filterHasPainPoints);
  const filterHasImprovement = useFlowchartStore((state) => state.filterHasImprovement);
  const filterSystems = useFlowchartStore((state) => state.filterSystems);
  const filterHasRisk = useFlowchartStore((state) => state.filterHasRisk);
  const filterSheets = useFlowchartStore((state) => state.filterSheets);

  // Simple filter check
  const hasSimpleFilters =
    filterTags.length > 0 ||
    filterRoles.length > 0 ||
    filterDocuments.length > 0 ||
    filterData.length > 0 ||
    filterSearchText.length > 0 ||
    filterNodeTypes.length > 0 ||
    filterFrequencies.length > 0 ||
    filterUnitTypes.length > 0 ||
    filterLocked !== null ||
    filterRequiresFTE !== null ||
    filterHasPainPoints !== null ||
    filterHasImprovement !== null ||
    filterSystems.length > 0 ||
    filterHasRisk !== null ||
    filterSheets.length > 0;

  // For advanced mode, we need to check the flowchartFilterConfig
  // This will be handled separately in the FlowToolbar component
  // since we can't use the filterStore here (would cause circular dependency)
  if (filterMode === 'advanced') {
    // Return false here - the actual check will be done in the component
    // by combining this with the advanced filter check
    return false;
  }

  return hasSimpleFilters;
};

// Expose store to window for debugging (only in development)
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  (window as unknown as Record<string, unknown>).flowchartStore = useFlowchartStore;
}

