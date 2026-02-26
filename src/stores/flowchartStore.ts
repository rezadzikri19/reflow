import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import type { Node, Edge } from '@xyflow/react';
import type {
  FlowchartNode,
  FlowchartEdge,
  ProcessNodeData,
  ProcessNodeType,
} from '../types';
import {
  DEFAULT_PROCESS_NODE_DATA,
} from '../types';
import type {
  FlowchartRecord,
} from '../db/database';
import {
  db,
  saveFlowchart as dbSaveFlowchart,
  loadFlowchart as dbLoadFlowchart,
} from '../db/database';

// =============================================================================
// Store Types
// =============================================================================

interface FlowchartState {
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
  selectedNodeId: string | null;
  flowchartId: string | null;
  flowchartName: string;
  isDirty: boolean;
  showGrid: boolean;
  showMinimap: boolean;
}

interface FlowchartActions {
  addNode: (type: ProcessNodeType, position: { x: number; y: number }) => void;
  updateNode: (nodeId: string, data: Partial<ProcessNodeData>) => void;
  deleteNode: (nodeId: string) => void;
  setSelectedNode: (nodeId: string | null) => void;
  addEdge: (source: string, target: string) => void;
  updateEdge: (edgeId: string, data: Record<string, unknown>) => void;
  deleteEdge: (edgeId: string) => void;
  setNodes: (nodes: FlowchartNode[]) => void;
  setEdges: (edges: FlowchartEdge[]) => void;
  saveFlowchart: () => Promise<void>;
  loadFlowchart: (id: string) => Promise<boolean>;
  newFlowchart: (name?: string) => void;
  markDirty: () => void;
  reset: () => void;
  toggleGrid: () => void;
  toggleMinimap: () => void;
}

type FlowchartStore = FlowchartState & FlowchartActions;

// =============================================================================
// Initial State
// =============================================================================

const initialState: FlowchartState = {
  nodes: [],
  edges: [],
  selectedNodeId: null,
  flowchartId: null,
  flowchartName: 'Untitled Flowchart',
  isDirty: false,
  showGrid: true,
  showMinimap: true,
};

// =============================================================================
// Store Definition
// =============================================================================

export const useFlowchartStore = create<FlowchartStore>()(
  persist(
    immer((set, get) => ({
      ...initialState,

      addNode: (type: ProcessNodeType, position: { x: number; y: number }) => {
        const id = uuidv4();

        set((state) => {
          const newNode: FlowchartNode = {
            id,
            type,
            position,
            data: {
              id,
              label: `${type.charAt(0).toUpperCase() + type.slice(1)} ${state.nodes.length + 1}`,
              nodeType: type,
              ...DEFAULT_PROCESS_NODE_DATA,
            } as ProcessNodeData,
          };

          state.nodes.push(newNode);
          state.isDirty = true;
        });
      },

      updateNode: (nodeId: string, data: Partial<ProcessNodeData>) => {
        set((state) => {
          const nodeIndex = state.nodes.findIndex((n) => n.id === nodeId);
          if (nodeIndex !== -1) {
            state.nodes[nodeIndex].data = {
              ...state.nodes[nodeIndex].data,
              ...data,
            } as ProcessNodeData;
            state.isDirty = true;
          }
        });
      },

      deleteNode: (nodeId: string) => {
        set((state) => {
          // Remove the node
          state.nodes = state.nodes.filter((n) => n.id !== nodeId);

          // Remove all edges connected to this node
          state.edges = state.edges.filter(
            (e) => e.source !== nodeId && e.target !== nodeId
          );

          // Clear selection if the deleted node was selected
          if (state.selectedNodeId === nodeId) {
            state.selectedNodeId = null;
          }

          state.isDirty = true;
        });
      },

      setSelectedNode: (nodeId: string | null) => {
        set((state) => {
          state.selectedNodeId = nodeId;
        });
      },

      addEdge: (source: string, target: string) => {
        const id = `edge-${source}-${target}`;

        set((state) => {
          // Check if edge already exists
          const edgeExists = state.edges.some(
            (e) => e.source === source && e.target === target
          );

          if (!edgeExists) {
            const newEdge: FlowchartEdge = {
              id,
              source,
              target,
              type: 'default',
            };

            state.edges.push(newEdge);
            state.isDirty = true;
          }
        });
      },

      updateEdge: (edgeId: string, data: Record<string, unknown>) => {
        set((state) => {
          const edgeIndex = state.edges.findIndex((e) => e.id === edgeId);
          if (edgeIndex !== -1) {
            state.edges[edgeIndex] = {
              ...state.edges[edgeIndex],
              ...data,
            } as FlowchartEdge;
            state.isDirty = true;
          }
        });
      },

      deleteEdge: (edgeId: string) => {
        set((state) => {
          state.edges = state.edges.filter((e) => e.id !== edgeId);
          state.isDirty = true;
        });
      },

      setNodes: (nodes: FlowchartNode[]) => {
        set((state) => {
          state.nodes = nodes;
          state.isDirty = true;
        });
      },

      setEdges: (edges: FlowchartEdge[]) => {
        set((state) => {
          state.edges = edges;
          state.isDirty = true;
        });
      },

      saveFlowchart: async () => {
        const state = get();

        const flowchartRecord: FlowchartRecord = {
          id: state.flowchartId || uuidv4(),
          name: state.flowchartName,
          nodes: state.nodes,
          edges: state.edges,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        await dbSaveFlowchart(flowchartRecord);

        set((s) => {
          s.flowchartId = flowchartRecord.id;
          s.isDirty = false;
        });
      },

      loadFlowchart: async (id: string) => {
        const record = await dbLoadFlowchart(id);

        if (record) {
          set((state) => {
            state.flowchartId = record.id;
            state.flowchartName = record.name;
            state.nodes = record.nodes as FlowchartNode[];
            state.edges = record.edges as FlowchartEdge[];
            state.selectedNodeId = null;
            state.isDirty = false;
          });
          return true;
        }

        return false;
      },

      newFlowchart: (name?: string) => {
        set((state) => {
          state.nodes = [];
          state.edges = [];
          state.selectedNodeId = null;
          state.flowchartId = null;
          state.flowchartName = name || 'Untitled Flowchart';
          state.isDirty = false;
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
      }),
    }
  )
);

// =============================================================================
// Selector Hooks
// =============================================================================

export const useNodes = () => useFlowchartStore((state) => state.nodes);
export const useEdges = () => useFlowchartStore((state) => state.edges);
export const useSelectedNodeId = () => useFlowchartStore((state) => state.selectedNodeId);
export const useFlowchartId = () => useFlowchartStore((state) => state.flowchartId);
export const useFlowchartName = () => useFlowchartStore((state) => state.flowchartName);
export const useIsDirty = () => useFlowchartStore((state) => state.isDirty);
export const useShowGrid = () => useFlowchartStore((state) => state.showGrid);
export const useShowMinimap = () => useFlowchartStore((state) => state.showMinimap);

export const useSelectedNode = () => {
  const nodes = useFlowchartStore((state) => state.nodes);
  const selectedNodeId = useFlowchartStore((state) => state.selectedNodeId);

  if (!selectedNodeId) return null;
  return nodes.find((n) => n.id === selectedNodeId) || null;
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get all node IDs that are connected to a specific node.
 */
export function getConnectedNodeIds(nodeId: string, edges: FlowchartEdge[]): string[] {
  const connectedIds = new Set<string>();

  edges.forEach((edge) => {
    if (edge.source === nodeId) {
      connectedIds.add(edge.target);
    }
    if (edge.target === nodeId) {
      connectedIds.add(edge.source);
    }
  });

  return Array.from(connectedIds);
}

/**
 * Check if adding an edge would create a cycle.
 */
export function wouldCreateCycle(
  source: string,
  target: string,
  nodes: FlowchartNode[],
  edges: FlowchartEdge[]
): boolean {
  // Build adjacency list
  const adjacencyList: Record<string, string[]> = {};
  nodes.forEach((node) => {
    adjacencyList[node.id] = [];
  });

  edges.forEach((edge) => {
    if (adjacencyList[edge.source]) {
      adjacencyList[edge.source].push(edge.target);
    }
  });

  // Add the potential new edge
  if (!adjacencyList[source]) {
    adjacencyList[source] = [];
  }
  adjacencyList[source].push(target);

  // DFS to detect cycle
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjacencyList[nodeId] || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) return true;
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const nodeId of Object.keys(adjacencyList)) {
    if (!visited.has(nodeId)) {
      if (hasCycle(nodeId)) return true;
    }
  }

  return false;
}
