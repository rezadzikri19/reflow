import React, { useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// Common components
import { Layout } from './components/common';

// Flowchart components
import {
  FlowCanvas,
  FlowToolbar,
  NodePalette,
  NodePropertiesPanel,
  EdgePropertiesPanel,
} from './components/flowchart';

// List View components
import { ListView } from './components/listview';

// Stores
import { useFlowchartStore, useShowGrid, useShowMinimap } from './stores/flowchartStore';

// Hooks
import { useAutoSave } from './hooks/useAutoSave';

// Context
import { FlowOrderProvider } from './contexts/FlowOrderContext';

// ============================================================================
// Types
// ============================================================================

type ViewType = 'flowchart' | 'list';

interface NavItem {
  id: ViewType;
  label: string;
  icon: React.ReactNode;
}

// ============================================================================
// Constants
// ============================================================================

const NAV_ITEMS: NavItem[] = [
  {
    id: 'flowchart',
    label: 'Flowchart',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
  },
  {
    id: 'list',
    label: 'List',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
];

// ============================================================================
// Navigation Tabs Component
// ============================================================================

interface NavTabsProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
}

const NavTabs: React.FC<NavTabsProps> = ({ activeView, onViewChange }) => {
  return (
    <nav className="flex items-center gap-1">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => onViewChange(item.id)}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
            transition-colors duration-150
            ${activeView === item.id
              ? 'bg-primary-100 text-primary-700'
              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }
          `}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

// ============================================================================
// Flowchart View Component
// ============================================================================

const FlowchartView: React.FC = () => {
  const showGrid = useShowGrid();
  const showMinimap = useShowMinimap();
  const toggleGrid = useFlowchartStore((state) => state.toggleGrid);
  const toggleMinimap = useFlowchartStore((state) => state.toggleMinimap);
  const selectedEdgeId = useFlowchartStore((state) => state.selectedEdgeId);

  // Initialize auto-save hook
  useAutoSave();

  // Check if any edge is selected (using store's selectedEdgeId which tracks both regular and virtual edges)
  const selectedEdge = selectedEdgeId;

  return (
    <ReactFlowProvider>
      <div className="flex h-full">
        {/* Left Panel - Node Palette - Fixed width, scrollable */}
        <div className="w-64 shrink-0 border-r border-gray-200 bg-gray-50 overflow-y-auto">
          <NodePalette />
        </div>

        {/* Center - Flow Canvas - Flexible width */}
        <div className="flex-1 min-w-0 flex flex-col">
          <FlowToolbar
            showGrid={showGrid}
            showMinimap={showMinimap}
            onToggleGrid={toggleGrid}
            onToggleMinimap={toggleMinimap}
          />
          <div className="flex-1 min-w-0">
            <FlowCanvas showGrid={showGrid} showMinimap={showMinimap} />
          </div>
        </div>

        {/* Right Panel - Properties - Fixed width, scrollable */}
        <div className="w-80 shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
          {selectedEdge ? (
            <EdgePropertiesPanel />
          ) : (
            <NodePropertiesPanel />
          )}
        </div>
      </div>
    </ReactFlowProvider>
  );
};

// ============================================================================
// Main App Component
// ============================================================================

function App() {
  const [activeView, setActiveView] = useState<ViewType>('flowchart');

  const nodes = useFlowchartStore((state) => state.nodes);
  const edges = useFlowchartStore((state) => state.edges);

  // Listen for navigation events from ListView
  React.useEffect(() => {
    const handleNavigateToFlowchart = () => {
      setActiveView('flowchart');
    };

    window.addEventListener('navigateToFlowchart', handleNavigateToFlowchart);
    return () => {
      window.removeEventListener('navigateToFlowchart', handleNavigateToFlowchart);
    };
  }, []);

  const renderView = () => {
    switch (activeView) {
      case 'flowchart':
        return <FlowchartView />;
      case 'list':
        return <ListView />;
      default:
        return null;
    }
  };

  const header = (
    <div className="h-full px-4 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <h1 className="text-lg font-semibold text-gray-900">
          Reflow
        </h1>
        <NavTabs activeView={activeView} onViewChange={setActiveView} />
      </div>
    </div>
  );

  return (
    <ReactFlowProvider>
      <FlowOrderProvider nodes={nodes} edges={edges}>
        <Layout header={header}>
          <div className="h-full overflow-hidden">
            {renderView()}
          </div>
        </Layout>
      </FlowOrderProvider>
    </ReactFlowProvider>
  );
}

export default App;
