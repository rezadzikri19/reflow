import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { Scenario, NodeResult } from '../../types';

// ============================================================================
// Types
// ============================================================================

export interface TimeDistributionChartProps {
  /** Array of scenarios to display */
  scenarios: Scenario[];
  /** Optional height for the chart */
  height?: number;
  /** Optional class name for additional styling */
  className?: string;
}

interface ChartDataItem {
  nodeLabel: string;
  nodeId: string;
  [scenarioId: string]: string | number;
}

interface TooltipPayload {
  name: string;
  value: number;
  dataKey: string;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
];

const CHART_MARGIN = { top: 20, right: 30, left: 20, bottom: 60 };

// ============================================================================
// Component
// ============================================================================

/**
 * Custom tooltip component for the Time Distribution Chart
 */
const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-medium text-gray-800">
            {entry.value.toFixed(2)} hours
          </span>
        </div>
      ))}
    </div>
  );
};

/**
 * TimeDistributionChart - Bar chart showing time distribution across process nodes
 *
 * Features:
 * - X-axis: Process node names
 * - Y-axis: Time (hours)
 * - Grouped bars for different scenarios
 * - Interactive tooltip with details
 */
export const TimeDistributionChart: React.FC<TimeDistributionChartProps> = ({
  scenarios,
  height = 400,
  className = '',
}) => {
  // Transform scenarios data into chart-compatible format
  const chartData = React.useMemo(() => {
    if (!scenarios.length || !scenarios[0].results?.nodeResults) {
      return [];
    }

    // Get all unique node labels across scenarios
    const nodeMap = new Map<string, ChartDataItem>();

    scenarios.forEach((scenario) => {
      if (!scenario.results?.nodeResults) return;

      scenario.results.nodeResults.forEach((nodeResult: NodeResult) => {
        if (!nodeMap.has(nodeResult.nodeId)) {
          nodeMap.set(nodeResult.nodeId, {
            nodeLabel: nodeResult.nodeLabel,
            nodeId: nodeResult.nodeId,
          });
        }
        const item = nodeMap.get(nodeResult.nodeId)!;
        item[scenario.id] = nodeResult.totalHours;
      });
    });

    return Array.from(nodeMap.values());
  }, [scenarios]);

  // Get bar definitions for each scenario
  const bars = React.useMemo(() => {
    return scenarios.map((scenario, index) => ({
      dataKey: scenario.id,
      name: scenario.name,
      color: scenario.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    }));
  }, [scenarios]);

  // Format Y-axis tick values
  const formatYAxisTick = (value: number): string => {
    if (value >= 24) {
      return `${(value / 24).toFixed(1)}d`;
    }
    return `${value.toFixed(1)}h`;
  };

  if (!chartData.length) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-50 rounded-lg ${className}`}
        style={{ height }}
      >
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="nodeLabel"
            angle={-45}
            textAnchor="end"
            interval={0}
            tick={{ fontSize: 12, fill: '#6B7280' }}
            tickLine={{ stroke: '#9CA3AF' }}
            axisLine={{ stroke: '#9CA3AF' }}
            height={80}
          />
          <YAxis
            tickFormatter={formatYAxisTick}
            tick={{ fontSize: 12, fill: '#6B7280' }}
            tickLine={{ stroke: '#9CA3AF' }}
            axisLine={{ stroke: '#9CA3AF' }}
            label={{
              value: 'Time (hours)',
              angle: -90,
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: '#6B7280', fontSize: 12 },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: 20 }}
            formatter={(value) => (
              <span className="text-gray-700 text-sm">{value}</span>
            )}
          />
          {bars.map((bar) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              name={bar.name}
              fill={bar.color}
              radius={[4, 4, 0, 0]}
              maxBarSize={60}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TimeDistributionChart;
