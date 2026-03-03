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
