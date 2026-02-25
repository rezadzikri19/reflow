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
  ReferenceLine,
} from 'recharts';
import type { Scenario, NodeResult } from '../../types';

// ============================================================================
// Types
// ============================================================================

export interface ProcessTimelineChartProps {
  /** Scenario to display */
  scenario: Scenario;
  /** Optional height for the chart */
  height?: number;
  /** Optional class name for additional styling */
  className?: string;
}

interface TimelineData {
  name: string;
  start: number;
  duration: number;
  end: number;
  isCritical: boolean;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: TimelineData;
  }>;
  label?: string;
}

// ============================================================================
// Constants
// ============================================================================

const CRITICAL_COLOR = '#EF4444';
const NORMAL_COLOR = '#3B82F6';
const CHART_MARGIN = { top: 20, right: 30, left: 100, bottom: 20 };

// ============================================================================
// Component
// ============================================================================

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  return (
    <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
      <p className="font-semibold text-gray-800">{data.name}</p>
      <div className="text-sm text-gray-600 mt-1 space-y-1">
        <p>Start: {data.start.toFixed(1)} hours</p>
        <p>Duration: {data.duration.toFixed(1)} hours</p>
        <p>End: {data.end.toFixed(1)} hours</p>
        {data.isCritical && (
          <p className="text-red-500 font-medium">On Critical Path</p>
        )}
      </div>
    </div>
  );
};

/**
 * ProcessTimelineChart - Gantt-style timeline showing process execution
 */
export const ProcessTimelineChart: React.FC<ProcessTimelineChartProps> = ({
  scenario,
  height = 400,
  className = '',
}) => {
  const chartData = React.useMemo(() => {
    if (!scenario.results?.nodeResults) return [];

    // Simple sequential timeline (in real app, would use critical path data)
    let cumulativeHours = 0;
    return scenario.results.nodeResults.map((node: NodeResult, index: number) => {
      const start = cumulativeHours;
      const duration = node.totalHours;
      const end = start + duration;
      cumulativeHours = end;

      return {
        name: node.nodeLabel,
        start,
        duration,
        end,
        isCritical: node.isOnCriticalPath || false,
        color: node.isOnCriticalPath ? CRITICAL_COLOR : NORMAL_COLOR,
      };
    });
  }, [scenario]);

  const maxTime = Math.max(...chartData.map((d) => d.end), 1);

  const formatXAxisTick = (value: number): string => {
    if (value >= 24) {
      return `${(value / 24).toFixed(1)}d`;
    }
    return `${value.toFixed(0)}h`;
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
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Process Timeline</h3>
      <ResponsiveContainer width="100%" height="85%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={CHART_MARGIN}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            type="number"
            domain={[0, maxTime]}
            tickFormatter={formatXAxisTick}
            tick={{ fontSize: 12, fill: '#6B7280' }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: '#6B7280' }}
            width={90}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="duration"
            stackId="stack"
            radius={[0, 4, 4, 0]}
            maxBarSize={40}
          >
            {chartData.map((entry, index) => (
              <cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-6 mt-2">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: NORMAL_COLOR }} />
          <span className="text-sm text-gray-600">Normal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: CRITICAL_COLOR }} />
          <span className="text-sm text-gray-600">Critical Path</span>
        </div>
      </div>
    </div>
  );
};

export default ProcessTimelineChart;
