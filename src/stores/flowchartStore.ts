import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import type {
  FlowchartNode,
  FlowchartEdge,
  ProcessNodeData,
  ProcessNodeType,
  EdgeType,
  EdgeStyleOptions,
  ManualPort,
  InternalNodeConnection,
  FrequencyType,
  UnitType,
  Sheet,
  LegacyFlowchart,
} from '../types';
import {
  DEFAULT_PROCESS_NODE_DATA,
} from '../types';
import type {
  FlowchartRecord,
} from '../db/database';
import {
  saveFlowchart as dbSaveFlowchart,
  loadFlowchart as dbLoadFlowchart,
} from '../db/database';

// =============================================================================
// Migration Utilities
// =============================================================================

const CURRENT_SCHEMA_VERSION = 2;

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

// =============================================================================
// Node Filter Types
// =============================================================================

/**
 * Filter mode type for toggling between simple and advanced filter
 */
export type FilterMode = 'simple' | 'advanced';

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
  /** Whether the filter panel is visible */
  isFilterPanelOpen: boolean;
  /** Current filter mode: simple (chip-based) or advanced (rule-based) */
  filterMode: FilterMode;
}

// =============================================================================
// Store Types
// =============================================================================

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
  isFilterPanelOpen: boolean;
  filterMode: FilterMode;
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
  updateManualPort: (subprocessId: string, portId: string, updates: Partial<Pick<ManualPort, 'label' | 'position'>>) => void;
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
  clearAllFilters: () => void;
  toggleFilterPanel: () => void;
  setFilterPanelOpen: (isOpen: boolean) => void;
  setFilterMode: (mode: FilterMode) => void;
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
  isFilterPanelOpen: false,
  filterMode: 'simple',
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

          // If inside a subprocess sheet, also update the parent's childNodeIds
          if (state.activeSubprocessId) {
            const parentIndex = sheet.nodes.findIndex((n) => n.id === state.activeSubprocessId);
            if (parentIndex !== -1) {
              const parentNode = sheet.nodes[parentIndex];
              sheet.nodes[parentIndex] = {
                ...parentNode,
                data: {
                  ...parentNode.data,
                  childNodeIds: [...((parentNode.data.childNodeIds as string[] | undefined) || []), id],
                },
              } as FlowchartNode;
            }
          }

          sheet.updatedAt = new Date();
          state.isDirty = true;
          syncNodesAndEdgesFromActiveSheet(state);
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

          // If inside a subprocess sheet, also update the parent's childNodeIds
          if (state.activeSubprocessId) {
            const parentIndex = sheet.nodes.findIndex((n) => n.id === state.activeSubprocessId);
            if (parentIndex !== -1) {
              const parentNode = sheet.nodes[parentIndex];
              sheet.nodes[parentIndex] = {
                ...parentNode,
                data: {
                  ...parentNode.data,
                  childNodeIds: [...((parentNode.data.childNodeIds as string[] | undefined) || []), id],
                },
              } as FlowchartNode;
            }
          }

          sheet.updatedAt = new Date();
          state.isDirty = true;
          syncNodesAndEdgesFromActiveSheet(state);
        });

        return id;
      },

      updateNode: (nodeId: string, data: Partial<ProcessNodeData>) => {
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
                if (edge.source === nodeId && edge.targetHandle?.startsWith('manual-input-')) {
                  // Find the target subprocess node and update the manual input port label
                  const targetNodeIndex = sheet.nodes.findIndex((n) => n.id === edge.target);
                  if (targetNodeIndex !== -1) {
                    const targetNode = sheet.nodes[targetNodeIndex];
                    if (targetNode.type === 'subprocess') {
                      const targetData = targetNode.data as ProcessNodeData;
                      const manualInputPorts = targetData.manualInputPorts || [];
                      const portIndex = manualInputPorts.findIndex(p => p.id === edge.targetHandle);
                      if (portIndex !== -1) {
                        manualInputPorts[portIndex] = { ...manualInputPorts[portIndex], label: newLabel };
                        sheet.nodes[targetNodeIndex] = {
                          ...targetNode,
                          data: { ...targetData, manualInputPorts: [...manualInputPorts] },
                        } as FlowchartNode;
                      }
                    }
                  }
                }

                // Find all edges where this node is the target (connected from subprocess manual output ports)
                if (edge.target === nodeId && edge.sourceHandle?.startsWith('manual-output-')) {
                  // Find the source subprocess node and update the manual output port label
                  const sourceNodeIndex = sheet.nodes.findIndex((n) => n.id === edge.source);
                  if (sourceNodeIndex !== -1) {
                    const sourceNode = sheet.nodes[sourceNodeIndex];
                    if (sourceNode.type === 'subprocess') {
                      const sourceData = sourceNode.data as ProcessNodeData;
                      const manualOutputPorts = sourceData.manualOutputPorts || [];
                      const portIndex = manualOutputPorts.findIndex(p => p.id === edge.sourceHandle);
                      if (portIndex !== -1) {
                        manualOutputPorts[portIndex] = { ...manualOutputPorts[portIndex], label: newLabel };
                        sheet.nodes[sourceNodeIndex] = {
                          ...sourceNode,
                          data: { ...sourceData, manualOutputPorts: [...manualOutputPorts] },
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
                  const refData = node.data as { referencedNodeId?: string; role?: string };
                  if (refData.referencedNodeId === nodeId) {
                    sheet.nodes[index] = {
                      ...node,
                      data: { ...refData, role: newRole },
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

          // Find the node being deleted to check if it has a parent
          const nodeToDelete = sheet.nodes.find((n) => n.id === nodeId);
          const parentId = nodeToDelete?.data?.parentId;

          // Remove the node
          sheet.nodes = sheet.nodes.filter((n) => n.id !== nodeId);

          // If node was inside a subprocess, remove from parent's childNodeIds
          if (parentId) {
            const parentIndex = sheet.nodes.findIndex((n) => n.id === parentId);
            if (parentIndex !== -1) {
              const parentNode = sheet.nodes[parentIndex];
              sheet.nodes[parentIndex] = {
                ...parentNode,
                data: {
                  ...parentNode.data,
                  childNodeIds: ((parentNode.data.childNodeIds as string[] | undefined) || []).filter((id) => id !== nodeId),
                },
              } as FlowchartNode;
            }
          }

          // Remove all edges connected to this node
          sheet.edges = sheet.edges.filter(
            (e) => e.source !== nodeId && e.target !== nodeId
          );

          // Clear selection if the deleted node was selected
          if (state.selectedNodeId === nodeId) {
            state.selectedNodeId = null;
          }

          sheet.updatedAt = new Date();
          state.isDirty = true;
          syncNodesAndEdgesFromActiveSheet(state);
        });
      },

      deleteNodes: (nodeIds: string[]) => {
        if (nodeIds.length === 0) return;

        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          const idsSet = new Set(nodeIds);

          // Find all nodes being deleted and group by parent
          const nodesByParent = new Map<string, string[]>();
          sheet.nodes.forEach((n) => {
            if (idsSet.has(n.id) && n.data?.parentId) {
              const parentId = n.data.parentId as string;
              const parentList = nodesByParent.get(parentId) || [];
              parentList.push(n.id);
              nodesByParent.set(parentId, parentList);
            }
          });

          // Remove the nodes
          sheet.nodes = sheet.nodes.filter((n) => !idsSet.has(n.id));

          // Update each parent's childNodeIds
          nodesByParent.forEach((removedIds, parentId) => {
            const parentIndex = sheet.nodes.findIndex((n) => n.id === parentId);
            if (parentIndex !== -1) {
              const parentNode = sheet.nodes[parentIndex];
              const removedSet = new Set(removedIds);
              sheet.nodes[parentIndex] = {
                ...parentNode,
                data: {
                  ...parentNode.data,
                  childNodeIds: ((parentNode.data.childNodeIds as string[] | undefined) || []).filter(
                    (id) => !removedSet.has(id)
                  ),
                },
              } as FlowchartNode;
            }
          });

          // Remove all edges connected to any of the deleted nodes
          sheet.edges = sheet.edges.filter(
            (e) => !idsSet.has(e.source) && !idsSet.has(e.target)
          );

          // Clear selection if any deleted node was selected
          if (state.selectedNodeId && idsSet.has(state.selectedNodeId)) {
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
        });
      },

      setSelectedEdgeId: (edgeId: string | null) => {
        set((state) => {
          state.selectedEdgeId = edgeId;
        });
      },

      addEdge: (source: string, target: string, sourceHandle?: string, targetHandle?: string) => {
        // Normalize handle values (treat null and undefined as equivalent)
        const normalizedSourceHandle = sourceHandle || null;
        const normalizedTargetHandle = targetHandle || null;
        const id = `edge-${source}-${normalizedSourceHandle || 'default'}-${target}-${normalizedTargetHandle || 'default'}`;

        // Check if connecting to a manual port that might not have a handle rendered yet
        const isManualPortConnection =
          (normalizedTargetHandle && normalizedTargetHandle.startsWith('manual-input-')) ||
          (normalizedSourceHandle && normalizedSourceHandle.startsWith('manual-output-'));

        // For manual port connections, we need to ensure the handle exists before adding the edge
        // Increment nodeVersion first in a separate update to trigger re-render
        if (isManualPortConnection) {
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

                // Update manual port labels when connecting external nodes
                if (normalizedTargetHandle && normalizedTargetHandle.startsWith('manual-input-')) {
                  const targetNode = sheet.nodes.find(n => n.id === target);
                  if (targetNode && targetNode.type === 'subprocess') {
                    const sourceNode = sheet.nodes.find(n => n.id === source);
                    const sourceLabel = (sourceNode?.data as ProcessNodeData)?.label || 'Unknown';
                    const manualInputPorts = (targetNode.data as ProcessNodeData).manualInputPorts || [];
                    const portIndex = manualInputPorts.findIndex(p => p.id === normalizedTargetHandle);
                    if (portIndex !== -1) {
                      manualInputPorts[portIndex] = { ...manualInputPorts[portIndex], label: sourceLabel };
                      sheet.nodes = sheet.nodes.map(n =>
                        n.id === target
                          ? { ...n, data: { ...n.data, manualInputPorts: [...manualInputPorts] } } as FlowchartNode
                          : n
                      );
                    }
                  }
                }

                if (normalizedSourceHandle && normalizedSourceHandle.startsWith('manual-output-')) {
                  const sourceNode = sheet.nodes.find(n => n.id === source);
                  if (sourceNode && sourceNode.type === 'subprocess') {
                    const targetNode = sheet.nodes.find(n => n.id === target);
                    const targetLabel = (targetNode?.data as ProcessNodeData)?.label || 'Unknown';
                    const manualOutputPorts = (sourceNode.data as ProcessNodeData).manualOutputPorts || [];
                    const portIndex = manualOutputPorts.findIndex(p => p.id === normalizedSourceHandle);
                    if (portIndex !== -1) {
                      manualOutputPorts[portIndex] = { ...manualOutputPorts[portIndex], label: targetLabel };
                      sheet.nodes = sheet.nodes.map(n =>
                        n.id === source
                          ? { ...n, data: { ...n.data, manualOutputPorts: [...manualOutputPorts] } } as FlowchartNode
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
        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          // Find the edge before deleting to check if it's connected to manual ports
          const edge = sheet.edges.find((e) => e.id === edgeId);
          if (!edge) return;

          // Handle edge-based ports: convert to manual ports when edge is deleted
          // This preserves the port even when the external connection is removed
          // BUT only for edge-based ports, not for connections to existing manual ports

          // Check if this is an incoming edge to a subprocess (input port)
          // Skip if already connected to a manual port
          if (edge.target && edge.originalTarget && !edge.targetHandle?.startsWith('manual-input-')) {
            const targetNodeIndex = sheet.nodes.findIndex((n) => n.id === edge.target);
            if (targetNodeIndex !== -1) {
              const targetNode = sheet.nodes[targetNodeIndex];
              if (targetNode.type === 'subprocess') {
                const targetData = targetNode.data as ProcessNodeData;
                const manualInputPorts = targetData.manualInputPorts || [];

                // Get label from edge data, or generate based on existing port count
                const existingPortLabel = (edge.data as { portLabel?: string })?.portLabel;
                const portLabel = existingPortLabel || `Input ${manualInputPorts.length + 1}`;

                // Check if a manual port with this label already exists
                const existingPortWithLabel = manualInputPorts.find(p => p.label === portLabel);

                if (!existingPortWithLabel) {
                  // Create a new manual input port only if one with the same label doesn't exist
                  // Preserve internal connections from the edge's originalTargets
                  const newPort: ManualPort = {
                    id: `manual-input-${uuidv4()}`,
                    direction: 'input',
                    label: portLabel,
                    internalConnections: edge.originalTargets ? [...edge.originalTargets] : undefined,
                  };

                  sheet.nodes[targetNodeIndex] = {
                    ...targetNode,
                    data: {
                      ...targetData,
                      manualInputPorts: [...manualInputPorts, newPort],
                    },
                  } as FlowchartNode;
                }
              }
            }
          }

          // Check if this is an outgoing edge from a subprocess (output port)
          // Skip if already connected to a manual port
          if (edge.source && edge.originalSource && !edge.sourceHandle?.startsWith('manual-output-')) {
            const sourceNodeIndex = sheet.nodes.findIndex((n) => n.id === edge.source);
            if (sourceNodeIndex !== -1) {
              const sourceNode = sheet.nodes[sourceNodeIndex];
              if (sourceNode.type === 'subprocess') {
                const sourceData = sourceNode.data as ProcessNodeData;
                const manualOutputPorts = sourceData.manualOutputPorts || [];

                // Get label from edge data, or generate based on existing port count
                const existingPortLabel = (edge.data as { portLabel?: string })?.portLabel;
                const portLabel = existingPortLabel || `Output ${manualOutputPorts.length + 1}`;

                // Check if a manual port with this label already exists
                const existingPortWithLabel = manualOutputPorts.find(p => p.label === portLabel);

                if (!existingPortWithLabel) {
                  // Create a new manual output port only if one with the same label doesn't exist
                  // Preserve internal connections from the edge's originalSources
                  const newPort: ManualPort = {
                    id: `manual-output-${uuidv4()}`,
                    direction: 'output',
                    label: portLabel,
                    internalConnections: edge.originalSources ? [...edge.originalSources] : undefined,
                  };

                  sheet.nodes[sourceNodeIndex] = {
                    ...sourceNode,
                    data: {
                      ...sourceData,
                      manualOutputPorts: [...manualOutputPorts, newPort],
                    },
                  } as FlowchartNode;
                }
              }
            }
          }

          // Handle existing manual port label reset logic
          if (edge.targetHandle?.startsWith('manual-input-')) {
            const targetNodeIndex = sheet.nodes.findIndex((n) => n.id === edge.target);
            if (targetNodeIndex !== -1) {
              const targetNode = sheet.nodes[targetNodeIndex];
              if (targetNode.type === 'subprocess') {
                const targetData = targetNode.data as ProcessNodeData;
                const manualInputPorts = targetData.manualInputPorts || [];
                const portIndex = manualInputPorts.findIndex(p => p.id === edge.targetHandle);
                if (portIndex !== -1) {
                  // Reset to default label
                  const defaultLabel = `Input ${portIndex + 1}`;
                  manualInputPorts[portIndex] = { ...manualInputPorts[portIndex], label: defaultLabel };
                  sheet.nodes[targetNodeIndex] = {
                    ...targetNode,
                    data: { ...targetData, manualInputPorts: [...manualInputPorts] },
                  } as FlowchartNode;
                }
              }
            }
          }

          // Reset manual output port label if edge was connected from one
          if (edge.sourceHandle?.startsWith('manual-output-')) {
            const sourceNodeIndex = sheet.nodes.findIndex((n) => n.id === edge.source);
            if (sourceNodeIndex !== -1) {
              const sourceNode = sheet.nodes[sourceNodeIndex];
              if (sourceNode.type === 'subprocess') {
                const sourceData = sourceNode.data as ProcessNodeData;
                const manualOutputPorts = sourceData.manualOutputPorts || [];
                const portIndex = manualOutputPorts.findIndex(p => p.id === edge.sourceHandle);
                if (portIndex !== -1) {
                  // Reset to default label
                  const defaultLabel = `Output ${portIndex + 1}`;
                  manualOutputPorts[portIndex] = { ...manualOutputPorts[portIndex], label: defaultLabel };
                  sheet.nodes[sourceNodeIndex] = {
                    ...sourceNode,
                    data: { ...sourceData, manualOutputPorts: [...manualOutputPorts] },
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

        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          const idsSet = new Set(edgeIds);

          // Process each edge
          sheet.edges.forEach((edge) => {
            if (!idsSet.has(edge.id)) return;

            // Convert edge-based ports to manual ports when edge is deleted
            // This preserves the port even when the external connection is removed
            // BUT only for edge-based ports, not for connections to existing manual ports

            // Check if this is an incoming edge to a subprocess (input port)
            // Skip if already connected to a manual port
            if (edge.target && edge.originalTarget && !edge.targetHandle?.startsWith('manual-input-')) {
              const targetNodeIndex = sheet.nodes.findIndex((n) => n.id === edge.target);
              if (targetNodeIndex !== -1) {
                const targetNode = sheet.nodes[targetNodeIndex];
                if (targetNode.type === 'subprocess') {
                  const targetData = targetNode.data as ProcessNodeData;
                  const manualInputPorts = targetData.manualInputPorts || [];

                  // Get label from edge data, or generate based on existing port count
                  const existingPortLabel = (edge.data as { portLabel?: string })?.portLabel;
                  const portLabel = existingPortLabel || `Input ${manualInputPorts.length + 1}`;

                  // Check if a manual port with this label already exists
                  const existingPortWithLabel = manualInputPorts.find(p => p.label === portLabel);

                  if (!existingPortWithLabel) {
                    // Create a new manual input port only if one with the same label doesn't exist
                    // Preserve internal connections from the edge's originalTargets
                    const newPort: ManualPort = {
                      id: `manual-input-${uuidv4()}`,
                      direction: 'input',
                      label: portLabel,
                      internalConnections: edge.originalTargets ? [...edge.originalTargets] : undefined,
                    };

                    sheet.nodes[targetNodeIndex] = {
                      ...targetNode,
                      data: {
                        ...targetData,
                        manualInputPorts: [...manualInputPorts, newPort],
                      },
                    } as FlowchartNode;
                  }
                }
              }
            }

            // Check if this is an outgoing edge from a subprocess (output port)
            // Skip if already connected to a manual port
            if (edge.source && edge.originalSource && !edge.sourceHandle?.startsWith('manual-output-')) {
              const sourceNodeIndex = sheet.nodes.findIndex((n) => n.id === edge.source);
              if (sourceNodeIndex !== -1) {
                const sourceNode = sheet.nodes[sourceNodeIndex];
                if (sourceNode.type === 'subprocess') {
                  const sourceData = sourceNode.data as ProcessNodeData;
                  const manualOutputPorts = sourceData.manualOutputPorts || [];

                  // Get label from edge data, or generate based on existing port count
                  const existingPortLabel = (edge.data as { portLabel?: string })?.portLabel;
                  const portLabel = existingPortLabel || `Output ${manualOutputPorts.length + 1}`;

                  // Check if a manual port with this label already exists
                  const existingPortWithLabel = manualOutputPorts.find(p => p.label === portLabel);

                  if (!existingPortWithLabel) {
                    // Create a new manual output port only if one with the same label doesn't exist
                    // Preserve internal connections from the edge's originalSources
                    const newPort: ManualPort = {
                      id: `manual-output-${uuidv4()}`,
                      direction: 'output',
                      label: portLabel,
                      internalConnections: edge.originalSources ? [...edge.originalSources] : undefined,
                    };

                    sheet.nodes[sourceNodeIndex] = {
                      ...sourceNode,
                      data: {
                        ...sourceData,
                        manualOutputPorts: [...manualOutputPorts, newPort],
                      },
                    } as FlowchartNode;
                  }
                }
              }
            }

            // Reset manual input port label if edge was connected to one
            if (edge.targetHandle?.startsWith('manual-input-')) {
              const targetNodeIndex = sheet.nodes.findIndex((n) => n.id === edge.target);
              if (targetNodeIndex !== -1) {
                const targetNode = sheet.nodes[targetNodeIndex];
                if (targetNode.type === 'subprocess') {
                  const targetData = targetNode.data as ProcessNodeData;
                  const manualInputPorts = targetData.manualInputPorts || [];
                  const portIndex = manualInputPorts.findIndex(p => p.id === edge.targetHandle);
                  if (portIndex !== -1) {
                    const defaultLabel = `Input ${portIndex + 1}`;
                    manualInputPorts[portIndex] = { ...manualInputPorts[portIndex], label: defaultLabel };
                    sheet.nodes[targetNodeIndex] = {
                      ...targetNode,
                      data: { ...targetData, manualInputPorts: [...manualInputPorts] },
                    } as FlowchartNode;
                  }
                }
              }
            }

            // Reset manual output port label if edge was connected from one
            if (edge.sourceHandle?.startsWith('manual-output-')) {
              const sourceNodeIndex = sheet.nodes.findIndex((n) => n.id === edge.source);
              if (sourceNodeIndex !== -1) {
                const sourceNode = sheet.nodes[sourceNodeIndex];
                if (sourceNode.type === 'subprocess') {
                  const sourceData = sourceNode.data as ProcessNodeData;
                  const manualOutputPorts = sourceData.manualOutputPorts || [];
                  const portIndex = manualOutputPorts.findIndex(p => p.id === edge.sourceHandle);
                  if (portIndex !== -1) {
                    const defaultLabel = `Output ${portIndex + 1}`;
                    manualOutputPorts[portIndex] = { ...manualOutputPorts[portIndex], label: defaultLabel };
                    sheet.nodes[sourceNodeIndex] = {
                      ...sourceNode,
                      data: { ...sourceData, manualOutputPorts: [...manualOutputPorts] },
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

            set((state) => {
              state.flowchartId = record.id;
              state.flowchartName = record.name;
              state.sheets = migratedSheets;
              state.activeSheetId = migratedSheets[0].id;
              state.activeSubprocessId = null;
              state.subprocessNavigationStack = [];
              state.selectedNodeId = null;
              state.isDirty = true; // Mark dirty so user saves in new format
              syncNodesAndEdgesFromActiveSheet(state);
            });
          } else {
            // New format (v2+)
            const newRecord = record as unknown as { sheets: Sheet[]; activeSheetId: string };
            set((state) => {
              state.flowchartId = record.id;
              state.flowchartName = record.name;
              state.sheets = newRecord.sheets;
              state.activeSheetId = newRecord.activeSheetId || newRecord.sheets[0]?.id || DEFAULT_SHEET_ID;
              state.activeSubprocessId = null;
              state.subprocessNavigationStack = [];
              state.selectedNodeId = null;
              state.isDirty = false;
              syncNodesAndEdgesFromActiveSheet(state);
            });
          }
          return true;
        }

        return false;
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
            childNodeIds: nodeIds,
            isExpanded: true,
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

        // If creating a nested subprocess, update parent's childNodeIds
        if (commonParentId) {
          const parentIndex = updatedNodes.findIndex(n => n.id === commonParentId);
          if (parentIndex !== -1) {
            const parentData = updatedNodes[parentIndex].data as ProcessNodeData;
            updatedNodes[parentIndex] = {
              ...updatedNodes[parentIndex],
              data: {
                ...parentData,
                childNodeIds: [...(parentData.childNodeIds || []), subprocessId],
              },
            } as FlowchartNode;
          }
        }

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
          const portId = `input-${externalSourceId}`;

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
          const portId = `output-${externalTargetId}`;

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

        const childIds = new Set(subprocessNode.data.childNodeIds || []);
        const manualInputPorts = (subprocessNode.data.manualInputPorts || []) as ManualPort[];
        const manualOutputPorts = (subprocessNode.data.manualOutputPorts || []) as ManualPort[];

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
        manualInputPorts.forEach(port => {
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
        manualOutputPorts.forEach(port => {
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

          // If this is a nested subprocess, remove it from parent's childNodeIds
          if (subprocessParentId) {
            const parentIndex = sheet.nodes.findIndex(n => n.id === subprocessParentId);
            if (parentIndex !== -1) {
              const parentData = sheet.nodes[parentIndex].data as ProcessNodeData;
              sheet.nodes[parentIndex] = {
                ...sheet.nodes[parentIndex],
                data: {
                  ...parentData,
                  childNodeIds: (parentData.childNodeIds || []).filter(id => id !== subprocessId),
                },
              } as FlowchartNode;
            }
          }

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
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          const edge = sheet.edges.find((e) => e.id === originalEdgeId);
          if (!edge) return;

          if (direction === 'input' && edge.originalTargets && edge.originalTargets[connectionIndex]) {
            const connection = edge.originalTargets[connectionIndex];
            if (style !== undefined) {
              connection.style = style;
            }
            if (label !== undefined) {
              connection.label = label;
            }
            sheet.updatedAt = new Date();
            state.isDirty = true;
          } else if (direction === 'output' && edge.originalSources && edge.originalSources[connectionIndex]) {
            const connection = edge.originalSources[connectionIndex];
            if (style !== undefined) {
              connection.style = style;
            }
            if (label !== undefined) {
              connection.label = label;
            }
            sheet.updatedAt = new Date();
            state.isDirty = true;
          }
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
        const portId = `manual-${direction}-${uuidv4()}`;
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
            ? (nodeData.manualInputPorts || [])
            : (nodeData.manualOutputPorts || []);

          const portLabel = label || `${defaultLabel} ${existingPorts.length + 1}`;

          const newPort: ManualPort = {
            id: portId,
            direction,
            label: portLabel,
          };

          if (direction === 'input') {
            sheet.nodes[nodeIndex] = {
              ...node,
              data: {
                ...nodeData,
                manualInputPorts: [...existingPorts, newPort],
              },
            } as FlowchartNode;
          } else {
            sheet.nodes[nodeIndex] = {
              ...node,
              data: {
                ...nodeData,
                manualOutputPorts: [...existingPorts, newPort],
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
       * @param updates - Partial updates (label and/or position)
       */
      updateManualPort: (subprocessId: string, portId: string, updates: Partial<Pick<ManualPort, 'label' | 'position'>>) => {
        set((state) => {
          const sheet = state.sheets.find(s => s.id === state.activeSheetId);
          if (!sheet) return;

          const nodeIndex = sheet.nodes.findIndex((n) => n.id === subprocessId && n.type === 'subprocess');
          if (nodeIndex === -1) return;

          const node = sheet.nodes[nodeIndex];
          const nodeData = node.data as ProcessNodeData;

          // Check input ports
          const inputPorts = nodeData.manualInputPorts || [];
          const inputIndex = inputPorts.findIndex(p => p.id === portId);

          if (inputIndex !== -1) {
            inputPorts[inputIndex] = { ...inputPorts[inputIndex], ...updates };
            sheet.nodes[nodeIndex] = {
              ...node,
              data: { ...nodeData, manualInputPorts: [...inputPorts] },
            } as FlowchartNode;
            sheet.updatedAt = new Date();
            state.nodeVersion += 1;
            state.edgeVersion += 1; // Trigger edge recalculation for port position changes
            state.isDirty = true;
            syncNodesAndEdgesFromActiveSheet(state);
            return;
          }

          // Check output ports
          const outputPorts = nodeData.manualOutputPorts || [];
          const outputIndex = outputPorts.findIndex(p => p.id === portId);

          if (outputIndex !== -1) {
            outputPorts[outputIndex] = { ...outputPorts[outputIndex], ...updates };
            sheet.nodes[nodeIndex] = {
              ...node,
              data: { ...nodeData, manualOutputPorts: [...outputPorts] },
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
          const inputPorts = nodeData.manualInputPorts || [];
          const outputPorts = nodeData.manualOutputPorts || [];

          const isInput = inputPorts.some(p => p.id === portId);
          const isOutput = outputPorts.some(p => p.id === portId);

          if (isInput) {
            sheet.nodes[nodeIndex] = {
              ...node,
              data: {
                ...nodeData,
                manualInputPorts: inputPorts.filter(p => p.id !== portId),
              },
            } as FlowchartNode;
          } else if (isOutput) {
            sheet.nodes[nodeIndex] = {
              ...node,
              data: {
                ...nodeData,
                manualOutputPorts: outputPorts.filter(p => p.id !== portId),
              },
            } as FlowchartNode;
          } else {
            return; // Port not found
          }

          // Remove any edges connected to this manual port
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
          const inputPorts = nodeData.manualInputPorts || [];
          const outputPorts = nodeData.manualOutputPorts || [];

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
                data: { ...nodeData, manualInputPorts: [...inputPorts] },
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
                data: { ...nodeData, manualOutputPorts: [...outputPorts] },
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

          const inputPorts = nodeData.manualInputPorts || [];
          const outputPorts = nodeData.manualOutputPorts || [];

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
              data: { ...nodeData, manualInputPorts: [...inputPorts] },
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
              data: { ...nodeData, manualOutputPorts: [...outputPorts] },
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

      reset: () => {
        set(initialState);
      },
    })),
    {
      name: 'flowchart-storage',
      partialize: (state) => ({
        selectedNodeId: state.selectedNodeId,
        flowchartId: state.flowchartId,
        flowchartName: state.flowchartName,
        showGrid: state.showGrid,
        showMinimap: state.showMinimap,
        defaultEdgeType: state.defaultEdgeType,
      }),
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
export const useIsFilterPanelOpen = () => useFlowchartStore((state) => state.isFilterPanelOpen);
export const useFilterMode = () => useFlowchartStore((state) => state.filterMode);

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
    filterHasImprovement !== null;

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

