import React from 'react';
import { useScenarios } from '../../stores/scenarioStore';
import { useAllScenarioResults } from '../../stores/calculationStore';

// ============================================================================
// Types
// ============================================================================

interface FTERequirementsChartProps {
  className?: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatFTE(fte: number): string {
  if (fte === 0) return '0 FTE';
  if (fte < 1) return `${fte.toFixed(2)} FTE`;
  return `${fte.toFixed(1)} FTE`;
}

// ============================================================================
// Component
// ============================================================================

export const FTERequirementsChart: React.FC<FTERequirementsChartProps> = ({
  className = '',
}) => {
  const scenarios = useScenarios();
  const allResults = useAllScenarioResults();

  if (scenarios.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-64 text-gray-500 ${className}`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mb-2 text-gray-300"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <p className="text-sm font-medium">No scenarios available</p>
        <p className="text-xs text-gray-400">Create scenarios to see FTE requirements</p>
      </div>
    );
  }

  // Calculate max FTE for scaling
  const maxFTE = Math.max(
    ...scenarios.map((s) => allResults.get(s.id)?.totalFTE || 0),
    0.1
  );

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">FTE Requirements</h3>

      <div className="space-y-4">
        {scenarios.map((scenario) => {
          const results = allResults.get(scenario.id);
          const totalFTE = results?.totalFTE || 0;
          const percentage = (totalFTE / maxFTE) * 100;

          return (
            <div key={scenario.id} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: scenario.color }}
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {scenario.name}
                  </span>
                  {scenario.isBaseline && (
                    <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                      Baseline
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-500">
                  {formatFTE(totalFTE)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: scenario.color,
                    minWidth: totalFTE > 0 ? '4px' : '0',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FTERequirementsChart;
