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
import { useFlowchartStore, useCursorMode } from '../../stores/flowchartStore';
import type { FlowchartNode, FlowchartEdge, ProcessNodeType, ProcessNodeData, Port, AnnotationType } from '../../types';
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
  const { screenToFlowPosition, getNodes, getEdges, fitView, setNodes: setReactFlowNodes } = useReactFlow();

  // Store custom positions for boundary port nodes (input/output nodes in subprocess sheets)
  // This allows them to be freely moved and maintain their positions
  const boundaryPortPositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Track selection state for virtual boundary edges (since they're regenerated each render)
  const virtualEdgeSelectionRef = useRef<Set<string>>(new Set());
  // Counter to force re-renders when virtual edge selection changes
  const [virtualEdgeVersion, setVirtualEdgeVersion] = useState(0);

  // Track selection state for boundary port nodes (input/output nodes in subprocess sheets)
  const boundaryPortSelectionRef = useRef<Set<string>>(new Set());
  // Counter to force re-renders when boundary port selection changes
  const [boundaryPortSelectionVersion, setBoundaryPortSelectionVersion] = useState(0);

  // Store selectors
  const nodes = useFlowchartStore((state) => state.nodes);
  const edges = useFlowchartStore((state) => state.edges);
  const nodeVersion = useFlowchartStore((state) => state.nodeVersion);
  const edgeVersion = useFlowchartStore((state) => state.edgeVersion);
  const selectedNodeId = useFlowchartStore((state) => state.selectedNodeId);
  const addNode = useFlowchartStore((state) => state.addNode);
  const addAnnotationNode = useFlowchartStore((state) => state.addAnnotationNode);
  const addEdge = useFlowchartStore((state) => state.addEdge);
  const setNodes = useFlowchartStore((state) => state.setNodes);
  const setEdges = useFlowchartStore((state) => state.setEdges);
  const setSelectedNode = useFlowchartStore((state) => state.setSelectedNode);
  const updateNode = useFlowchartStore((state) => state.updateNode);
  const deleteNode = useFlowchartStore((state) => state.deleteNode);
  const deleteNodes = useFlowchartStore((state) => state.deleteNodes);
  const deleteEdge = useFlowchartStore((state) => state.deleteEdge);
  const deleteEdges = useFlowchartStore((state) => state.deleteEdges);
  const markDirty = useFlowchartStore((state) => state.markDirty);
  const activeSubprocessId = useFlowchartStore((state) => state.activeSubprocessId);
  const activeSheetId = useFlowchartStore((state) => state.activeSheetId);
  const subprocessNavigationStack = useFlowchartStore((state) => state.subprocessNavigationStack);
  const openSubprocessSheet = useFlowchartStore((state) => state.openSubprocessSheet);
  const closeActiveSubprocess = useFlowchartStore((state) => state.closeActiveSubprocess);
  const navigateToSubprocess = useFlowchartStore((state) => state.navigateToSubprocess);
  const groupNodesIntoSubprocess = useFlowchartStore((state) => state.groupNodesIntoSubprocess);
  const defaultEdgeType = useFlowchartStore((state) => state.defaultEdgeType);
  const addBoundaryPortEdge = useFlowchartStore((state) => state.addBoundaryPortEdge);
  const removeBoundaryPortConnection = useFlowchartStore((state) => state.removeBoundaryPortConnection);
  const setSelectedEdgeId = useFlowchartStore((state) => state.setSelectedEdgeId);
  const updateManualPort = useFlowchartStore((state) => state.updateManualPort);
  const updateEdge = useFlowchartStore((state) => state.updateEdge);
  const addManualPortConnection = useFlowchartStore((state) => state.addManualPortConnection);
  const removeManualPortConnection = useFlowchartStore((state) => state.removeManualPortConnection);
  const copySelectedNodes = useFlowchartStore((state) => state.copySelectedNodes);
  const pasteNodes = useFlowchartStore((state) => state.pasteNodes);
  const cutSelectedNodes = useFlowchartStore((state) => state.cutSelectedNodes);
  const undo = useFlowchartStore((state) => state.undo);
  const redo = useFlowchartStore((state) => state.redo);
  const hasClipboardContent = useFlowchartStore((state) => state.clipboardNodes.length > 0);
  const clearHighlightedNodes = useFlowchartStore((state) => state.clearHighlightedNodes);
  const isDirty = useFlowchartStore((state) => state.isDirty);
  const saveFlowchart = useFlowchartStore((state) => state.saveFlowchart);
  const cursorMode = useCursorMode();

  // Context menu state
  const [contextMenuOpen, setContextMenuOpen] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition>({ x: 0, y: 0 });

  // Clear boundary port positions and virtual edge/node selection when switching sheets
  useEffect(() => {
    boundaryPortPositionsRef.current.clear();
    virtualEdgeSelectionRef.current.clear();
    boundaryPortSelectionRef.current.clear();
  }, [activeSubprocessId]);

  // Auto fit-to-view when switching canvas context (subprocess, sheet)
  useEffect(() => {
    // Small delay to allow the DOM to update with new nodes before fitting
    const timeoutId = setTimeout(() => {
      fitView({ padding: 0.2, duration: 300 });
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [activeSubprocessId, activeSheetId, fitView]);

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
      let hasBoundaryPortSelectionChange = false;

      // Collect boundary port position changes to apply AFTER setNodes
      // This prevents setNodes from overwriting the port position updates
      const boundaryPortPositionChanges: Array<{
        portId: string;
        direction: 'input' | 'output';
        position: { x: number; y: number };
        isEdgeBased: boolean;
        edgeId?: string;
      }> = [];

      // First pass: identify changes and collect boundary port position updates
      changes.forEach((change) => {
        // Skip changes that don't have an id (e.g., NodeAddChange)
        if (!('id' in change)) return;

        const isBoundaryPort = change.id.startsWith('boundary-in-') ||
                                change.id.startsWith('boundary-out-');

        if (change.type === 'position' && change.position && isBoundaryPort) {
          // Store the position in our ref for boundary port nodes
          boundaryPortPositionsRef.current.set(change.id, change.position);

          // Extract the ID from the port node ID
          const inputMatch = change.id.match(/^boundary-in-(.+)$/);
          const outputMatch = change.id.match(/^boundary-out-(.+)$/);

          if (inputMatch && activeSubprocessId) {
            const extractedId = inputMatch[1];
            const isEdgeBased = edges.some(e => e.id === extractedId);
            boundaryPortPositionChanges.push({
              portId: extractedId,
              direction: 'input',
              position: change.position,
              isEdgeBased,
              edgeId: isEdgeBased ? extractedId : undefined,
            });
          } else if (outputMatch && activeSubprocessId) {
            const extractedId = outputMatch[1];
            const isEdgeBased = edges.some(e => e.id === extractedId);
            boundaryPortPositionChanges.push({
              portId: extractedId,
              direction: 'output',
              position: change.position,
              isEdgeBased,
              edgeId: isEdgeBased ? extractedId : undefined,
            });
          }
        }

        // Track selection state for boundary port nodes
        if (change.type === 'select' && isBoundaryPort) {
          if (change.selected) {
            boundaryPortSelectionRef.current.add(change.id);
          } else {
            boundaryPortSelectionRef.current.delete(change.id);
          }
          hasBoundaryPortSelectionChange = true;
        }
      });

      // Apply changes to get updated nodes (for regular nodes only)
      const updatedNodes = applyNodeChanges(changes, nodes);
      setNodes(updatedNodes);

      // Handle side effects for regular nodes
      changes.forEach((change) => {
        // Skip changes that don't have an id (e.g., NodeAddChange)
        if (!('id' in change)) return;

        const isBoundaryPort = change.id.startsWith('boundary-in-') ||
                                change.id.startsWith('boundary-out-');

        if (change.type === 'remove' && !isBoundaryPort) {
          deleteNode(change.id);
        } else if (change.type === 'select' && !isBoundaryPort) {
          if (change.selected) {
            setSelectedNode(change.id);
          } else if (selectedNodeId === change.id) {
            setSelectedNode(null);
          }
        } else if (change.type === 'position' && !isBoundaryPort) {
          markDirty();
        }
      });

      // Apply boundary port position changes AFTER setNodes to prevent overwriting
      // This is critical for persistence - the port positions must be saved after
      // the regular node changes are applied
      boundaryPortPositionChanges.forEach(({ portId, direction, position, isEdgeBased, edgeId }) => {
        markDirty();

        if (isEdgeBased && edgeId) {
          // Edge-based port: save position to edge data
          const edge = edges.find(e => e.id === edgeId);
          if (direction === 'input') {
            updateEdge(edgeId, {
              data: {
                ...edge?.data,
                boundaryPortPosition: position,
              },
            });
          } else {
            updateEdge(edgeId, {
              data: {
                ...edge?.data,
                boundaryPortOutPosition: position,
              },
            });
          }
        } else {
          // Manual port: save position to manual port data
          updateManualPort(activeSubprocessId!, portId, { position });
        }
      });

      // Force re-render if boundary port selection changed
      if (hasBoundaryPortSelectionChange) {
        setBoundaryPortSelectionVersion(v => v + 1);
      }
    },
    [nodes, readOnly, deleteNode, setSelectedNode, selectedNodeId, setNodes, markDirty, activeSubprocessId, updateManualPort, updateEdge, edges, setBoundaryPortSelectionVersion]
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

        // Unified format: boundary-edge-in-{portId}-{index} or boundary-edge-out-{portId}-{index}
        const isVirtualEdge = change.id.startsWith('boundary-edge-in-') ||
                              change.id.startsWith('boundary-edge-out-');

        if (change.type === 'remove' && isVirtualEdge) {
          // Handle virtual edge deletion
          // Try to match input edge
          const inputMatch = change.id.match(/^boundary-edge-in-(.+?)(?:-(\d+))?$/);
          // Try to match output edge
          const outputMatch = change.id.match(/^boundary-edge-out-(.+?)(?:-(\d+))?$/);

          if (inputMatch && activeSubprocessId) {
            // Input edge deletion - remove connection from the port
            const portId = inputMatch[1];
            const connectionIndex = inputMatch[2] ? parseInt(inputMatch[2], 10) : 0;
            // Find the subprocess node and get the port's internal connections
            const subprocessNode = nodes.find(n => n.id === activeSubprocessId);
            const subprocessData = subprocessNode?.data as ProcessNodeData | undefined;
            const inputPorts = subprocessData?.inputPorts || [];
            const port = inputPorts.find(p => p.id === portId);
            const connections = port?.internalConnections || [];
            const connection = connections[connectionIndex];
            if (connection) {
              removeManualPortConnection(activeSubprocessId, portId, connection.nodeId, connection.handleId);
            }
            virtualEdgeSelectionRef.current.delete(change.id);
            hasVirtualEdgeChanges = true;
          } else if (outputMatch && activeSubprocessId) {
            // Output edge deletion - remove connection from the port
            const portId = outputMatch[1];
            const connectionIndex = outputMatch[2] ? parseInt(outputMatch[2], 10) : 0;
            // Find the subprocess node and get the port's internal connections
            const subprocessNode = nodes.find(n => n.id === activeSubprocessId);
            const subprocessData = subprocessNode?.data as ProcessNodeData | undefined;
            const outputPorts = subprocessData?.outputPorts || [];
            const port = outputPorts.find(p => p.id === portId);
            const connections = port?.internalConnections || [];
            const connection = connections[connectionIndex];
            if (connection) {
              removeManualPortConnection(activeSubprocessId, portId, connection.nodeId, connection.handleId);
            }
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
    [edges, deleteEdge, setEdges, removeBoundaryPortConnection, setVirtualEdgeVersion, setSelectedEdgeId, activeSubprocessId, nodes, removeManualPortConnection]
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

      // Get source and target nodes to check their types
      const sourceNode = nodes.find((n) => n.id === sourceId);
      const targetNode = nodes.find((n) => n.id === targetId);

      // Connection limitation for subprocess nodes only
      // Subprocess nodes can only have one connection per handle
      // Other node types can have multiple connections
      const isSourceSubprocess = sourceNode?.type === 'subprocess';
      const isTargetSubprocess = targetNode?.type === 'subprocess';

      // StartNode/EndNode validation for hybrid handles
      // StartNode can only have outgoing connections (can't connect TO a StartNode)
      if (targetNode?.type === 'start') {
        return;
      }
      // EndNode can only have incoming connections (can't connect FROM an EndNode)
      if (sourceNode?.type === 'end') {
        return;
      }

      // For subprocess nodes: check if source port already has a connection (one output connection per port)
      if (isSourceSubprocess) {
        const sourceHasConnection = edges.some(
          (e) => e.source === sourceId && e.sourceHandle === connection.sourceHandle
        );
        if (sourceHasConnection) return;
      }

      // For subprocess nodes: check if target port already has a connection (one input connection per port)
      if (isTargetSubprocess) {
        const targetHasConnection = edges.some(
          (e) => e.target === targetId && e.targetHandle === connection.targetHandle
        );
        if (targetHasConnection) return;
      }

      // Check if source is a boundary port
      const isSourceBoundaryInput = sourceId.startsWith('boundary-in-');
      const isSourceBoundaryOutput = sourceId.startsWith('boundary-out-');

      // Check if target is a boundary port
      const isTargetBoundaryInput = targetId.startsWith('boundary-in-');
      const isTargetBoundaryOutput = targetId.startsWith('boundary-out-');

      // Handle input boundary port as source (input port -> internal node)
      // This creates a NEW edge from the external source to the new internal target
      if (isSourceBoundaryInput) {
        // Don't allow connection to another boundary port
        if (isTargetBoundaryInput || isTargetBoundaryOutput) return;

        // Extract port ID from boundary node ID
        const match = sourceId.match(/^boundary-in-(.+)$/);

        if (match) {
          const portId = match[1];
          // Check if this is a UUID-based port ID (new format) or edge ID (legacy)
          const isNewFormat = portId.startsWith('port-in-');

          if (isNewFormat && activeSubprocessId) {
            // New format: add internal connection to the port
            addManualPortConnection(activeSubprocessId, portId, targetId, connection.targetHandle);
            return;
          } else {
            // Legacy format: use edge-based logic
            addBoundaryPortEdge(portId, 'input', targetId, connection.targetHandle);
            return;
          }
        }
      }

      // Handle output boundary port as target (internal node -> output port)
      // This adds a connection from internal node to the port's internal connections
      if (isTargetBoundaryOutput) {
        // Don't allow connection from another boundary port
        if (isSourceBoundaryInput || isSourceBoundaryOutput) return;

        // Extract port ID from boundary node ID
        const match = targetId.match(/^boundary-out-(.+)$/);

        if (match) {
          const portId = match[1];
          // Check if this is a UUID-based port ID (new format) or edge ID (legacy)
          const isNewFormat = portId.startsWith('port-out-');

          if (isNewFormat && activeSubprocessId) {
            // New format: add connection to port's internal connections
            addManualPortConnection(activeSubprocessId, portId, sourceId, connection.sourceHandle);
            return;
          } else {
            // Legacy format: use edge-based logic
            addBoundaryPortEdge(portId, 'output', sourceId, connection.sourceHandle);
            return;
          }
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
        connection.sourceHandle ?? undefined,
        connection.targetHandle ?? undefined
      );
    },
    [readOnly, nodes, edges, addEdge, addBoundaryPortEdge, activeSubprocessId, addManualPortConnection]
  );

  /**
   * Handle node click events
   */
  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: FlowchartNode) => {
      // If Ctrl is held, let React Flow handle multi-selection
      if (event.ctrlKey || event.metaKey) {
        onNodeClick?.(node.id);
        return;
      }
      setSelectedNode(node.id);
      setSelectedEdgeId(null); // Clear edge selection when node is selected
      onNodeClick?.(node.id);
    },
    [setSelectedNode, setSelectedEdgeId, onNodeClick]
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
      const nodeType = event.dataTransfer.getData('application/reactflow');
      const isAnnotation = event.dataTransfer.getData('application/annotation') === 'true';

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

      // Check if dropping on an existing node (for type swap)
      const nodes = getNodes();
      const targetNode = nodes.find((node) => {
        // Use measured dimensions or fallback to defaults
        const width = node.measured?.width || node.width || 200;
        const height = node.measured?.height || node.height || 100;
        return (
          position.x >= node.position.x &&
          position.x <= node.position.x + width &&
          position.y >= node.position.y &&
          position.y <= node.position.y + height
        );
      });

      if (targetNode) {
        // Get the target node's data to check if it's an annotation
        const targetNodeData = targetNode.data as ProcessNodeData;
        const targetIsAnnotation = targetNodeData.nodeType !== undefined &&
          ['annotationRectangle', 'annotationSquare', 'annotationCircle', 'annotationLine', 'annotationTextBox'].includes(targetNodeData.nodeType);

        // Node types that cannot be swapped
        const nonSwappableTypes: ProcessNodeType[] = ['start', 'end', 'subprocess', 'junction', 'connector', 'reference'];

        // Only swap if not trying to swap between annotation and process types
        // and if the target node is not a non-swappable type
        if (!isAnnotation && !targetIsAnnotation && !nonSwappableTypes.includes(targetNodeData.nodeType)) {
          // Swap node type - update both the node's type and data.nodeType
          const newType = nodeType as ProcessNodeType;
          updateNode(targetNode.id, { nodeType: newType });
          // Also need to update the node's type in ReactFlow
          setReactFlowNodes(
            nodes.map((n) =>
              n.id === targetNode.id ? { ...n, type: newType } : n
            )
          );
        } else if (isAnnotation && targetIsAnnotation) {
          // Swap annotation type - update both the node's type and data.nodeType
          const newType = nodeType as AnnotationType;
          updateNode(targetNode.id, { nodeType: newType });
          // Also need to update the node's type in ReactFlow
          setReactFlowNodes(
            nodes.map((n) =>
              n.id === targetNode.id ? { ...n, type: newType } : n
            )
          );
        }
        // Otherwise, create a new node (don't swap between annotation and process)
      } else {
        // Create new node (existing behavior)
        if (isAnnotation) {
          addAnnotationNode(nodeType as AnnotationType, position);
        } else {
          addNode(nodeType as ProcessNodeType, position);
        }
      }
    },
    [readOnly, screenToFlowPosition, snapToGrid, gridSize, addNode, addAnnotationNode, updateNode, getNodes, setReactFlowNodes]
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

      // Check for Escape key - clear highlighted nodes from ListView selection
      if (event.key === 'Escape') {
        clearHighlightedNodes();
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
            if (edgeId.startsWith('boundary-edge-in-') ||
                edgeId.startsWith('boundary-edge-out-')) {
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
            // Unified format: boundary-edge-in-{portId}-{index} or boundary-edge-out-{portId}-{index}
            const inputMatch = edgeId.match(/^boundary-edge-in-(.+?)(?:-(\d+))?$/);
            const outputMatch = edgeId.match(/^boundary-edge-out-(.+?)(?:-(\d+))?$/);

            if (inputMatch && activeSubprocessId) {
              // Input edge deletion - use removeManualPortConnection
              const portId = inputMatch[1];
              const connectionIndex = inputMatch[2] ? parseInt(inputMatch[2], 10) : 0;
              // Get the internal connection from the subprocess node data
              const subprocessNode = nodes.find(n => n.id === activeSubprocessId);
              const subprocessData = subprocessNode?.data as ProcessNodeData | undefined;
              const inputPorts = subprocessData?.inputPorts || [];
              const port = inputPorts.find(p => p.id === portId);
              const connections = port?.internalConnections || [];
              const connection = connections[connectionIndex];
              if (connection) {
                removeManualPortConnection(activeSubprocessId, portId, connection.nodeId, connection.handleId);
              }
            } else if (outputMatch && activeSubprocessId) {
              // Output edge deletion - use removeManualPortConnection
              const portId = outputMatch[1];
              const connectionIndex = outputMatch[2] ? parseInt(outputMatch[2], 10) : 0;
              // Get the internal connection from the subprocess node data
              const subprocessNode = nodes.find(n => n.id === activeSubprocessId);
              const subprocessData = subprocessNode?.data as ProcessNodeData | undefined;
              const outputPorts = subprocessData?.outputPorts || [];
              const port = outputPorts.find(p => p.id === portId);
              const connections = port?.internalConnections || [];
              const connection = connections[connectionIndex];
              if (connection) {
                removeManualPortConnection(activeSubprocessId, portId, connection.nodeId, connection.handleId);
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

        // Only group if at least 2 nodes selected and no boundary port nodes
        const hasBoundaryPort = selectedNodes.some(n => n.type === 'boundaryPort');
        if (selectedNodeIds.length >= 2 && !hasBoundaryPort) {
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

      // Copy: Ctrl+C
      if ((event.ctrlKey || event.metaKey) && event.key === 'c' && !event.shiftKey) {
        event.preventDefault();
        copySelectedNodes();
      }

      // Paste: Ctrl+V
      if ((event.ctrlKey || event.metaKey) && event.key === 'v' && !event.shiftKey) {
        event.preventDefault();
        pasteNodes();
      }

      // Cut: Ctrl+X
      if ((event.ctrlKey || event.metaKey) && event.key === 'x' && !event.shiftKey) {
        event.preventDefault();
        cutSelectedNodes();
      }

      // Undo: Ctrl+Z
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
        event.preventDefault();
        redo();
      }

      // Save: Ctrl+S
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (isDirty) {
          saveFlowchart();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [readOnly, getNodes, getEdges, deleteNodes, deleteEdges, setSelectedNode, groupNodesIntoSubprocess, edges, removeBoundaryPortConnection, nodes, activeSubprocessId, removeManualPortConnection, copySelectedNodes, pasteNodes, cutSelectedNodes, undo, redo, clearHighlightedNodes, isDirty, saveFlowchart]);

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
    const hasClipboardContent = useFlowchartStore.getState().clipboardNodes.length > 0;

    // Show context menu if:
    // 1. There are selected nodes, OR
    // 2. There's content in the clipboard (to allow pasting on empty canvas)
    if (selectedNodes.length > 0 || hasClipboardContent) {
      setContextMenuPosition({ x: event.clientX, y: event.clientY });
      setContextMenuOpen(true);
    }
  }, [readOnly, getNodes, hasClipboardContent]);

  /**
   * Close the context menu
   */
  const handleCloseContextMenu = useCallback(() => {
    setContextMenuOpen(false);
  }, []);

  /**
   * Lock boundary ports by updating their port definitions
   */
  const handleLockBoundaryPorts = useCallback((portNodeIds: string[]) => {
    if (!activeSubprocessId) return;

    portNodeIds.forEach(portNodeId => {
      // Extract port ID from node ID (boundary-in-{portId} or boundary-out-{portId})
      const inputMatch = portNodeId.match(/^boundary-in-(.+)$/);
      const outputMatch = portNodeId.match(/^boundary-out-(.+)$/);

      if (inputMatch) {
        const portId = inputMatch[1];
        updateManualPort(activeSubprocessId, portId, { locked: true });
      } else if (outputMatch) {
        const portId = outputMatch[1];
        updateManualPort(activeSubprocessId, portId, { locked: true });
      }
    });
  }, [activeSubprocessId, updateManualPort]);

  /**
   * Unlock boundary ports by updating their port definitions
   */
  const handleUnlockBoundaryPorts = useCallback((portNodeIds: string[]) => {
    if (!activeSubprocessId) return;

    portNodeIds.forEach(portNodeId => {
      // Extract port ID from node ID (boundary-in-{portId} or boundary-out-{portId})
      const inputMatch = portNodeId.match(/^boundary-in-(.+)$/);
      const outputMatch = portNodeId.match(/^boundary-out-(.+)$/);

      if (inputMatch) {
        const portId = inputMatch[1];
        updateManualPort(activeSubprocessId, portId, { locked: false });
      } else if (outputMatch) {
        const portId = outputMatch[1];
        updateManualPort(activeSubprocessId, portId, { locked: false });
      }
    });
  }, [activeSubprocessId, updateManualPort]);

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

    // Check if a single node is selected that can be referenced (not reference or boundaryPort)
    const referenceableNode = selectedNodes.length === 1
      ? selectedNodes.find(n => n.type !== 'reference' && n.type !== 'boundaryPort')
      : null;

    // Check lock state for selected nodes
    const hasLockedNodes = selectedNodes.some(n => n.data.locked);
    const hasUnlockedNodes = selectedNodes.some(n => !n.data.locked);

    // Validate grouping
    let canGroup = false;
    let groupDisabledReason = '';

    if (selectedNodes.length < 2) {
      groupDisabledReason = 'Select at least 2 nodes to group';
    } else if (selectedNodes.some(n => n.type === 'boundaryPort')) {
      groupDisabledReason = 'Cannot group boundary port nodes';
    } else if (selectedNodes.some(n => n.type === 'start' || n.type === 'end')) {
      groupDisabledReason = 'Cannot group start or end nodes';
    } else {
      // Check if all nodes have the same parent (can only group nodes from the same level)
      const parentIds = new Set(selectedNodes.map(n => n.data.parentId || null));
      if (parentIds.size > 1) {
        groupDisabledReason = 'Cannot group nodes from different subprocesses';
      } else {
        canGroup = true;
      }
    }

    return {
      selectedNodeIds,
      canGroup,
      groupDisabledReason,
      isSubprocessSelected,
      selectedSubprocessId: selectedSubprocess?.id,
      referenceableNode,
      hasLockedNodes,
      hasUnlockedNodes,
      hasClipboardContent: useFlowchartStore.getState().clipboardNodes.length > 0,
    };
  }, [getNodes]);

  const contextMenuState = getContextMenuState();

  // =============================================================================
  // Sheet Bar
  // =============================================================================

  /**
   * Get sheet info for SheetBar
   * Shows top-level subprocesses in main view, or direct child subprocesses in sheet view
   */
  const sheets = useMemo((): SheetInfo[] => {
    if (activeSubprocessId === null) {
      // Main view: only top-level subprocesses (no parentId)
      return nodes
        .filter(n => n.type === 'subprocess' && !n.data.parentId)
        .map(n => ({
          id: n.id,
          label: n.data.label || 'Subprocess',
          nodeCount: ((n.data.childNodeIds as string[] | undefined) || []).length,
        }));
    } else {
      // Sheet view: only direct child subprocesses (parentId equals activeSubprocessId)
      return nodes
        .filter(n => n.type === 'subprocess' && n.data.parentId === activeSubprocessId)
        .map(n => ({
          id: n.id,
          label: n.data.label || 'Subprocess',
          nodeCount: ((n.data.childNodeIds as string[] | undefined) || []).length,
        }));
    }
  }, [nodes, activeSubprocessId]);

  /**
   * Create a map of subprocess IDs to their labels for breadcrumb navigation
   */
  const subprocessLabels = useMemo(() => {
    const labels = new Map<string, string>();
    nodes
      .filter(n => n.type === 'subprocess')
      .forEach(n => {
        labels.set(n.id, n.data.label || 'Subprocess');
      });
    return labels;
  }, [nodes]);

  /**
   * Handle sheet selection (null = main view, string = subprocess sheet)
   */
  const handleSheetSelect = useCallback((id: string | null) => {
    if (id === null) {
      closeActiveSubprocess();
    } else {
      openSubprocessSheet(id);
    }
  }, [openSubprocessSheet, closeActiveSubprocess]);

  // =============================================================================
  // Visible Nodes & Edges (Sheet-based)
  // =============================================================================

  /**
   * Compute boundary port nodes for sheet view
   * Creates one boundary port per unique external connection AND for manual ports
   * Applies tracked selection state for multi-select support
   */
  const boundaryPortNodes = useMemo(() => {
    if (!activeSubprocessId) return { inputs: [] as FlowchartNode[], outputs: [] as FlowchartNode[] };

    const inputPorts: FlowchartNode[] = [];
    const outputPorts: FlowchartNode[] = [];

    // Get the subprocess node data to access ports
    const subprocessNode = nodes.find((n) => n.id === activeSubprocessId);
    const subprocessData = subprocessNode?.data as ProcessNodeData | undefined;

    // Add edge-based ports (existing logic)
    edges.forEach((edge) => {
      // Incoming edge (external -> subprocess) - input port
      // One port per edge (edge represents unique external source)
      if (edge.target === activeSubprocessId && (edge.originalTarget || edge.originalTargets)) {
        const externalNode = nodes.find((n) => n.id === edge.source);
        const portId = `boundary-in-${edge.id}`;

        // Get all internal targets this port connects to
        const internalTargets = edge.originalTargets || [
          { nodeId: edge.originalTarget!, handleId: edge.originalTargetHandle }
        ];

        inputPorts.push({
          id: portId,
          type: 'boundaryPort',
          position: edge.data?.boundaryPortPosition || { x: 0, y: 0 }, // Use stored position from edge data
          measured: { width: 120, height: 32 }, // Provide measured dimensions
          // Apply tracked selection state for multi-select support
          selected: boundaryPortSelectionRef.current.has(portId),
          data: {
            label: externalNode?.data?.label || 'Unknown',
            direction: 'input',
            edgeId: edge.id,
            internalNodeId: internalTargets[0].nodeId, // Primary connection (first)
            internalHandleId: internalTargets[0].handleId,
            // Store all internal connections for this port
            allInternalConnections: internalTargets,
            portId: edge.targetHandle || `port-in-${edge.id}`,
            locked: false, // Edge-based ports are not lockable (auto-generated)
          } as BoundaryPortNodeData,
        });
      }

      // Outgoing edge (subprocess -> external) - output port
      // One port per edge (edge represents unique external target)
      if (edge.source === activeSubprocessId && (edge.originalSource || edge.originalSources)) {
        const externalNode = nodes.find((n) => n.id === edge.target);
        const portId = `boundary-out-${edge.id}`;

        // Get all internal sources this port connects from
        const internalSources = edge.originalSources || [
          { nodeId: edge.originalSource!, handleId: edge.originalSourceHandle }
        ];

        outputPorts.push({
          id: portId,
          type: 'boundaryPort',
          position: edge.data?.boundaryPortOutPosition || { x: 0, y: 0 }, // Use stored position from edge data
          measured: { width: 120, height: 32 }, // Provide measured dimensions
          // Apply tracked selection state for multi-select support
          selected: boundaryPortSelectionRef.current.has(portId),
          data: {
            label: externalNode?.data?.label || 'Unknown',
            direction: 'output',
            edgeId: edge.id,
            internalNodeId: internalSources[0].nodeId, // Primary connection (first)
            internalHandleId: internalSources[0].handleId,
            // Store all internal connections for this port
            allInternalConnections: internalSources,
            portId: edge.sourceHandle || `port-out-${edge.id}`,
            locked: false, // Edge-based ports are not lockable (auto-generated)
          } as BoundaryPortNodeData,
        });
      }
    });

    // Add input ports (unified - from node's inputPorts array)
    // Skip ports that were already added as edge-based ports (match by portId in data)
    const existingInputPortIds = new Set(inputPorts.map(p => p.data.portId));
    (subprocessData?.inputPorts || []).forEach((port: Port) => {
      // Skip if this port already exists as an edge-based port (by portId)
      if (existingInputPortIds.has(port.id)) return;

      // Get internal connections from the port's stored data
      const connections = port.internalConnections || [];

      const portNodeId = `boundary-in-${port.id}`;
      inputPorts.push({
        id: portNodeId,
        type: 'boundaryPort',
        position: port.position || { x: 0, y: 0 }, // Use stored position or default
        measured: { width: 120, height: 32 },
        // Apply tracked selection state for multi-select support
        selected: boundaryPortSelectionRef.current.has(portNodeId),
        data: {
          label: port.label,
          direction: 'input',
          edgeId: `port-${port.id}`, // Use port ID as edge reference
          internalNodeId: connections[0]?.nodeId || '', // Primary connection or empty
          internalHandleId: connections[0]?.handleId || null,
          allInternalConnections: connections,
          portId: port.id,
          locked: port.locked || false,
        } as BoundaryPortNodeData,
      });
    });

    // Add output ports (unified - from node's outputPorts array)
    // Skip ports that were already added as edge-based ports (match by portId in data)
    const existingOutputPortIds = new Set(outputPorts.map(p => p.data.portId));
    (subprocessData?.outputPorts || []).forEach((port: Port) => {
      // Skip if this port already exists as an edge-based port (by portId)
      if (existingOutputPortIds.has(port.id)) return;

      // Get internal connections from the port's stored data
      const connections = port.internalConnections || [];

      const portNodeId = `boundary-out-${port.id}`;
      outputPorts.push({
        id: portNodeId,
        type: 'boundaryPort',
        position: port.position || { x: 0, y: 0 }, // Use stored position or default
        measured: { width: 120, height: 32 },
        // Apply tracked selection state for multi-select support
        selected: boundaryPortSelectionRef.current.has(portNodeId),
        data: {
          label: port.label,
          direction: 'output',
          edgeId: `port-${port.id}`, // Use port ID as edge reference
          internalNodeId: connections[0]?.nodeId || '', // Primary connection or empty
          internalHandleId: connections[0]?.handleId || null,
          allInternalConnections: connections,
          portId: port.id,
          locked: port.locked || false,
        } as BoundaryPortNodeData,
      });
    });

    return { inputs: inputPorts, outputs: outputPorts };
  }, [activeSubprocessId, edges, nodes, edgeVersion, nodeVersion, boundaryPortSelectionVersion]);

  /**
   * Filter nodes to show based on active sheet
   * - Main view (null): show all nodes NOT inside a subprocess
   * - Sheet view (ID): show only children of that subprocess + boundary port nodes
   * Nodes are sorted by zIndex to ensure proper layering
   */
  const visibleNodes = useMemo((): FlowchartNode[] => {
    // Helper to sort nodes by zIndex (ascending - lower zIndex renders first)
    const sortByZIndex = (a: FlowchartNode, b: FlowchartNode) => {
      const aZ = (a.data as { zIndex?: number }).zIndex ?? 0;
      const bZ = (b.data as { zIndex?: number }).zIndex ?? 0;
      return aZ - bZ;
    };

    if (activeSubprocessId === null) {
      // Main view: show all nodes NOT inside a subprocess
      // Create new references to force React Flow re-render when nodeVersion changes
      return (nodes
        .filter((node) => !node.data.parentId)
        .map((node) => ({ ...node, data: { ...node.data }, draggable: !node.data.locked })) as FlowchartNode[])
        .sort(sortByZIndex);
    }

    // Sheet view: show only children of this subprocess
    // Create new references to force React Flow re-render when nodeVersion changes
    const internalNodes = nodes
      .filter((node) => node.data.parentId === activeSubprocessId)
      .map((node) => ({ ...node, data: { ...node.data }, draggable: !node.data.locked })) as FlowchartNode[];

    // Get boundary port nodes
    const { inputs, outputs } = boundaryPortNodes;

    // Apply draggable property to boundary port nodes based on their locked state
    const inputPortsWithDraggable = inputs.map((port) => ({
      ...port,
      data: { ...port.data },
      draggable: !port.data.locked,
    })) as FlowchartNode[];
    const outputPortsWithDraggable = outputs.map((port) => ({
      ...port,
      data: { ...port.data },
      draggable: !port.data.locked,
    })) as FlowchartNode[];

    // Use stored custom positions for boundary port nodes (from user dragging)
    // No auto-layout - ports use their stored position from port data
    inputPortsWithDraggable.forEach((port) => {
      const storedPosition = boundaryPortPositionsRef.current.get(port.id);
      if (storedPosition) {
        port.position = storedPosition;
      }
    });

    outputPortsWithDraggable.forEach((port) => {
      const storedPosition = boundaryPortPositionsRef.current.get(port.id);
      if (storedPosition) {
        port.position = storedPosition;
      }
    });

    // Combine and sort all nodes by zIndex
    return [...inputPortsWithDraggable, ...internalNodes, ...outputPortsWithDraggable]
      .sort(sortByZIndex) as FlowchartNode[];
  }, [nodes, nodeVersion, activeSubprocessId, boundaryPortNodes]);

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
    if (activeSubprocessId) {
      // Add input edges: boundary-in-{portId} -> each internal target
      boundaryPortNodes.inputs.forEach((port) => {
        const portData = port.data as BoundaryPortNodeData;
        const connections = portData.allInternalConnections || [
          { nodeId: portData.internalNodeId, handleId: portData.internalHandleId }
        ];

        // Green for all input ports
        const baseColor = '#22C55E';

        // Create an edge to each internal connection
        connections.forEach((conn, index) => {
          // Unified edge ID format: boundary-edge-in-{portId}-{index}
          const edgeId = index === 0
            ? `boundary-edge-in-${portData.portId}`
            : `boundary-edge-in-${portData.portId}-${index}`;

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
              portId: portData.portId,
              subprocessId: activeSubprocessId,
              controlPoints: conn.controlPoints, // Include control points for boundary edges
              isEdgeBased: !portData.edgeId?.startsWith('port-'), // True for edge-based ports, false for manual ports
            },
          } as FlowchartEdge);
        });
      });

      // Add output edges: each internal source -> boundary-out-{portId}
      boundaryPortNodes.outputs.forEach((port) => {
        const portData = port.data as BoundaryPortNodeData;
        const connections = portData.allInternalConnections || [
          { nodeId: portData.internalNodeId, handleId: portData.internalHandleId }
        ];

        // Blue for all output ports
        const baseColor = '#3B82F6';

        // Create an edge from each internal connection
        connections.forEach((conn, index) => {
          // Unified edge ID format: boundary-edge-out-{portId}-{index}
          const edgeId = index === 0
            ? `boundary-edge-out-${portData.portId}`
            : `boundary-edge-out-${portData.portId}-${index}`;

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
              portId: portData.portId,
              subprocessId: activeSubprocessId,
              controlPoints: conn.controlPoints, // Include control points for boundary edges
              isEdgeBased: !portData.edgeId?.startsWith('port-'), // True for edge-based ports, false for manual ports
            },
          } as FlowchartEdge);
        });
      });
    }

    return result;
  }, [edges, edgeVersion, visibleNodes, activeSubprocessId, boundaryPortNodes, defaultEdgeType, readOnly, virtualEdgeVersion]);

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
          multiSelectionKeyCode="Control"
          selectionOnDrag={cursorMode === 'select'}
          panOnDrag={cursorMode === 'pan' ? true : [1, 2]} // Pan with left click in pan mode, or middle/right click in select mode
          panOnScroll={cursorMode === 'pan'}
          selectionMode={SelectionMode.Partial}
          nodesDraggable={!readOnly && cursorMode === 'select'}
          nodesConnectable={!readOnly && cursorMode === 'select'}
          elementsSelectable={!readOnly && cursorMode === 'select'}
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
              {activeSubprocessId && (
                <span className="ml-2 text-purple-600">| Sheet view</span>
              )}
            </div>
          </Panel>

          {/* Input/Output Labels for sheet view */}
          {activeSubprocessId && (visibleNodes.some(n => n.type === 'boundaryPort')) && (
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
                  <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-700 font-mono">Ctrl</kbd>
                  {' '}+ Click to multi-select
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
          referenceableNode={contextMenuState.referenceableNode}
          hasLockedNodes={contextMenuState.hasLockedNodes}
          hasUnlockedNodes={contextMenuState.hasUnlockedNodes}
          hasClipboardContent={contextMenuState.hasClipboardContent}
          onLockBoundaryPorts={handleLockBoundaryPorts}
          onUnlockBoundaryPorts={handleUnlockBoundaryPorts}
        />
      </div>

      {/* Sheet Bar at bottom */}
      <SheetBar
        activeSubprocessId={activeSubprocessId}
        sheets={sheets}
        onSheetSelect={handleSheetSelect}
        onSheetClose={closeActiveSubprocess}
        subprocessNavigationStack={subprocessNavigationStack}
        subprocessLabels={subprocessLabels}
        onNavigateToSubprocess={navigateToSubprocess}
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
