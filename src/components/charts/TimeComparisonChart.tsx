import React from 'react';
import { useScenarios } from '../../stores/scenarioStore';
import { useCalculationStore, useAllScenarioResults } from '../../stores/calculationStore';

// ============================================================================
// Types
// ============================================================================

interface TimeComparisonChartProps {
  className?: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatHours(minutes: number): string {
  if (minutes === 0) return '0h';
  const hours = minutes / 60;
  if (hours < 8) return `${hours.toFixed(1)}h`;
  const days = Math.floor(hours / 8);
  const remainingHours = hours % 8;
  if (remainingHours === 0) return `${days}d`;
  return `${days}d ${remainingHours.toFixed(1)}h`;
}

// ============================================================================
// Component
// ============================================================================

export const TimeComparisonChart: React.FC<TimeComparisonChartProps> = ({
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
          <path d="M3 3v18h18" />
          <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
        </svg>
        <p className="text-sm font-medium">No scenarios available</p>
        <p className="text-xs text-gray-400">Create scenarios to see time comparison</p>
      </div>
    );
  }

  // Calculate max time for scaling
  const maxTime = Math.max(
    ...scenarios.map((s) => allResults.get(s.id)?.totalMinutes || 0),
    1
  );

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Time Comparison</h3>

      <div className="space-y-4">
        {scenarios.map((scenario) => {
          const results = allResults.get(scenario.id);
          const totalMinutes = results?.totalMinutes || 0;
          const percentage = (totalMinutes / maxTime) * 100;

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
                  {formatHours(totalMinutes)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: scenario.color,
                    minWidth: totalMinutes > 0 ? '4px' : '0',
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

export default TimeComparisonChart;
