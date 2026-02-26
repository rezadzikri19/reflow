import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import type {
  ScenarioResults,
  FlowchartNode,
  FlowchartEdge,
} from '../types';

// Enable Map/Set support for Immer
enableMapSet();
import { calculateScenarioResults } from '../utils/calculations';
import { useFlowchartStore } from './flowchartStore';
import { useScenarioStore, useScenarios } from './scenarioStore';

// =============================================================================
// Store Types
// =============================================================================

interface CalculationState {
  results: Map<string, ScenarioResults>;
  isCalculating: boolean;
  lastCalculatedAt: Date | null;
}

interface CalculationActions {
  calculateScenario: (scenarioId: string) => void;
  calculateAll: () => void;
  clearResults: () => void;
  getResults: (scenarioId: string) => ScenarioResults | undefined;
}

type CalculationStore = CalculationState & CalculationActions;

// =============================================================================
// Initial State
// =============================================================================

const initialState: CalculationState = {
  results: new Map(),
  isCalculating: false,
  lastCalculatedAt: null,
};

// =============================================================================
// Store Definition
// =============================================================================

export const useCalculationStore = create<CalculationStore>()(
  immer((set, get) => ({
    ...initialState,

    calculateScenario: (scenarioId: string) => {
      const flowchartState = useFlowchartStore.getState();
      const scenarioState = useScenarioStore.getState();

      const nodes = flowchartState.nodes as FlowchartNode[];
      const edges = flowchartState.edges as FlowchartEdge[];
      const scenario = scenarioState.scenarios.find((s) => s.id === scenarioId);

      if (!scenario || nodes.length === 0) {
        return;
      }

      set((state) => {
        state.isCalculating = true;
      });

      // Perform calculation
      const results = calculateScenarioResults(nodes, edges, scenario.quantities);

      set((state) => {
        const newResults = new Map(state.results);
        newResults.set(scenarioId, results);
        state.results = newResults;
        state.isCalculating = false;
        state.lastCalculatedAt = new Date();
      });
    },

    calculateAll: () => {
      const flowchartState = useFlowchartStore.getState();
      const scenarioState = useScenarioStore.getState();

      const nodes = flowchartState.nodes as FlowchartNode[];
      const edges = flowchartState.edges as FlowchartEdge[];
      const scenarios = scenarioState.scenarios;

      if (nodes.length === 0 || scenarios.length === 0) {
        return;
      }

      set((state) => {
        state.isCalculating = true;
      });

      // Calculate all scenarios
      const newResults = new Map<string, ScenarioResults>();

      scenarios.forEach((scenario) => {
        const results = calculateScenarioResults(nodes, edges, scenario.quantities);
        newResults.set(scenario.id, results);
      });

      set((state) => {
        state.results = newResults;
        state.isCalculating = false;
        state.lastCalculatedAt = new Date();
      });
    },

    clearResults: () => {
      set((state) => {
        state.results = new Map();
        state.lastCalculatedAt = null;
      });
    },

    getResults: (scenarioId: string) => {
      return get().results.get(scenarioId);
    },
  }))
);

// =============================================================================
// Selector Hooks
// =============================================================================

export const useCalculationResults = () => useCalculationStore((state) => state.results);
export const useIsCalculating = () => useCalculationStore((state) => state.isCalculating);
export const useLastCalculatedAt = () => useCalculationStore((state) => state.lastCalculatedAt);

export const useScenarioResults = (scenarioId: string) => {
  return useCalculationStore((state) => state.results.get(scenarioId));
};

export const useActiveScenarioResults = () => {
  const activeScenarioId = useScenarioStore((state) => state.activeScenarioId);
  return useCalculationStore((state) =>
    activeScenarioId ? state.results.get(activeScenarioId) : undefined
  );
};

export const useBaselineScenarioResults = () => {
  const baselineScenarioId = useScenarioStore((state) => state.baselineScenarioId);
  return useCalculationStore((state) =>
    baselineScenarioId ? state.results.get(baselineScenarioId) : undefined
  );
};

// =============================================================================
// Comparison Hooks
// =============================================================================

/**
 * Hook to get comparison results between active and baseline scenarios.
 */
export function useScenarioComparison():
  | {
      active: ScenarioResults;
      baseline: ScenarioResults;
      difference: {
        totalMinutesDiff: number;
        totalHoursDiff: number;
        totalDaysDiff: number;
        fteDiff: number;
        criticalPathDiff: number;
      };
    }
  | null {
  const activeScenarioId = useScenarioStore((state) => state.activeScenarioId);
  const baselineScenarioId = useScenarioStore((state) => state.baselineScenarioId);
  const results = useCalculationStore((state) => state.results);

  if (!activeScenarioId || !baselineScenarioId) {
    return null;
  }

  const activeResults = results.get(activeScenarioId);
  const baselineResults = results.get(baselineScenarioId);

  if (!activeResults || !baselineResults) {
    return null;
  }

  return {
    active: activeResults,
    baseline: baselineResults,
    difference: {
      totalMinutesDiff: activeResults.totalMinutes - baselineResults.totalMinutes,
      totalHoursDiff: activeResults.totalHours - baselineResults.totalHours,
      totalDaysDiff: activeResults.totalDays - baselineResults.totalDays,
      fteDiff: activeResults.fteRequired - baselineResults.fteRequired,
      criticalPathDiff:
        activeResults.criticalPathDuration - baselineResults.criticalPathDuration,
    },
  };
}

/**
 * Hook to get all calculated results for charting.
 */
export function useAllScenarioResults(): Array<{
  scenarioId: string;
  scenarioName: string;
  results: ScenarioResults;
}> {
  const scenarios = useScenarios();
  const results = useCalculationStore((state) => state.results);

  return scenarios
    .filter((scenario) => results.has(scenario.id))
    .map((scenario) => ({
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      results: results.get(scenario.id)!,
    }));
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get the node with the highest processing time.
 */
export function findBottleneckNode(
  results: ScenarioResults
): { nodeId: string; nodeLabel: string; totalMinutes: number } | null {
  if (results.nodeResults.length === 0) return null;

  const sorted = [...results.nodeResults].sort((a, b) => b.totalMinutes - a.totalMinutes);
  const bottleneck = sorted[0];

  return {
    nodeId: bottleneck.nodeId,
    nodeLabel: bottleneck.nodeLabel,
    totalMinutes: bottleneck.totalMinutes,
  };
}

/**
 * Get all nodes on the critical path.
 */
export function getCriticalPathNodes(results: ScenarioResults): Array<{
  nodeId: string;
  nodeLabel: string;
  totalMinutes: number;
}> {
  return results.nodeResults
    .filter((node) => node.isOnCriticalPath)
    .sort((a, b) => b.totalMinutes - a.totalMinutes);
}

/**
 * Calculate the percentage of total time each node contributes.
 */
export function calculateNodeTimePercentages(
  results: ScenarioResults
): Array<{ nodeId: string; percentage: number }> {
  const totalTime = results.nodeResults.reduce((sum, n) => sum + n.totalMinutes, 0);

  if (totalTime === 0) {
    return results.nodeResults.map((n) => ({ nodeId: n.nodeId, percentage: 0 }));
  }

  return results.nodeResults.map((n) => ({
    nodeId: n.nodeId,
    percentage: (n.totalMinutes / totalTime) * 100,
  }));
}
