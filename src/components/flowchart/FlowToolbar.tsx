import React, { useState, useCallback, useRef, useMemo } from 'react';
import { useReactFlow, useStore } from '@xyflow/react';
import { Button } from '../common/Button';
import { Modal, ModalFooter, ModalBody } from '../common/Modal';
import { useFlowchartStore, useHasActiveFilters, useIsFilterPanelOpen, useFilterMode, useNodes, useEdges } from '../../stores/flowchartStore';
import { useFlowchartFilterConfig, useSetFlowchartFilterConfig, useClearFlowchartFilter } from '../../stores/filterStore';
import { getAllFlowcharts, deleteFlowchart } from '../../db/database';
import type { FlowchartRecord } from '../../db/database';
import type { FlowchartNode, FlowchartEdge } from '../../types';
import AdvancedFilter from './AdvancedFilter';
import { RuleBasedFilter } from '../filter/RuleBasedFilter';

// =============================================================================
// Types
// =============================================================================

interface FlowToolbarProps {
  showGrid: boolean;
  showMinimap: boolean;
  onToggleGrid: () => void;
  onToggleMinimap: () => void;
  onFitView?: () => void;
}

interface ExportedFlowchart {
  name: string;
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
  exportedAt: string;
  version: string;
}

// =============================================================================
// Icon Components
// =============================================================================

const SaveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
    <polyline points="17 21 17 13 7 13 7 21" />
    <polyline points="7 3 7 8 15 8" />
  </svg>
);

const NewIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="18" x2="12" y2="12" />
    <line x1="9" y1="15" x2="15" y2="15" />
  </svg>
);

const OpenIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const ExportIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const ImportIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const ZoomInIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="11" y1="8" x2="11" y2="14" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const ZoomOutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
    <line x1="8" y1="11" x2="14" y2="11" />
  </svg>
);

const FitViewIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
  </svg>
);

const UndoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
  </svg>
);

const RedoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 7v6h-6" />
    <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7" />
  </svg>
);

const GridIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <line x1="3" y1="9" x2="21" y2="9" />
    <line x1="3" y1="15" x2="21" y2="15" />
    <line x1="9" y1="3" x2="9" y2="21" />
    <line x1="15" y1="3" x2="15" y2="21" />
  </svg>
);

const MinimapIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const GroupIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
  </svg>
);

const UngroupIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" />
    <line x1="10" y1="3" x2="14" y2="3" strokeDasharray="2 2" />
    <line x1="10" y1="21" x2="14" y2="21" strokeDasharray="2 2" />
  </svg>
);

const ReferenceIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="8" />
    <text x="12" y="16" textAnchor="middle" fontSize="10" fill="currentColor" fontWeight="bold" stroke="none">1</text>
  </svg>
);

const FilterIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

// =============================================================================
// Component
// =============================================================================

export const FlowToolbar: React.FC<FlowToolbarProps> = ({
  showGrid,
  showMinimap,
  onToggleGrid,
  onToggleMinimap,
  onFitView,
}) => {
  const { getZoom, zoomIn, zoomOut, fitView } = useReactFlow();
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isSaveLoading, setIsSaveLoading] = useState(false);
  const [isOpenModalOpen, setIsOpenModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [savedFlowcharts, setSavedFlowcharts] = useState<FlowchartRecord[]>([]);
  const [isLoadingFlowcharts, setIsLoadingFlowcharts] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  const isFilterPanelOpen = useIsFilterPanelOpen();
  const hasSimpleFilters = useHasActiveFilters();
  const setFilterPanelOpen = useFlowchartStore((state) => state.setFilterPanelOpen);
  const filterMode = useFilterMode();
  const setFilterMode = useFlowchartStore((state) => state.setFilterMode);
  const flowchartFilterConfig = useFlowchartFilterConfig();
  const setFlowchartFilterConfig = useSetFlowchartFilterConfig();
  const clearFlowchartFilter = useClearFlowchartFilter();

  // Check if advanced filter has active rules
  const hasAdvancedFilters = useMemo(() => {
    if (!flowchartFilterConfig) return false;
    const countRulesInGroup = (group: typeof flowchartFilterConfig.rootGroup): number => {
      let count = 0;
      for (const rule of group.rules) {
        if ('field' in rule) {
          count += 1;
        } else {
          count += countRulesInGroup(rule);
        }
      }
      return count;
    };
    return countRulesInGroup(flowchartFilterConfig.rootGroup) > 0;
  }, [flowchartFilterConfig]);

  // Combined active filter state based on mode
  const hasActiveFilters = filterMode === 'advanced' ? hasAdvancedFilters : hasSimpleFilters;

  const {
    flowchartName,
    flowchartId,
    isDirty,
    saveFlowchart,
    newFlowchart,
    loadFlowchart,
    setNodes,
    setEdges,
    groupNodesIntoSubprocess,
    ungroupSubprocess,
    createReferenceToNode,
  } = useFlowchartStore();

  // Get nodes and edges from active sheet using hooks
  const nodes = useNodes();
  const edges = useEdges();

  // Update zoom level when canvas zoom changes
  const updateZoomLevel = useCallback(() => {
    const zoom = getZoom();
    setZoomLevel(Math.round(zoom * 100));
  }, [getZoom]);

  const handleZoomIn = useCallback(() => {
    zoomIn();
    setTimeout(updateZoomLevel, 100);
  }, [zoomIn, updateZoomLevel]);

  const handleZoomOut = useCallback(() => {
    zoomOut();
    setTimeout(updateZoomLevel, 100);
  }, [zoomOut, updateZoomLevel]);

  const handleSave = useCallback(async () => {
    setIsSaveLoading(true);
    try {
      await saveFlowchart();
    } finally {
      setIsSaveLoading(false);
    }
  }, [saveFlowchart]);

  const handleNew = useCallback(() => {
    if (isDirty) {
      const confirm = window.confirm('You have unsaved changes. Create a new flowchart anyway?');
      if (!confirm) return;
    }
    newFlowchart();
  }, [isDirty, newFlowchart]);

  const handleOpen = useCallback(async () => {
    setIsLoadingFlowcharts(true);
    try {
      const flowcharts = await getAllFlowcharts();
      setSavedFlowcharts(flowcharts);
      setIsOpenModalOpen(true);
    } finally {
      setIsLoadingFlowcharts(false);
    }
  }, []);

  const handleLoadFlowchart = useCallback(async (id: string) => {
    if (isDirty) {
      const confirm = window.confirm('You have unsaved changes. Load another flowchart anyway?');
      if (!confirm) return;
    }
    const success = await loadFlowchart(id);
    if (success) {
      setIsOpenModalOpen(false);
    }
  }, [isDirty, loadFlowchart]);

  const handleDeleteFlowchart = useCallback(async (id: string, name: string) => {
    const confirm = window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`);
    if (!confirm) return;

    await deleteFlowchart(id);
    setSavedFlowcharts((prev) => prev.filter((f) => f.id !== id));

    // If the deleted flowchart was the current one, create a new one
    if (id === flowchartId) {
      newFlowchart();
    }
  }, [flowchartId, newFlowchart]);

  const handleExportPNG = useCallback(() => {
    // Get the canvas element
    const canvas = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!canvas) return;

    // Use html2canvas or similar library would be ideal here
    // For now, we'll export as a data URL from the SVG
    const svgElement = document.querySelector('.react-flow__renderer svg') as SVGElement;
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${flowchartName.replace(/[^a-z0-9]/gi, '_')}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsExportMenuOpen(false);
  }, [flowchartName]);

  const handleExportJSON = useCallback(() => {
    const exportData: ExportedFlowchart = {
      name: flowchartName,
      nodes: nodes as FlowchartNode[],
      edges: edges as FlowchartEdge[],
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${flowchartName.replace(/[^a-z0-9]/gi, '_')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setIsExportMenuOpen(false);
  }, [flowchartName, nodes, edges]);

  const handleImportJSON = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content) as ExportedFlowchart;

        if (!data.nodes || !data.edges) {
          throw new Error('Invalid flowchart file format');
        }

        if (isDirty) {
          const confirm = window.confirm('You have unsaved changes. Import anyway?');
          if (!confirm) return;
        }

        setNodes(data.nodes as FlowchartNode[]);
        setEdges(data.edges as FlowchartEdge[]);

        // Update flowchart name if provided
        if (data.name) {
          useFlowchartStore.getState().newFlowchart(data.name);
          setNodes(data.nodes as FlowchartNode[]);
          setEdges(data.edges as FlowchartEdge[]);
        }
      } catch (error) {
        alert('Failed to import flowchart: Invalid file format');
        console.error('Import error:', error);
      }
    };
    reader.readAsText(file);

    // Reset the input so the same file can be imported again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [isDirty, setNodes, setEdges]);

  // Subscribe to node selection changes - this will trigger re-renders
  const selectedNodeIds = useStore((state) => {
    const nodes = state.nodes as FlowchartNode[];
    return nodes.filter((n) => n.selected).map((n) => n.id);
  });

  // Handle grouping selected nodes
  const handleGroupNodes = useCallback(() => {
    if (selectedNodeIds.length >= 2) {
      groupNodesIntoSubprocess(selectedNodeIds);
    }
  }, [selectedNodeIds, groupNodesIntoSubprocess]);

  // Handle ungrouping selected subprocess
  const handleUngroupNodes = useCallback(() => {
    if (selectedNodeIds.length === 1) {
      const selectedNode = nodes.find(n => n.id === selectedNodeIds[0]);
      if (selectedNode?.type === 'subprocess') {
        ungroupSubprocess(selectedNodeIds[0]);
      }
    }
  }, [selectedNodeIds, ungroupSubprocess, nodes]);

  // Handle creating reference to selected node
  const handleCreateReference = useCallback(() => {
    if (selectedNodeIds.length === 1) {
      const selectedNode = nodes.find(n => n.id === selectedNodeIds[0]);
      // Can create reference to any node except reference nodes and boundary ports
      if (selectedNode && selectedNode.type !== 'reference' && selectedNode.type !== 'boundaryPort') {
        createReferenceToNode(selectedNodeIds[0]);
      }
    }
  }, [selectedNodeIds, createReferenceToNode, nodes]);

  // Calculate if grouping/ungrouping is possible
  const selectedNodes = useMemo(() => {
    return nodes.filter(n => selectedNodeIds.includes(n.id));
  }, [nodes, selectedNodeIds]);

  const canGroup = selectedNodes.length >= 2 &&
    !selectedNodes.some(n => n.type === 'start' || n.type === 'end') &&
    !selectedNodes.some(n => n.data.parentId) &&
    !selectedNodes.some(n => n.type === 'subprocess');
  const canUngroup = selectedNodes.length === 1 && selectedNodes[0]?.type === 'subprocess';
  const canCreateReference = selectedNodes.length === 1 &&
    selectedNodes[0]?.type !== 'reference' &&
    selectedNodes[0]?.type !== 'boundaryPort';

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 bg-white border-b border-gray-200 shadow-sm">
      {/* Left Section - Flowchart Name & File Actions */}
      <div className="flex items-center gap-4 flex-wrap">
        {/* Flowchart Name */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={flowchartName}
            onChange={(e) => {
              useFlowchartStore.setState({ flowchartName: e.target.value });
              useFlowchartStore.getState().markDirty();
            }}
            className="text-lg font-semibold text-gray-800 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary-500 focus:outline-none px-1 py-0.5 min-w-[150px] max-w-[250px]"
            placeholder="Flowchart Name"
          />
          {isDirty && (
            <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
              Unsaved
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-200" />

        {/* File Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            isLoading={isSaveLoading}
            leftIcon={<SaveIcon />}
          >
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleNew}
            leftIcon={<NewIcon />}
            title="New Flowchart"
          >
            New
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpen}
            leftIcon={<OpenIcon />}
            title="Open Flowchart"
          >
            Open
          </Button>

          {/* Export Dropdown */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              leftIcon={<ExportIcon />}
              title="Export Flowchart"
            >
              Export
            </Button>
            {isExportMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsExportMenuOpen(false)}
                />
                <div className="absolute left-0 mt-1 w-40 bg-white rounded-md shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    onClick={handleExportPNG}
                  >
                    Export as SVG
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    onClick={handleExportJSON}
                  >
                    Export as JSON
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportJSON}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            leftIcon={<ImportIcon />}
            title="Import Flowchart"
          >
            Import
          </Button>
        </div>
      </div>

      {/* Center Section - Zoom Controls & Edit Tools */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Group/Ungroup Buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGroupNodes}
            disabled={!canGroup}
            leftIcon={<GroupIcon />}
            title={canGroup ? 'Group selected nodes into Subprocess (Ctrl+G)' : 'Select 2+ nodes to group'}
          >
            Group
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUngroupNodes}
            disabled={!canUngroup}
            leftIcon={<UngroupIcon />}
            title={canUngroup ? 'Ungroup subprocess' : 'Select a subprocess to ungroup'}
          >
            Ungroup
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCreateReference}
            disabled={!canCreateReference}
            leftIcon={<ReferenceIcon />}
            title={canCreateReference ? 'Create reference to selected node' : 'Select a node to create reference'}
          >
            Reference
          </Button>
        </div>

        <div className="h-4 w-px bg-gray-200 mx-1" />

        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomOut}
          title="Zoom Out"
          className="!p-1.5"
        >
          <ZoomOutIcon />
        </Button>
        <span className="text-sm font-medium text-gray-600 min-w-[50px] text-center">
          {zoomLevel}%
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleZoomIn}
          title="Zoom In"
          className="!p-1.5"
        >
          <ZoomInIcon />
        </Button>
        <div className="h-4 w-px bg-gray-200 mx-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFitView ? onFitView() : fitView()}
          leftIcon={<FitViewIcon />}
          title="Fit to Screen"
        >
          Fit
        </Button>
      </div>

      {/* Right Section - Undo/Redo & View Toggles */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Undo/Redo (Placeholder) */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            disabled
            onClick={() => {}}
            title="Undo (Coming Soon)"
            className="!p-1.5 opacity-50"
          >
            <UndoIcon />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled
            onClick={() => {}}
            title="Redo (Coming Soon)"
            className="!p-1.5 opacity-50"
          >
            <RedoIcon />
          </Button>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-200" />

        {/* View Toggles */}
        <div className="flex items-center gap-1">
          <Button
            variant={showGrid ? 'secondary' : 'ghost'}
            size="sm"
            onClick={onToggleGrid}
            title={showGrid ? 'Hide Grid' : 'Show Grid'}
            className="!p-1.5"
          >
            <GridIcon />
          </Button>
          <Button
            variant={showMinimap ? 'secondary' : 'ghost'}
            size="sm"
            onClick={onToggleMinimap}
            title={showMinimap ? 'Hide Minimap' : 'Show Minimap'}
            className="!p-1.5"
          >
            <MinimapIcon />
          </Button>
        </div>

        {/* Divider */}
        <div className="h-6 w-px bg-gray-200" />

        {/* Filter Button */}
        <div className="relative">
          <Button
            ref={filterButtonRef}
            variant={hasActiveFilters ? 'primary' : isFilterPanelOpen ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setFilterPanelOpen(!isFilterPanelOpen)}
            title="Filter Nodes"
            className="!px-2.5"
          >
            <FilterIcon />
            {hasActiveFilters && (
              <span className="ml-1 text-xs font-bold">
                Active
              </span>
            )}
          </Button>
          {isFilterPanelOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setFilterPanelOpen(false)}
              />
              <div
                ref={filterPanelRef}
                className="absolute right-0 mt-2 z-20"
              >
                {/* Filter Mode Toggle */}
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 mb-0 p-1 flex gap-1">
                  <button
                    onClick={() => setFilterMode('simple')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      filterMode === 'simple'
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Simple
                  </button>
                  <button
                    onClick={() => setFilterMode('advanced')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                      filterMode === 'advanced'
                        ? 'bg-primary-100 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    Advanced
                  </button>
                </div>

                {/* Filter Panel */}
                {filterMode === 'simple' ? (
                  <AdvancedFilter />
                ) : (
                  <RuleBasedFilter
                    config={flowchartFilterConfig}
                    onConfigChange={setFlowchartFilterConfig}
                    onClear={clearFlowchartFilter}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Open Flowchart Modal */}
      <Modal
        open={isOpenModalOpen}
        onOpenChange={setIsOpenModalOpen}
        title="Open Flowchart"
        description="Select a flowchart to open from your saved flowcharts."
        size="lg"
      >
        <ModalBody>
          {isLoadingFlowcharts ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : savedFlowcharts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No saved flowcharts found.</p>
              <p className="text-sm mt-1">Create a new flowchart and save it to see it here.</p>
            </div>
          ) : (
            <div className="max-h-[400px] overflow-y-auto">
              <ul className="divide-y divide-gray-200">
                {savedFlowcharts.map((flowchart) => (
                  <li
                    key={flowchart.id}
                    className={`flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg ${
                      flowchart.id === flowchartId ? 'bg-primary-50 border border-primary-200' : ''
                    }`}
                  >
                    <button
                      className="flex-1 text-left"
                      onClick={() => handleLoadFlowchart(flowchart.id)}
                    >
                      <div className="font-medium text-gray-900">{flowchart.name}</div>
                      <div className="text-sm text-gray-500">
                        Last modified: {new Date(flowchart.updatedAt).toLocaleDateString()} at{' '}
                        {new Date(flowchart.updatedAt).toLocaleTimeString()}
                      </div>
                    </button>
                    <div className="flex items-center gap-2 ml-4">
                      {flowchart.id === flowchartId && (
                        <span className="text-xs text-primary-600 bg-primary-100 px-2 py-0.5 rounded">
                          Current
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteFlowchart(flowchart.id, flowchart.name)}
                        className="!p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50"
                        title="Delete Flowchart"
                      >
                        <TrashIcon />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setIsOpenModalOpen(false)}>
            Cancel
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default FlowToolbar;
