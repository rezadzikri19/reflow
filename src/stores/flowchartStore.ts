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
  EdgeType,
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
  /** Currently active sheet ID (null = main flowchart view, ID = viewing that subprocess) */
  activeSheetId: string | null;
  /** Default edge type for new connections */
  defaultEdgeType: EdgeType;
}

interface FlowchartActions {
  addNode: (type: ProcessNodeType, position: { x: number; y: number }) => void;
  updateNode: (nodeId: string, data: Partial<ProcessNodeData>) => void;
  deleteNode: (nodeId: string) => void;
  deleteNodes: (nodeIds: string[]) => void;
  setSelectedNode: (nodeId: string | null) => void;
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
  // Sheet navigation actions
  openSubprocessSheet: (subprocessId: string) => void;
  closeActiveSheet: () => void;
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
  activeSheetId: null,
  defaultEdgeType: 'smoothstep',
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
              // Set parentId if we're inside a subprocess sheet
              ...(state.activeSheetId ? { parentId: state.activeSheetId } : {}),
            } as ProcessNodeData,
          };

          state.nodes.push(newNode);

          // If inside a subprocess sheet, also update the parent's childNodeIds
          if (state.activeSheetId) {
            const parentIndex = state.nodes.findIndex((n) => n.id === state.activeSheetId);
            if (parentIndex !== -1) {
              const parentNode = state.nodes[parentIndex];
              state.nodes[parentIndex] = {
                ...parentNode,
                data: {
                  ...parentNode.data,
                  childNodeIds: [...(parentNode.data.childNodeIds || []), id],
                },
              };
            }
          }

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
          // Find the node being deleted to check if it has a parent
          const nodeToDelete = state.nodes.find((n) => n.id === nodeId);
          const parentId = nodeToDelete?.data?.parentId;

          // Remove the node
          state.nodes = state.nodes.filter((n) => n.id !== nodeId);

          // If node was inside a subprocess, remove from parent's childNodeIds
          if (parentId) {
            const parentIndex = state.nodes.findIndex((n) => n.id === parentId);
            if (parentIndex !== -1) {
              const parentNode = state.nodes[parentIndex];
              state.nodes[parentIndex] = {
                ...parentNode,
                data: {
                  ...parentNode.data,
                  childNodeIds: (parentNode.data.childNodeIds || []).filter((id) => id !== nodeId),
                },
              };
            }
          }

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

      deleteNodes: (nodeIds: string[]) => {
        if (nodeIds.length === 0) return;

        set((state) => {
          const idsSet = new Set(nodeIds);

          // Find all nodes being deleted and group by parent
          const nodesByParent = new Map<string, string[]>();
          state.nodes.forEach((n) => {
            if (idsSet.has(n.id) && n.data?.parentId) {
              const parentList = nodesByParent.get(n.data.parentId) || [];
              parentList.push(n.id);
              nodesByParent.set(n.data.parentId, parentList);
            }
          });

          // Remove the nodes
          state.nodes = state.nodes.filter((n) => !idsSet.has(n.id));

          // Update each parent's childNodeIds
          nodesByParent.forEach((removedIds, parentId) => {
            const parentIndex = state.nodes.findIndex((n) => n.id === parentId);
            if (parentIndex !== -1) {
              const parentNode = state.nodes[parentIndex];
              const removedSet = new Set(removedIds);
              state.nodes[parentIndex] = {
                ...parentNode,
                data: {
                  ...parentNode.data,
                  childNodeIds: (parentNode.data.childNodeIds || []).filter(
                    (id) => !removedSet.has(id)
                  ),
                },
              };
            }
          });

          // Remove all edges connected to any of the deleted nodes
          state.edges = state.edges.filter(
            (e) => !idsSet.has(e.source) && !idsSet.has(e.target)
          );

          // Clear selection if any deleted node was selected
          if (state.selectedNodeId && idsSet.has(state.selectedNodeId)) {
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

      addEdge: (source: string, target: string, sourceHandle?: string, targetHandle?: string) => {
        const id = `edge-${source}-${sourceHandle || 'default'}-${target}`;

        set((state) => {
          // Check if edge already exists
          const edgeExists = state.edges.some(
            (e) => e.source === source && e.target === target && e.sourceHandle === sourceHandle
          );

          if (!edgeExists) {
            const newEdge: FlowchartEdge = {
              id,
              source,
              target,
              sourceHandle,
              targetHandle,
              type: state.defaultEdgeType,
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

      deleteEdges: (edgeIds: string[]) => {
        if (edgeIds.length === 0) return;

        set((state) => {
          const idsSet = new Set(edgeIds);
          state.edges = state.edges.filter((e) => !idsSet.has(e.id));
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

        // Validation: Need at least 2 nodes
        if (nodeIds.length < 2) {
          console.warn('Cannot group: Need at least 2 nodes');
          return null;
        }

        // Get the nodes to group
        const nodesToGroup = state.nodes.filter(n => nodeIds.includes(n.id));

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

        // Validation: Cannot group nodes that are already in a subprocess (no nesting)
        const alreadyGrouped = nodesToGroup.filter(n => n.data.parentId);
        if (alreadyGrouped.length > 0) {
          console.warn('Cannot group: Some nodes are already in a subprocess');
          return null;
        }

        // Validation: Cannot group subprocess nodes themselves
        const hasSubprocess = nodesToGroup.some(n => n.type === 'subprocess');
        if (hasSubprocess) {
          console.warn('Cannot group: Cannot nest subprocesses');
          return null;
        }

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
        const subprocessWidth = (maxX - minX) + padding * 2;
        const subprocessHeight = (maxY - minY) + padding * 2;

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
            childNodeIds: nodeIds,
            isExpanded: true,
            ...DEFAULT_PROCESS_NODE_DATA,
          } as ProcessNodeData,
        };

        // Update child nodes with parentId and convert to relative positions
        const updatedNodes = state.nodes.map(node => {
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
              } as ProcessNodeData,
            };
          }
          return node;
        });

        // Transform edges
        const updatedEdges = state.edges.map(edge => {
          const sourceIsChild = nodeIds.includes(edge.source);
          const targetIsChild = nodeIds.includes(edge.target);

          // Internal edge (between children) - keep unchanged but mark with subprocessId
          if (sourceIsChild && targetIsChild) {
            return {
              ...edge,
              subprocessId: subprocessId,
            };
          }

          // Incoming edge (external -> child) - redirect target to subprocess
          if (!sourceIsChild && targetIsChild) {
            return {
              ...edge,
              originalTarget: edge.target,
              originalTargetHandle: edge.targetHandle,
              target: subprocessId,
              targetHandle: null,
            };
          }

          // Outgoing edge (child -> external) - redirect source to subprocess
          if (sourceIsChild && !targetIsChild) {
            return {
              ...edge,
              originalSource: edge.source,
              originalSourceHandle: edge.sourceHandle,
              source: subprocessId,
              sourceHandle: null,
            };
          }

          // External edge - keep unchanged
          return edge;
        });

        set((state) => {
          state.nodes = [...updatedNodes, subprocessNode];
          state.edges = updatedEdges;
          state.isDirty = true;
        });

        return subprocessId;
      },

      /**
       * Ungroup a subprocess, restoring children to the canvas
       * @param subprocessId - ID of the subprocess to ungroup
       */
      ungroupSubprocess: (subprocessId: string) => {
        const state = get();

        const subprocessNode = state.nodes.find(n => n.id === subprocessId);
        if (!subprocessNode || subprocessNode.type !== 'subprocess') {
          console.warn('Cannot ungroup: Subprocess not found');
          return;
        }

        const childIds = subprocessNode.data.childNodeIds || [];

        // Update child nodes: remove parentId and convert back to absolute positions
        const updatedNodes = state.nodes
          .filter(n => n.id !== subprocessId) // Remove subprocess node
          .map(node => {
            if (childIds.includes(node.id)) {
              return {
                ...node,
                position: {
                  x: node.position.x + subprocessNode.position.x,
                  y: node.position.y + subprocessNode.position.y,
                },
                data: {
                  ...node.data,
                  parentId: undefined,
                } as ProcessNodeData,
              };
            }
            return node;
          });

        // Restore edges
        const updatedEdges = state.edges
          .map(edge => {
            // Internal edges (between children) - keep them, just remove subprocessId marker
            if (edge.subprocessId === subprocessId) {
              const { subprocessId: _, ...restEdge } = edge;
              return restEdge as FlowchartEdge;
            }

            // Restore incoming edges (external -> child, now redirected to subprocess)
            if (edge.target === subprocessId && edge.originalTarget) {
              const { originalTarget, originalTargetHandle, ...restEdge } = edge;
              return {
                ...restEdge,
                target: originalTarget,
                targetHandle: originalTargetHandle,
              } as FlowchartEdge;
            }

            // Restore outgoing edges (child -> external, now redirected from subprocess)
            if (edge.source === subprocessId && edge.originalSource) {
              const { originalSource, originalSourceHandle, ...restEdge } = edge;
              return {
                ...restEdge,
                source: originalSource,
                sourceHandle: originalSourceHandle,
              } as FlowchartEdge;
            }

            return edge;
          })
          .filter(edge => {
            // Remove edges that were connected to the subprocess but have no original target/source
            // (these shouldn't exist, but just in case)
            if (edge.source === subprocessId || edge.target === subprocessId) {
              return false;
            }
            return true;
          });

        set((state) => {
          state.nodes = updatedNodes;
          state.edges = updatedEdges;
          // Close sheet if viewing this subprocess
          if (state.activeSheetId === subprocessId) {
            state.activeSheetId = null;
          }
          state.isDirty = true;
        });
      },

      /**
       * Open a subprocess in a sheet view
       * @param subprocessId - ID of the subprocess to open
       */
      openSubprocessSheet: (subprocessId: string) => {
        set((state) => {
          // Verify the subprocess exists
          const subprocessNode = state.nodes.find(n => n.id === subprocessId && n.type === 'subprocess');
          if (subprocessNode) {
            state.activeSheetId = subprocessId;
            state.selectedNodeId = null; // Clear selection when switching sheets
          }
        });
      },

      /**
       * Close the currently active sheet and return to main view
       */
      closeActiveSheet: () => {
        set((state) => {
          state.activeSheetId = null;
          state.selectedNodeId = null; // Clear selection when closing sheet
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
        activeSheetId: state.activeSheetId,
        defaultEdgeType: state.defaultEdgeType,
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
export const useActiveSheetId = () => useFlowchartStore((state) => state.activeSheetId);

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
