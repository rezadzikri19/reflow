import React, { useState, useMemo } from 'react';
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

// Scenario components
import {
  ScenarioList,
  QuantityInputTable,
  TagFilter,
} from './components/scenarios';

// Chart components
import {
  TimeDistributionChart,
  TimeProportionChart,
  ProcessTimelineChart,
} from './components/charts';

// Stores
import { useFlowchartStore, useNodes, useShowGrid, useShowMinimap } from './stores/flowchartStore';
import { useScenarios, useActiveScenario } from './stores/scenarioStore';

// ============================================================================
// Types
// ============================================================================

type ViewType = 'flowchart' | 'scenarios' | 'reports';

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
    id: 'scenarios',
    label: 'Scenarios',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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

  // Check if any edge is selected (using store's selectedEdgeId which tracks both regular and virtual edges)
  const selectedEdge = selectedEdgeId;

  return (
    <ReactFlowProvider>
      <div className="flex h-full">
        {/* Left Panel - Node Palette */}
        <div className="w-64 border-r border-gray-200 bg-gray-50 overflow-y-auto">
          <NodePalette />
        </div>

        {/* Center - Flow Canvas */}
        <div className="flex-1 flex flex-col">
          <FlowToolbar
            showGrid={showGrid}
            showMinimap={showMinimap}
            onToggleGrid={toggleGrid}
            onToggleMinimap={toggleMinimap}
          />
          <div className="flex-1">
            <FlowCanvas showGrid={showGrid} showMinimap={showMinimap} />
          </div>
        </div>

        {/* Right Panel - Properties (Node or Edge) */}
        <div className="w-80 border-l border-gray-200 bg-white overflow-y-auto">
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
// Scenarios View Component
// ============================================================================

const ScenariosView: React.FC = () => {
  const nodes = useNodes();
  const [selectedFilterTags, setSelectedFilterTags] = useState<string[]>([]);

  // Derive available tags from all nodes
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    nodes.forEach((node) => {
      const nodeTags = (node.data as { tags?: string[] }).tags || [];
      nodeTags.forEach((tag: string) => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [nodes]);

  return (
    <div className="flex h-full">
      {/* Left Panel - Scenario List */}
      <div className="w-72 border-r border-gray-200 bg-gray-50 overflow-y-auto p-4">
        <ScenarioList />
      </div>

      {/* Center - Quantity Input Table */}
      <div className="flex-1 p-6 overflow-auto">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Quantity Configuration
        </h2>
        <TagFilter
          availableTags={availableTags}
          selectedTags={selectedFilterTags}
          onSelectionChange={setSelectedFilterTags}
        />
        <QuantityInputTable filterTags={selectedFilterTags} />
      </div>
    </div>
  );
};

// ============================================================================
// Reports View Component
// ============================================================================

const ReportsView: React.FC = () => {
  const scenarios = useScenarios();
  const activeScenario = useActiveScenario();

  const scenariosWithResults = scenarios.filter((s) => s.results);

  return (
    <div className="h-full overflow-auto p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        Reports & Analytics
      </h2>

      {scenariosWithResults.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 bg-gray-50 rounded-lg">
          <svg
            className="w-16 h-16 text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <p className="text-gray-500 text-lg">
            No scenario data available for reports
          </p>
          <p className="text-gray-400 text-sm mt-2">
            Create scenarios and add quantities to generate reports
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Time Distribution Chart */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Time Distribution by Process
            </h3>
            <TimeDistributionChart scenarios={scenariosWithResults} height={350} />
          </div>

          {/* Two-column layout for smaller charts */}
          <div className="grid grid-cols-2 gap-6">
            {/* Time Proportion Chart */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Time Proportion
              </h3>
              {activeScenario && activeScenario.results ? (
                <TimeProportionChart scenario={activeScenario} height={300} />
              ) : (
                <div className="flex items-center justify-center h-72 bg-gray-50 rounded">
                  <p className="text-gray-500">Select a scenario to view proportions</p>
                </div>
              )}
            </div>

            {/* Process Timeline Chart */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              {activeScenario && activeScenario.results ? (
                <ProcessTimelineChart scenario={activeScenario} height={350} />
              ) : (
                <div className="flex items-center justify-center h-72 bg-gray-50 rounded">
                  <p className="text-gray-500">Select a scenario to view timeline</p>
                </div>
              )}
            </div>
          </div>

          {/* Summary Stats */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Scenario Summary
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">
                      Scenario
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">
                      Total Time
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">
                      Total Hours
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">
                      Total Days
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">
                      FTE Required
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {scenariosWithResults.map((scenario) => (
                    <tr
                      key={scenario.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: scenario.color || '#3B82F6' }}
                          />
                          <span className="font-medium text-gray-800">
                            {scenario.name}
                          </span>
                          {scenario.isBaseline && (
                            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded">
                              Baseline
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 text-gray-600">
                        {(scenario.results?.totalMinutes || 0).toLocaleString()} min
                      </td>
                      <td className="text-right py-3 px-4 text-gray-600">
                        {(scenario.results?.totalHours || 0).toFixed(1)} hrs
                      </td>
                      <td className="text-right py-3 px-4 text-gray-600">
                        {(scenario.results?.totalDays || 0).toFixed(2)} days
                      </td>
                      <td className="text-right py-3 px-4 text-gray-600">
                        {(scenario.results?.fteRequired || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Main App Component
// ============================================================================

function App() {
  const [activeView, setActiveView] = useState<ViewType>('flowchart');

  const { flowchartName } = useFlowchartStore();

  const renderView = () => {
    switch (activeView) {
      case 'flowchart':
        return <FlowchartView />;
      case 'scenarios':
        return <ScenariosView />;
      case 'reports':
        return <ReportsView />;
      default:
        return null;
    }
  };

  const header = (
    <div className="h-full px-4 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <h1 className="text-lg font-semibold text-gray-900">
          {flowchartName || 'Process Flowchart Tool'}
        </h1>
        <NavTabs activeView={activeView} onViewChange={setActiveView} />
      </div>
    </div>
  );

  return (
    <ReactFlowProvider>
      <Layout header={header}>
        <div className="h-[calc(100vh-4rem)]">
          {renderView()}
        </div>
      </Layout>
    </ReactFlowProvider>
  );
}

export default App;
