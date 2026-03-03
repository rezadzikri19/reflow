import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { Scenario, NodeResult } from '../../types';

// ============================================================================
// Types
// ============================================================================

export interface TimeProportionChartProps {
  /** Scenario to display */
  scenario: Scenario;
  /** Optional height for the chart */
  height?: number;
  /** Optional class name for additional styling */
  className?: string;
}

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: ChartDataItem;
  }>;
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

// ============================================================================
// Component
// ============================================================================

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
      <p className="font-semibold text-gray-800">{data.name}</p>
      <div className="text-sm text-gray-600 mt-1">
        <p>Time: {data.value.toFixed(2)} hours</p>
        <p>Percentage: {data.percentage.toFixed(1)}%</p>
      </div>
    </div>
  );
};

/**
 * TimeProportionChart - Pie/Donut chart showing time proportion per process node
 */
export const TimeProportionChart: React.FC<TimeProportionChartProps> = ({
  scenario,
  height = 400,
  className = '',
}) => {
  const chartData = React.useMemo(() => {
    if (!scenario.results?.nodeResults) return [];

    const totalHours = scenario.results.nodeResults.reduce(
      (sum: number, node: NodeResult) => sum + node.totalHours,
      0
    );

    return scenario.results.nodeResults.map((node: NodeResult, index: number) => ({
      name: node.nodeLabel,
      value: node.totalHours,
      color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
      percentage: totalHours > 0 ? (node.totalHours / totalHours) * 100 : 0,
    }));
  }, [scenario]);

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
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={120}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(1)}%`}
            labelLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) => (
              <span className="text-gray-700 text-sm">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TimeProportionChart;
