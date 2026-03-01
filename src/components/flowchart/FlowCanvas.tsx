import { useCallback, useRef, useEffect, useState, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useReactFlow,
  BackgroundVariant,
  MarkerType,
  SelectionMode,
  applyNodeChanges,
  applyEdgeChanges,
} from '@xyflow/react';
import type {
  Connection,
  NodeTypes,
  OnConnect,
  OnNodesChange,
  OnEdgesChange,
} from '@xyflow/react';

import { nodeTypes } from './nodes';
import { edgeTypes } from './edges';
import { useFlowchartStore } from '../../stores/flowchartStore';
import type { FlowchartNode, FlowchartEdge, ProcessNodeType, ProcessNodeData, ManualPort } from '../../types';
import type { BoundaryPortNodeData } from './nodes/BoundaryPortNode';
import ContextMenu from './ContextMenu';
import SheetBar, { type SheetInfo } from './SheetBar';
import { ArrowLeft, ArrowRight } from 'lucide-react';

// =============================================================================
// Local Types
// =============================================================================

interface ContextMenuPosition {
  x: number;
  y: number;
}

// =============================================================================
// Types
// =============================================================================

interface FlowCanvasProps {
  /** Whether the canvas is in read-only mode */
  readOnly?: boolean;
  /** Custom class name for the canvas container */
  className?: string;
  /** Callback when a node is clicked */
  onNodeClick?: (nodeId: string) => void;
  /** Callback when the canvas background is clicked */
  onCanvasClick?: () => void;
  /** Grid size for snap to grid functionality */
  gridSize?: number;
  /** Whether snap to grid is enabled */
  snapToGrid?: boolean;
  /** Whether to show the grid background */
  showGrid?: boolean;
  /** Whether to show the minimap */
  showMinimap?: boolean;
}

// =============================================================================
// Flow Canvas Inner Component (needs useReactFlow hook)
// =============================================================================

interface FlowCanvasInnerProps extends FlowCanvasProps {
  /** Node types to register with React Flow */
  customNodeTypes?: NodeTypes;
}

function FlowCanvasInner({
  readOnly = false,
  className = '',
  onNodeClick,
  onCanvasClick,
  gridSize = 20,
  snapToGrid = true,
  showGrid = true,
  showMinimap = true,
  customNodeTypes,
}: FlowCanvasInnerProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, getNodes, getEdges } = useReactFlow();

  // Store custom positions for boundary port nodes (input/output nodes in subprocess sheets)
  // This allows them to be freely moved and maintain their positions
  const boundaryPortPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Track selection state for virtual boundary edges (since they're regenerated each render)
  const virtualEdgeSelectionRef = useRef<Set<string>>(new Set());
  // Counter to force re-renders when virtual edge selection changes
  const [virtualEdgeVersion, setVirtualEdgeVersion] = useState(0);

  // Store selectors
  const nodes = useFlowchartStore((state) => state.nodes);
  const edges = useFlowchartStore((state) => state.edges);
  const nodeVersion = useFlowchartStore((state) => state.nodeVersion);
  const edgeVersion = useFlowchartStore((state) => state.edgeVersion);
  const selectedNodeId = useFlowchartStore((state) => state.selectedNodeId);
  const addNode = useFlowchartStore((state) => state.addNode);
  const addEdge = useFlowchartStore((state) => state.addEdge);
  const setNodes = useFlowchartStore((state) => state.setNodes);
  const setEdges = useFlowchartStore((state) => state.setEdges);
  const setSelectedNode = useFlowchartStore((state) => state.setSelectedNode);
  const deleteNode = useFlowchartStore((state) => state.deleteNode);
  const deleteNodes = useFlowchartStore((state) => state.deleteNodes);
  const deleteEdge = useFlowchartStore((state) => state.deleteEdge);
  const deleteEdges = useFlowchartStore((state) => state.deleteEdges);
  const markDirty = useFlowchartStore((state) => state.markDirty);
  const activeSheetId = useFlowchartStore((state) => state.activeSheetId);
  const openSubprocessSheet = useFlowchartStore((state) => state.openSubprocessSheet);
  const closeActiveSheet = useFlowchartStore((state) => state.closeActiveSheet);
  const groupNodesIntoSubprocess = useFlowchartStore((state) => state.groupNodesIntoSubprocess);
  const defaultEdgeType = useFlowchartStore((state) => state.defaultEdgeType);
  const addBoundaryPortEdge = useFlowchartStore((state) => state.addBoundaryPortEdge);
  const removeBoundaryPortConnection = useFlowchartStore((state) => state.removeBoundaryPortConnection);
  const setSelectedEdgeId = useFlowchartStore((state) => state.setSelectedEdgeId);
  const updateManualPort = useFlowchartStore((state) => state.updateManualPort);
  const addManualPortConnection = useFlowchartStore((state) => state.addManualPortConnection);
  const removeManualPortConnection = useFlowchartStore((state) => state.removeManualPortConnection);

  // Context menu state
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition>({ x: 0, y: 0 });

  // Clear boundary port positions and virtual edge selection when switching sheets
  useEffect(() => {
    boundaryPortPositionsRef.current.clear();
    virtualEdgeSelectionRef.current.clear();
  }, [activeSheetId]);

  // Use custom node types if provided, otherwise use defaults
  const registeredNodeTypes = customNodeTypes || nodeTypes;

  // =============================================================================
  // Event Handlers
  // =============================================================================

  /**
   * Handle node changes (position, selection, dimensions, etc.)
   */
  const onNodesChange: OnNodesChange<FlowchartNode> = useCallback(
    (changes) => {
      // Handle boundary port node position changes separately (they are virtual nodes)
      changes.forEach((change) => {
        if (change.type === 'position' && change.position) {
          const isBoundaryPort = change.id.startsWith('boundary-input-') ||
                                  change.id.startsWith('boundary-output-') ||
                                  change.id.startsWith('boundary-manual-input-') ||
                                  change.id.startsWith('boundary-manual-output-');
          if (isBoundaryPort) {
            // Store the position in our ref for boundary port nodes
            boundaryPortPositionsRef.current.set(change.id, change.position);
            markDirty();

            // If this is a manual port, also update its position in the store
            const manualInputMatch = change.id.match(/^boundary-manual-input-(.+)$/);
            const manualOutputMatch = change.id.match(/^boundary-manual-output-(.+)$/);

            if (manualInputMatch && activeSheetId) {
              updateManualPort(activeSheetId, manualInputMatch[1], { position: change.position });
            } else if (manualOutputMatch && activeSheetId) {
              updateManualPort(activeSheetId, manualOutputMatch[1], { position: change.position });
            }
          }
        }
      });

      // Apply changes to get updated nodes (for regular nodes only)
      const updatedNodes = applyNodeChanges(changes, nodes);
      setNodes(updatedNodes);

      // Handle side effects
      changes.forEach((change) => {
        if (change.type === 'remove') {
          deleteNode(change.id);
        } else if (change.type === 'select') {
          if (change.selected) {
            setSelectedNode(change.id);
          } else if (selectedNodeId === change.id) {
            setSelectedNode(null);
          }
        } else if (change.type === 'position') {
          markDirty();
        }
      });
    },
    [nodes, readOnly, deleteNode, setSelectedNode, selectedNodeId, setNodes, markDirty, activeSheetId, updateManualPort]
  );

  /**
   * Handle edge changes
   * Also handles deletion of virtual boundary port edges by removing specific internal connections
   */
  const onEdgesChange: OnEdgesChange<FlowchartEdge> = useCallback(
    (changes) => {
      let hasVirtualEdgeChanges = false;
      let newSelectedEdgeId: string | null = null;

      // Process all changes
      changes.forEach((change) => {
        if (!('id' in change)) return;

        const isVirtualEdge = change.id.startsWith('boundary-edge-input-') ||
                              change.id.startsWith('boundary-edge-output-') ||
                              change.id.startsWith('boundary-edge-manual-input-') ||
                              change.id.startsWith('boundary-edge-manual-output-');

        if (change.type === 'remove' && isVirtualEdge) {
          // Handle virtual edge deletion
          // Try to match manual input edge
          const manualInputMatch = change.id.match(/^boundary-edge-manual-input-(.+?)(?:-(\d+))?$/);
          // Try to match manual output edge
          const manualOutputMatch = change.id.match(/^boundary-edge-manual-output-(.+?)(?:-(\d+))?$/);
          // Try to match edge-based input edge
          const inputMatch = change.id.match(/^boundary-edge-input-(.+?)(?:-(\d+))?$/);
          // Try to match edge-based output edge
          const outputMatch = change.id.match(/^boundary-edge-output-(.+?)(?:-(\d+))?$/);

          if (manualInputMatch) {
            // Manual input edge deletion - find the edge and remove the connection
            const manualPortId = manualInputMatch[1];
            const connectionIndex = manualInputMatch[2] ? parseInt(manualInputMatch[2], 10) : 0;
            const originalEdge = edges.find(e => e.target === activeSheetId && e.targetHandle === manualPortId);
            if (originalEdge && originalEdge.originalTargets) {
              const connection = originalEdge.originalTargets[connectionIndex];
              if (connection) {
                removeBoundaryPortConnection(originalEdge.id, 'input', connection.nodeId, connection.handleId);
              }
            }
            virtualEdgeSelectionRef.current.delete(change.id);
            hasVirtualEdgeChanges = true;
          } else if (manualOutputMatch) {
            // Manual output edge deletion - find the edge and remove the connection
            const manualPortId = manualOutputMatch[1];
            const connectionIndex = manualOutputMatch[2] ? parseInt(manualOutputMatch[2], 10) : 0;
            const originalEdge = edges.find(e => e.source === activeSheetId && e.sourceHandle === manualPortId);
            if (originalEdge && originalEdge.originalSources) {
              const connection = originalEdge.originalSources[connectionIndex];
              if (connection) {
                removeBoundaryPortConnection(originalEdge.id, 'output', connection.nodeId, connection.handleId);
              }
            }
            virtualEdgeSelectionRef.current.delete(change.id);
            hasVirtualEdgeChanges = true;
          } else if (inputMatch) {
            const originalEdgeId = inputMatch[1];
            const connectionIndex = inputMatch[2] ? parseInt(inputMatch[2], 10) : 0;
            const originalEdge = edges.find(e => e.id === originalEdgeId);
            if (originalEdge && originalEdge.originalTargets) {
              const connection = originalEdge.originalTargets[connectionIndex];
              if (connection) {
                removeBoundaryPortConnection(originalEdgeId, 'input', connection.nodeId, connection.handleId);
              }
            }
            // Remove from selection tracking
            virtualEdgeSelectionRef.current.delete(change.id);
            hasVirtualEdgeChanges = true;
          } else if (outputMatch) {
            const originalEdgeId = outputMatch[1];
            const connectionIndex = outputMatch[2] ? parseInt(outputMatch[2], 10) : 0;
            const originalEdge = edges.find(e => e.id === originalEdgeId);
            if (originalEdge && originalEdge.originalSources) {
              const connection = originalEdge.originalSources[connectionIndex];
              if (connection) {
                removeBoundaryPortConnection(originalEdgeId, 'output', connection.nodeId, connection.handleId);
              }
            }
            // Remove from selection tracking
            virtualEdgeSelectionRef.current.delete(change.id);
            hasVirtualEdgeChanges = true;
          }
        } else if (change.type === 'remove' && !isVirtualEdge) {
          // Regular edge deletion
          deleteEdge(change.id);
        } else if (change.type === 'select') {
          // Track edge selection state
          if (change.selected) {
            newSelectedEdgeId = change.id;
            if (isVirtualEdge) {
              virtualEdgeSelectionRef.current.add(change.id);
              hasVirtualEdgeChanges = true;
            }
          } else {
            if (isVirtualEdge) {
              virtualEdgeSelectionRef.current.delete(change.id);
              hasVirtualEdgeChanges = true;
            }
          }
        }
      });

      // For regular edges, apply changes (excluding virtual edge changes)
      const regularEdgeChanges = changes.filter((change) => {
        if (!('id' in change)) return true;
        return !change.id.startsWith('boundary-edge-input-') &&
               !change.id.startsWith('boundary-edge-output-') &&
               !change.id.startsWith('boundary-edge-manual-input-') &&
               !change.id.startsWith('boundary-edge-manual-output-');
      });

      if (regularEdgeChanges.length > 0) {
        const updatedEdges = applyEdgeChanges(regularEdgeChanges, edges);
        setEdges(updatedEdges);

        // Check if any regular edge is selected after changes
        const selectedRegularEdge = updatedEdges.find(e => e.selected);
        if (selectedRegularEdge) {
          newSelectedEdgeId = selectedRegularEdge.id;
        } else if (!newSelectedEdgeId) {
          // No edge selected, clear selection
          newSelectedEdgeId = null;
        }
      }

      // Update selected edge ID in store
      setSelectedEdgeId(newSelectedEdgeId);

      // Force re-render if virtual edge selection changed
      // We do this by updating a state that visibleEdges depends on
      if (hasVirtualEdgeChanges) {
        setVirtualEdgeVersion(v => v + 1);
      }
    },
    [edges, deleteEdge, setEdges, removeBoundaryPortConnection, setVirtualEdgeVersion, setSelectedEdgeId, activeSheetId, nodes, removeManualPortConnection]
  );

  /**
   * Handle new connections between nodes
   * Also handles connections from boundary port nodes to internal nodes
   * Supports multiple connections from the same boundary port
   */
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return;
      if (!connection.source || !connection.target) return;

      // Prevent self-connections
      if (connection.source === connection.target) return;

      const sourceId = connection.source;
      const targetId = connection.target;

      // Check if source is a boundary port (edge-based or manual)
      const isSourceBoundaryInput = sourceId.startsWith('boundary-input-') || sourceId.startsWith('boundary-manual-input-');
      const isSourceBoundaryOutput = sourceId.startsWith('boundary-output-') || sourceId.startsWith('boundary-manual-output-');

      // Check if target is a boundary port (edge-based or manual)
      const isTargetBoundaryInput = targetId.startsWith('boundary-input-') || targetId.startsWith('boundary-manual-input-');
      const isTargetBoundaryOutput = targetId.startsWith('boundary-output-') || targetId.startsWith('boundary-manual-output-');

      // Handle input boundary port as source (input port -> internal node)
      // This creates a NEW edge from the external source to the new internal target
      if (isSourceBoundaryInput) {
        // Don't allow connection to another boundary port
        if (isTargetBoundaryInput || isTargetBoundaryOutput) return;

        // Determine if this is a manual port or edge-based port
        const manualMatch = sourceId.match(/^boundary-manual-input-(.+)$/);
        const edgeMatch = sourceId.match(/^boundary-input-(.+)$/);

        if (manualMatch && activeSheetId) {
          // Manual port: add internal connection to the manual port
          const manualPortId = manualMatch[1];
          addManualPortConnection(activeSheetId, manualPortId, targetId, connection.targetHandle);
          return;
        } else if (edgeMatch) {
          // Edge-based port: use existing logic
          const originalEdgeId = edgeMatch[1];
          addBoundaryPortEdge(originalEdgeId, 'input', targetId, connection.targetHandle);
          return;
        }
      }

      // Handle output boundary port as target (internal node -> output port)
      // This adds a connection from internal node to the manual port's internal connections
      if (isTargetBoundaryOutput) {
        // Don't allow connection from another boundary port
        if (isSourceBoundaryInput || isSourceBoundaryOutput) return;

        // Determine if this is a manual port or edge-based port
        const manualMatch = targetId.match(/^boundary-manual-output-(.+)$/);
        const edgeMatch = targetId.match(/^boundary-output-(.+)$/);

        if (manualMatch && activeSheetId) {
          // Manual port: add connection to port's internal connections
          const manualPortId = manualMatch[1];
          addManualPortConnection(activeSheetId, manualPortId, sourceId, connection.sourceHandle);
          return;
        } else if (edgeMatch) {
          // Edge-based port: use existing logic
          const originalEdgeId = edgeMatch[1];
          addBoundaryPortEdge(originalEdgeId, 'output', sourceId, connection.sourceHandle);
          return;
        }
      }

      // Prevent invalid connections to boundary ports
      // (connecting TO input port or FROM output port is not allowed)
      if (isTargetBoundaryInput || isSourceBoundaryOutput) {
        return;
      }

      // Regular connection between non-boundary nodes
      addEdge(
        sourceId,
        targetId,
        connection.sourceHandle,
        connection.targetHandle
      );
    },
    [readOnly, addEdge, addBoundaryPortEdge, activeSheetId, addManualPortConnection]
  );

  /**
   * Handle node click events
   */
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: FlowchartNode) => {
      // If Shift is held, let React Flow handle multi-selection
      if (event.shiftKey) {
        onNodeClick?.(node.id);
        return;
      }
      setSelectedNode(node.id);
      onNodeClick?.(node.id);
    },
    [setSelectedNode, onNodeClick]
  );

  /**
   * Handle canvas/pane click events
   */
  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdgeId(null);
    onCanvasClick?.();
  }, [setSelectedNode, setSelectedEdgeId, onCanvasClick]);

  /**
   * Handle drag over for drop functionality
   */
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  /**
   * Handle drop from node palette
   */
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (readOnly) return;

      // Get the node type from the drag data
      const nodeType = event.dataTransfer.getData('application/reactflow') as ProcessNodeType;

      if (!nodeType) return;

      // Get the position where the node was dropped
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Snap to grid if enabled
      if (snapToGrid) {
        position.x = Math.round(position.x / gridSize) * gridSize;
        position.y = Math.round(position.y / gridSize) * gridSize;
      }

      // Add the new node
      addNode(nodeType, position);
    },
    [readOnly, screenToFlowPosition, snapToGrid, gridSize, addNode]
  );

  /**
   * Handle keyboard events (delete selected elements, grouping shortcut)
   */
  useEffect(() => {
    if (readOnly) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle shortcuts if we're editing an input
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Check for Delete or Backspace key
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // Get all currently selected nodes from React Flow
        const currentNodes = getNodes();
        const selectedNodes = currentNodes.filter((node) => node.selected);
        const selectedNodeIds = selectedNodes.map((node) => node.id);

        // Get all currently selected edges from React Flow
        const currentEdges = getEdges();
        const selectedEdges = currentEdges.filter((edge) => edge.selected);
        const selectedEdgeIds = selectedEdges.map((edge) => edge.id);

        // Delete all selected nodes
        if (selectedNodeIds.length > 0) {
          deleteNodes(selectedNodeIds);
          setSelectedNode(null);
        }

        // Delete all selected edges (handle both regular and boundary edges)
        if (selectedEdgeIds.length > 0) {
          // Separate boundary edges from regular edges
          const boundaryEdgeIds: string[] = [];
          const regularEdgeIds: string[] = [];

          selectedEdgeIds.forEach(edgeId => {
            if (edgeId.startsWith('boundary-edge-input-') ||
                edgeId.startsWith('boundary-edge-output-') ||
                edgeId.startsWith('boundary-edge-manual-input-') ||
                edgeId.startsWith('boundary-edge-manual-output-')) {
              boundaryEdgeIds.push(edgeId);
            } else {
              regularEdgeIds.push(edgeId);
            }
          });

          // Delete regular edges using the store action
          if (regularEdgeIds.length > 0) {
            deleteEdges(regularEdgeIds);
          }

          // Handle boundary edge deletion - remove specific connections
          boundaryEdgeIds.forEach(edgeId => {
            const manualInputMatch = edgeId.match(/^boundary-edge-manual-input-(.+?)(?:-(\d+))?$/);
            const manualOutputMatch = edgeId.match(/^boundary-edge-manual-output-(.+?)(?:-(\d+))?$/);
            const inputMatch = edgeId.match(/^boundary-edge-input-(.+?)(?:-(\d+))?$/);
            const outputMatch = edgeId.match(/^boundary-edge-output-(.+?)(?:-(\d+))?$/);

            if (manualInputMatch && activeSheetId) {
              // Manual input edge deletion - use removeManualPortConnection
              const manualPortId = manualInputMatch[1];
              const connectionIndex = manualInputMatch[2] ? parseInt(manualInputMatch[2], 10) : 0;
              // Get the internal connection from the subprocess node data
              const subprocessNode = nodes.find(n => n.id === activeSheetId);
              const subprocessData = subprocessNode?.data as ProcessNodeData | undefined;
              const manualPort = (subprocessData?.manualInputPorts || []).find(p => p.id === manualPortId);
              const connections = manualPort?.internalConnections || [];
              const connection = connections[connectionIndex];
              if (connection) {
                removeManualPortConnection(activeSheetId, manualPortId, connection.nodeId, connection.handleId);
              }
            } else if (manualOutputMatch && activeSheetId) {
              // Manual output edge deletion - use removeManualPortConnection
              const manualPortId = manualOutputMatch[1];
              const connectionIndex = manualOutputMatch[2] ? parseInt(manualOutputMatch[2], 10) : 0;
              // Get the internal connection from the subprocess node data
              const subprocessNode = nodes.find(n => n.id === activeSheetId);
              const subprocessData = subprocessNode?.data as ProcessNodeData | undefined;
              const manualPort = (subprocessData?.manualOutputPorts || []).find(p => p.id === manualPortId);
              const connections = manualPort?.internalConnections || [];
              const connection = connections[connectionIndex];
              if (connection) {
                removeManualPortConnection(activeSheetId, manualPortId, connection.nodeId, connection.handleId);
              }
            } else if (inputMatch) {
              const originalEdgeId = inputMatch[1];
              const connectionIndex = inputMatch[2] ? parseInt(inputMatch[2], 10) : 0;
              const originalEdge = edges.find(e => e.id === originalEdgeId);
              if (originalEdge && originalEdge.originalTargets) {
                const connection = originalEdge.originalTargets[connectionIndex];
                if (connection) {
                  removeBoundaryPortConnection(originalEdgeId, 'input', connection.nodeId, connection.handleId);
                }
              }
            } else if (outputMatch) {
              const originalEdgeId = outputMatch[1];
              const connectionIndex = outputMatch[2] ? parseInt(outputMatch[2], 10) : 0;
              const originalEdge = edges.find(e => e.id === originalEdgeId);
              if (originalEdge && originalEdge.originalSources) {
                const connection = originalEdge.originalSources[connectionIndex];
                if (connection) {
                  removeBoundaryPortConnection(originalEdgeId, 'output', connection.nodeId, connection.handleId);
                }
              }
            }
          });
        }
      }

      // Ctrl+G for grouping
      if ((event.ctrlKey || event.metaKey) && event.key === 'g') {
        event.preventDefault();
        const currentNodes = getNodes();
        const selectedNodes = currentNodes.filter((node) => node.selected);
        const selectedNodeIds = selectedNodes.map((node) => node.id);

        if (selectedNodeIds.length >= 2) {
          const result = groupNodesIntoSubprocess(selectedNodeIds);
          if (result) {
            setSelectedNode(result);
          }
        }
      }

      // Escape key deselects and closes context menu
      if (event.key === 'Escape') {
        setSelectedNode(null);
        setContextMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [readOnly, getNodes, getEdges, deleteNodes, deleteEdges, setSelectedNode, groupNodesIntoSubprocess, edges, removeBoundaryPortConnection, nodes, activeSheetId, removeManualPortConnection]);

  // =============================================================================
  // Context Menu Handling
  // =============================================================================

  /**
   * Handle context menu (right-click) on the pane
   */
  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    if (readOnly) return;

    event.preventDefault();

    const currentNodes = getNodes();
    const selectedNodes = currentNodes.filter((node) => node.selected);

    // Show context menu if there are selected nodes OR if a single subprocess is selected
    // (subprocess might be the only selected node for ungrouping)
    if (selectedNodes.length > 0) {
      setContextMenuPosition({ x: event.clientX, y: event.clientY });
      setContextMenuOpen(true);
    }
  }, [readOnly, getNodes]);

  /**
   * Close the context menu
   */
  const handleCloseContextMenu = useCallback(() => {
    setContextMenuOpen(false);
  }, []);

  /**
   * Get context menu validation state
   */
  const getContextMenuState = useCallback(() => {
    const currentNodes = getNodes() as FlowchartNode[];
    const selectedNodes = currentNodes.filter((node) => node.selected);
    const selectedNodeIds = selectedNodes.map((node) => node.id);

    // Check if a subprocess is selected
    const selectedSubprocess = selectedNodes.find(n => n.type === 'subprocess');
    const isSubprocessSelected = selectedNodes.length === 1 && !!selectedSubprocess;

    // Validate grouping
    let canGroup = false;
    let groupDisabledReason = '';

    if (selectedNodes.length < 2) {
      groupDisabledReason = 'Select at least 2 nodes to group';
    } else if (selectedNodes.some(n => n.type === 'start' || n.type === 'end')) {
      groupDisabledReason = 'Cannot group start or end nodes';
    } else if (selectedNodes.some(n => n.data.parentId)) {
      groupDisabledReason = 'Some nodes are already in a subprocess';
    } else if (selectedNodes.some(n => n.type === 'subprocess')) {
      groupDisabledReason = 'Cannot nest subprocesses';
    } else {
      canGroup = true;
    }

    return {
      selectedNodeIds,
      canGroup,
      groupDisabledReason,
      isSubprocessSelected,
      selectedSubprocessId: selectedSubprocess?.id,
    };
  }, [getNodes]);

  const contextMenuState = getContextMenuState();

  // =============================================================================
  // Sheet Bar
  // =============================================================================

  /**
   * Get sheet info for SheetBar
   */
  const sheets = useMemo((): SheetInfo[] => {
    return nodes
      .filter(n => n.type === 'subprocess')
      .map(n => ({
        id: n.id,
        label: n.data.label || 'Subprocess',
        nodeCount: (n.data.childNodeIds || []).length,
      }));
  }, [nodes]);

  /**
   * Handle sheet selection (null = main view, string = subprocess sheet)
   */
  const handleSheetSelect = useCallback((id: string | null) => {
    if (id === null) {
      closeActiveSheet();
    } else {
      openSubprocessSheet(id);
    }
  }, [openSubprocessSheet, closeActiveSheet]);

  // =============================================================================
  // Visible Nodes & Edges (Sheet-based)
  // =============================================================================

  /**
   * Compute boundary port nodes for sheet view
   * Creates one boundary port per unique external connection AND for manual ports
   */
  const boundaryPortNodes = useMemo(() => {
    if (!activeSheetId) return { inputs: [] as FlowchartNode[], outputs: [] as FlowchartNode[] };

    const inputPorts: FlowchartNode[] = [];
    const outputPorts: FlowchartNode[] = [];

    // Get the subprocess node data to access manual ports
    const subprocessNode = nodes.find((n) => n.id === activeSheetId);
    const subprocessData = subprocessNode?.data as ProcessNodeData | undefined;

    // Add edge-based ports (existing logic)
    edges.forEach((edge) => {
      // Incoming edge (external -> subprocess) - input port
      // One port per edge (edge represents unique external source)
      if (edge.target === activeSheetId && (edge.originalTarget || edge.originalTargets)) {
        const externalNode = nodes.find((n) => n.id === edge.source);
        const portId = `boundary-input-${edge.id}`;

        // Get all internal targets this port connects to
        const internalTargets = edge.originalTargets || [
          { nodeId: edge.originalTarget!, handleId: edge.originalTargetHandle }
        ];

        inputPorts.push({
          id: portId,
          type: 'boundaryPort',
          position: { x: 0, y: 0 }, // Will be positioned later
          measured: { width: 120, height: 32 }, // Provide measured dimensions
          data: {
            label: externalNode?.data?.label || 'Unknown',
            direction: 'input',
            edgeId: edge.id,
            internalNodeId: internalTargets[0].nodeId, // Primary connection (first)
            internalHandleId: internalTargets[0].handleId,
            // Store all internal connections for this port
            allInternalConnections: internalTargets,
            isManual: false,
          } as BoundaryPortNodeData,
        });
      }

      // Outgoing edge (subprocess -> external) - output port
      // One port per edge (edge represents unique external target)
      if (edge.source === activeSheetId && (edge.originalSource || edge.originalSources)) {
        const externalNode = nodes.find((n) => n.id === edge.target);
        const portId = `boundary-output-${edge.id}`;

        // Get all internal sources this port connects from
        const internalSources = edge.originalSources || [
          { nodeId: edge.originalSource!, handleId: edge.originalSourceHandle }
        ];

        outputPorts.push({
          id: portId,
          type: 'boundaryPort',
          position: { x: 0, y: 0 }, // Will be positioned later
          measured: { width: 120, height: 32 }, // Provide measured dimensions
          data: {
            label: externalNode?.data?.label || 'Unknown',
            direction: 'output',
            edgeId: edge.id,
            internalNodeId: internalSources[0].nodeId, // Primary connection (first)
            internalHandleId: internalSources[0].handleId,
            // Store all internal connections for this port
            allInternalConnections: internalSources,
            isManual: false,
          } as BoundaryPortNodeData,
        });
      }
    });

    // Add manual input ports
    (subprocessData?.manualInputPorts || []).forEach((port: ManualPort) => {
      // Get internal connections from the port's stored data
      const connections = port.internalConnections || [];

      const portNodeId = `boundary-manual-input-${port.id}`;
      inputPorts.push({
        id: portNodeId,
        type: 'boundaryPort',
        position: port.position || { x: 0, y: 0 }, // Use stored position or default
        measured: { width: 120, height: 32 },
        data: {
          label: port.label,
          direction: 'input',
          edgeId: `manual-${port.id}`, // Use manual port ID as edge reference
          internalNodeId: connections[0]?.nodeId || '', // Primary connection or empty
          internalHandleId: connections[0]?.handleId || null,
          allInternalConnections: connections,
          isManual: true,
          manualPortId: port.id,
        } as BoundaryPortNodeData,
      });
    });

    // Add manual output ports
    (subprocessData?.manualOutputPorts || []).forEach((port: ManualPort) => {
      // Get internal connections from the port's stored data
      const connections = port.internalConnections || [];

      const portNodeId = `boundary-manual-output-${port.id}`;
      outputPorts.push({
        id: portNodeId,
        type: 'boundaryPort',
        position: port.position || { x: 0, y: 0 }, // Use stored position or default
        measured: { width: 120, height: 32 },
        data: {
          label: port.label,
          direction: 'output',
          edgeId: `manual-${port.id}`, // Use manual port ID as edge reference
          internalNodeId: connections[0]?.nodeId || '', // Primary connection or empty
          internalHandleId: connections[0]?.handleId || null,
          allInternalConnections: connections,
          isManual: true,
          manualPortId: port.id,
        } as BoundaryPortNodeData,
      });
    });

    return { inputs: inputPorts, outputs: outputPorts };
  }, [activeSheetId, edges, nodes, edgeVersion]);

  /**
   * Filter nodes to show based on active sheet
   * - Main view (null): show all nodes NOT inside a subprocess
   * - Sheet view (ID): show only children of that subprocess + boundary port nodes
   */
  const visibleNodes = useMemo(() => {
    if (activeSheetId === null) {
      // Main view: show all nodes NOT inside a subprocess
      // Create new references to force React Flow re-render when nodeVersion changes
      return nodes
        .filter((node) => !node.data.parentId)
        .map((node) => ({ ...node, data: { ...node.data } }));
    }

    // Sheet view: show only children of this subprocess
    // Create new references to force React Flow re-render when nodeVersion changes
    const internalNodes = nodes
      .filter((node) => node.data.parentId === activeSheetId)
      .map((node) => ({ ...node, data: { ...node.data } }));

    // Get boundary port nodes
    const { inputs, outputs } = boundaryPortNodes;

    // Calculate default positions for boundary port nodes based on internal nodes
    // But use stored custom positions if available (for free movement)
    if (internalNodes.length > 0) {
      const minX = Math.min(...internalNodes.map(n => n.position.x));
      const maxX = Math.max(...internalNodes.map(n => n.position.x + (n.measured?.width || 180)));
      const yPositions = internalNodes.map(n => n.position.y);
      const avgY = yPositions.reduce((a, b) => a + b, 0) / yPositions.length;

      // Position input ports on the left side, distributed vertically
      // Use stored position if available, otherwise use calculated default
      const inputStartY = avgY - ((inputs.length - 1) * 50) / 2;
      inputs.forEach((port, index) => {
        const storedPosition = boundaryPortPositionsRef.current.get(port.id);
        if (storedPosition) {
          port.position = storedPosition;
        } else {
          port.position = { x: minX - 180, y: inputStartY + index * 50 };
        }
      });

      // Position output ports on the right side, distributed vertically
      // Use stored position if available, otherwise use calculated default
      const outputStartY = avgY - ((outputs.length - 1) * 50) / 2;
      outputs.forEach((port, index) => {
        const storedPosition = boundaryPortPositionsRef.current.get(port.id);
        if (storedPosition) {
          port.position = storedPosition;
        } else {
          port.position = { x: maxX + 60, y: outputStartY + index * 50 };
        }
      });
    }

    return [...inputs, ...internalNodes, ...outputs];
  }, [nodes, nodeVersion, activeSheetId, boundaryPortNodes]);

  /**
   * Filter edges to show based on visible nodes
   * Also add virtual edges from boundary ports to ALL internal nodes they connect to
   */
  const visibleEdges = useMemo(() => {
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));

    // Filter edges between visible internal nodes
    let result = edges.filter((edge) => {
      return visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target);
    });

    // Add virtual edges from boundary port nodes to ALL internal nodes they connect to
    if (activeSheetId) {
      // Add input edges: boundary-input-{edgeId} -> each internal target
      boundaryPortNodes.inputs.forEach((port) => {
        const portData = port.data as BoundaryPortNodeData;
        const connections = portData.allInternalConnections || [
          { nodeId: portData.internalNodeId, handleId: portData.internalHandleId }
        ];

        // Determine edge color based on whether it's a manual port
        const baseColor = portData.isManual ? '#14B8A6' : '#22C55E'; // teal for manual, green for edge-based

        // Create an edge to each internal connection
        connections.forEach((conn, index) => {
          const edgeId = portData.isManual
            ? `boundary-edge-manual-input-${portData.manualPortId}${index > 0 ? `-${index}` : ''}`
            : (index === 0
              ? `boundary-edge-input-${portData.edgeId}`
              : `boundary-edge-input-${portData.edgeId}-${index}`);

          // Apply custom style if provided, otherwise use default style
          const customStyle = conn.style;
          const edgeStyle = customStyle
            ? {
                stroke: customStyle.stroke || baseColor,
                strokeWidth: customStyle.strokeWidth || 2,
                strokeDasharray: customStyle.strokeDasharray || '6,3',
              }
            : { stroke: baseColor, strokeWidth: 2, strokeDasharray: '6,3' };

          result.push({
            id: edgeId,
            source: port.id,
            target: conn.nodeId,
            sourceHandle: undefined,
            targetHandle: conn.handleId,
            type: customStyle?.edgeType || defaultEdgeType, // Use custom edge type or default
            style: edgeStyle,
            animated: customStyle?.animated,
            label: conn.label, // Apply custom label if provided
            markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
            interactionWidth: 20, // Make edge easier to select (20px invisible hitbox)
            // Make virtual edges selectable and deletable
            selectable: !readOnly,
            deletable: !readOnly,
            // Apply selection state from our tracking ref
            selected: virtualEdgeSelectionRef.current.has(edgeId),
            // Store reference to original edge and connection index for property editing
            data: {
              originalEdgeId: portData.edgeId,
              direction: 'input',
              connectionIndex: index,
              isManual: portData.isManual,
              manualPortId: portData.manualPortId,
              subprocessId: activeSheetId,
            },
          } as FlowchartEdge);
        });
      });

      // Add output edges: each internal source -> boundary-output-{edgeId}
      boundaryPortNodes.outputs.forEach((port) => {
        const portData = port.data as BoundaryPortNodeData;
        const connections = portData.allInternalConnections || [
          { nodeId: portData.internalNodeId, handleId: portData.internalHandleId }
        ];

        // Determine edge color based on whether it's a manual port
        const baseColor = portData.isManual ? '#14B8A6' : '#3B82F6'; // teal for manual, blue for edge-based

        // Create an edge from each internal connection
        connections.forEach((conn, index) => {
          const edgeId = portData.isManual
            ? `boundary-edge-manual-output-${portData.manualPortId}${index > 0 ? `-${index}` : ''}`
            : (index === 0
              ? `boundary-edge-output-${portData.edgeId}`
              : `boundary-edge-output-${portData.edgeId}-${index}`);

          // Apply custom style if provided, otherwise use default style
          const customStyle = conn.style;
          const edgeStyle = customStyle
            ? {
                stroke: customStyle.stroke || baseColor,
                strokeWidth: customStyle.strokeWidth || 2,
                strokeDasharray: customStyle.strokeDasharray || '6,3',
              }
            : { stroke: baseColor, strokeWidth: 2, strokeDasharray: '6,3' };

          result.push({
            id: edgeId,
            source: conn.nodeId,
            target: port.id,
            sourceHandle: conn.handleId,
            targetHandle: undefined,
            type: customStyle?.edgeType || defaultEdgeType, // Use custom edge type or default
            style: edgeStyle,
            animated: customStyle?.animated,
            label: conn.label, // Apply custom label if provided
            markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
            interactionWidth: 20, // Make edge easier to select (20px invisible hitbox)
            // Make virtual edges selectable and deletable
            selectable: !readOnly,
            deletable: !readOnly,
            // Apply selection state from our tracking ref
            selected: virtualEdgeSelectionRef.current.has(edgeId),
            // Store reference to original edge and connection index for property editing
            data: {
              originalEdgeId: portData.edgeId,
              direction: 'output',
              connectionIndex: index,
              isManual: portData.isManual,
              manualPortId: portData.manualPortId,
              subprocessId: activeSheetId,
            },
          } as FlowchartEdge);
        });
      });
    }

    return result;
  }, [edges, edgeVersion, visibleNodes, activeSheetId, boundaryPortNodes, defaultEdgeType, readOnly, virtualEdgeVersion]);

  // =============================================================================
  // Edge Options
  // =============================================================================

  const defaultEdgeOptions = {
    type: defaultEdgeType,
    animated: false,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
    },
    style: {
      strokeWidth: 2,
      stroke: '#6B7280',
    },
  };

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <div className="flex flex-col h-full">
      <div
        ref={reactFlowWrapper}
        className={`flex-1 ${className}`}
        onContextMenu={handleContextMenu}
      >
        <ReactFlow
          nodes={visibleNodes}
          edges={visibleEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={registeredNodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          snapToGrid={snapToGrid}
          snapGrid={[gridSize, gridSize]}
          fitView
          fitViewOptions={{
            padding: 0.2,
          }}
          minZoom={0.1}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          deleteKeyCode={null} // We handle delete manually
          multiSelectionKeyCode="Shift"
          selectionOnDrag
          panOnDrag={[1, 2]} // Pan with middle or right mouse button
          selectionMode={SelectionMode.Partial}
          nodesDraggable={!readOnly}
          nodesConnectable={!readOnly}
          elementsSelectable={!readOnly}
          className="bg-gray-50"
        >
          {/* Background with dots pattern */}
          {showGrid && (
            <Background
              variant={BackgroundVariant.Dots}
              gap={gridSize}
              size={1}
              color="#D1D5DB"
            />
          )}

          {/* Zoom and pan controls */}
          <Controls
            className="!bg-white !border !border-gray-200 !rounded-lg !shadow-sm"
            showZoom={true}
            showFitView={true}
            showInteractive={true}
          />

          {/* MiniMap for navigation */}
          {showMinimap && (
            <MiniMap
              nodeColor={(node) => {
                switch (node.type) {
                  case 'start': return '#10B981';
                  case 'end': return '#EF4444';
                  case 'process': return '#3B82F6';
                  case 'decision': return '#F59E0B';
                  case 'subprocess': return '#8B5CF6';
                  case 'parallel': return '#06B6D4';
                  case 'delay': return '#EC4899';
                  default: return '#6B7280';
                }
              }}
              nodeStrokeWidth={3}
              zoomable
              pannable
              className="!bg-white !border !border-gray-200 !rounded-lg !shadow-sm"
              maskColor="rgba(0, 0, 0, 0.1)"
            />
          )}

          {/* Info Panel */}
          <Panel position="top-right" className="!m-2">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-500 border border-gray-200 shadow-sm">
              {visibleNodes.length} node{visibleNodes.length !== 1 ? 's' : ''} | {visibleEdges.length} connection{visibleEdges.length !== 1 ? 's' : ''}
              {activeSheetId && (
                <span className="ml-2 text-purple-600">| Sheet view</span>
              )}
            </div>
          </Panel>

          {/* Input/Output Labels for sheet view */}
          {activeSheetId && (visibleNodes.some(n => n.type === 'boundaryPort')) && (
            <>
              {/* Input label header */}
              {visibleNodes.some(n => n.type === 'boundaryPort' && (n.data as BoundaryPortNodeData).direction === 'input') && (
                <Panel position="top-left" className="!m-2 !mt-14">
                  <div className="text-xs text-gray-500 font-medium flex items-center gap-1 bg-white/80 px-2 py-1 rounded shadow-sm">
                    <ArrowLeft className="w-3 h-3" />
                    <span>Inputs</span>
                  </div>
                </Panel>
              )}
              {/* Output label header */}
              {visibleNodes.some(n => n.type === 'boundaryPort' && (n.data as BoundaryPortNodeData).direction === 'output') && (
                <Panel position="top-right" className="!m-2 !mt-14 !mr-48">
                  <div className="text-xs text-gray-500 font-medium flex items-center gap-1 bg-white/80 px-2 py-1 rounded shadow-sm">
                    <span>Outputs</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </Panel>
              )}
            </>
          )}

          {/* Keyboard shortcuts hint */}
          <Panel position="bottom-right" className="!m-2">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-gray-500 border border-gray-200 shadow-sm">
              <div className="flex flex-col gap-1">
                <span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-700 font-mono">Del</kbd>
                  {' '}Remove selected
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-700 font-mono">Shift</kbd>
                  {' '}Multi-select
                </span>
                <span>
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-700 font-mono">Ctrl+G</kbd>
                  {' '}Group nodes
                </span>
              </div>
            </div>
          </Panel>
        </ReactFlow>

        {/* Context Menu for grouping/ungrouping */}
        <ContextMenu
          isOpen={contextMenuOpen}
          position={contextMenuPosition}
          onClose={handleCloseContextMenu}
          selectedNodeIds={contextMenuState.selectedNodeIds}
          canGroup={contextMenuState.canGroup}
          groupDisabledReason={contextMenuState.groupDisabledReason}
          isSubprocessSelected={contextMenuState.isSubprocessSelected}
          selectedSubprocessId={contextMenuState.selectedSubprocessId}
        />
      </div>

      {/* Sheet Bar at bottom */}
      <SheetBar
        activeSheetId={activeSheetId}
        sheets={sheets}
        onSheetSelect={handleSheetSelect}
        onSheetClose={closeActiveSheet}
      />
    </div>
  );
}

// =============================================================================
// Flow Canvas Component
// =============================================================================

export default function FlowCanvas(props: FlowCanvasProps) {
  return <FlowCanvasInner {...props} />;
}

// =============================================================================
// Exports
// =============================================================================

export type { FlowCanvasProps };
