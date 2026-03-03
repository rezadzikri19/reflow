import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import type { Scenario } from '../types';
import { SCENARIO_COLORS } from '../types';
import type { ScenarioRecord } from '../db/database';
import {
  saveScenario as dbSaveScenario,
  loadScenarios as dbLoadScenarios,
  deleteScenario as dbDeleteScenario,
} from '../db/database';
import { useFlowchartStore } from './flowchartStore';

// =============================================================================
// Store Types
// =============================================================================

interface ScenarioState {
  scenarios: Scenario[];
  activeScenarioId: string | null;
  baselineScenarioId: string | null;
}

interface ScenarioActions {
  addScenario: (name?: string) => string;
  updateScenario: (scenarioId: string, data: Partial<Scenario>) => void;
  deleteScenario: (scenarioId: string) => Promise<void>;
  setActiveScenario: (scenarioId: string | null) => void;
  setBaselineScenario: (scenarioId: string | null) => void;
  updateQuantity: (scenarioId: string, nodeId: string, quantity: number) => void;
  loadScenarios: (flowchartId: string) => Promise<void>;
  saveScenarios: () => Promise<void>;
  duplicateScenario: (scenarioId: string) => string | null;
  reset: () => void;
}

type ScenarioStore = ScenarioState & ScenarioActions;

// =============================================================================
// Initial State
// =============================================================================

const initialState: ScenarioState = {
  scenarios: [],
  activeScenarioId: null,
  baselineScenarioId: null,
};

// =============================================================================
// Helper Functions
// =============================================================================

function getNextScenarioColor(existingScenarios: Scenario[]): string {
  const usedColors = new Set(existingScenarios.map((s) => s.color));
  const availableColor = SCENARIO_COLORS.find((c) => !usedColors.has(c));
  return availableColor || SCENARIO_COLORS[0];
}

function scenarioRecordToScenario(record: ScenarioRecord): Scenario {
  return {
    id: record.id,
    flowchartId: record.flowchartId,
    name: record.name,
    quantities: record.quantities,
    isBaseline: record.isBaseline,
    color: record.color,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function scenarioToScenarioRecord(scenario: Scenario): ScenarioRecord {
  return {
    id: scenario.id,
    flowchartId: scenario.flowchartId,
    name: scenario.name,
    quantities: scenario.quantities,
    results: {},
    isBaseline: scenario.isBaseline,
    color: scenario.color,
    createdAt: scenario.createdAt,
    updatedAt: scenario.updatedAt,
  };
}

// =============================================================================
// Store Definition
// =============================================================================

export const useScenarioStore = create<ScenarioStore>()(
  immer((set, get) => ({
    ...initialState,

    addScenario: (name?: string) => {
      const flowchartId = useFlowchartStore.getState().flowchartId;
      const nodes = useFlowchartStore.getState().nodes;
      const id = uuidv4();
      const now = new Date();

      // Build default quantities from node defaults
      const quantities: Record<string, number> = {};
      nodes.forEach((node) => {
        quantities[node.id] = (node.data.defaultQuantity as number) ?? 0;
      });

      set((state) => {
        const color = getNextScenarioColor(state.scenarios);
        const isFirstScenario = state.scenarios.length === 0;

        const newScenario: Scenario = {
          id,
          flowchartId: flowchartId || '',
          name: name || `Scenario ${state.scenarios.length + 1}`,
          quantities,
          isBaseline: isFirstScenario,
          color,
          createdAt: now,
          updatedAt: now,
        };

        state.scenarios.push(newScenario);
        state.activeScenarioId = id;

        if (isFirstScenario) {
          state.baselineScenarioId = id;
        }
      });

      return id;
    },

    updateScenario: (scenarioId: string, data: Partial<Scenario>) => {
      set((state) => {
        const scenarioIndex = state.scenarios.findIndex((s) => s.id === scenarioId);
        if (scenarioIndex !== -1) {
          state.scenarios[scenarioIndex] = {
            ...state.scenarios[scenarioIndex],
            ...data,
            updatedAt: new Date(),
          };
        }
      });
    },

    deleteScenario: async (scenarioId: string) => {
      const state = get();
      const scenario = state.scenarios.find((s) => s.id === scenarioId);

      // Remove from database
      if (scenario) {
        await dbDeleteScenario(scenarioId);
      }

      set((s) => {
        s.scenarios = s.scenarios.filter((scenario) => scenario.id !== scenarioId);

        // Update active scenario if deleted
        if (s.activeScenarioId === scenarioId) {
          s.activeScenarioId = s.scenarios.length > 0 ? s.scenarios[0].id : null;
        }

        // Update baseline scenario if deleted
        if (s.baselineScenarioId === scenarioId) {
          const newBaseline = s.scenarios.find((sc) => sc.isBaseline);
          s.baselineScenarioId = newBaseline?.id || (s.scenarios.length > 0 ? s.scenarios[0].id : null);

          // Mark new baseline
          if (s.baselineScenarioId) {
            const baselineIndex = s.scenarios.findIndex((sc) => sc.id === s.baselineScenarioId);
            if (baselineIndex !== -1) {
              s.scenarios[baselineIndex].isBaseline = true;
            }
          }
        }
      });
    },

    setActiveScenario: (scenarioId: string | null) => {
      set((state) => {
        state.activeScenarioId = scenarioId;
      });
    },

    setBaselineScenario: (scenarioId: string | null) => {
      set((state) => {
        // Remove baseline from previous
        if (state.baselineScenarioId) {
          const prevBaselineIndex = state.scenarios.findIndex(
            (s) => s.id === state.baselineScenarioId
          );
          if (prevBaselineIndex !== -1) {
            state.scenarios[prevBaselineIndex].isBaseline = false;
          }
        }

        // Set new baseline
        state.baselineScenarioId = scenarioId;
        if (scenarioId) {
          const newBaselineIndex = state.scenarios.findIndex(
            (s) => s.id === scenarioId
          );
          if (newBaselineIndex !== -1) {
            state.scenarios[newBaselineIndex].isBaseline = true;
          }
        }
      });
    },

    updateQuantity: (scenarioId: string, nodeId: string, quantity: number) => {
      set((state) => {
        const scenarioIndex = state.scenarios.findIndex((s) => s.id === scenarioId);
        if (scenarioIndex !== -1) {
          state.scenarios[scenarioIndex].quantities[nodeId] = quantity;
          state.scenarios[scenarioIndex].updatedAt = new Date();
        }
      });
    },

    loadScenarios: async (flowchartId: string) => {
      const records = await dbLoadScenarios(flowchartId);

      set((state) => {
        state.scenarios = records.map(scenarioRecordToScenario);

        // Set active and baseline
        const baseline = state.scenarios.find((s) => s.isBaseline);
        state.baselineScenarioId = baseline?.id || null;
        state.activeScenarioId = state.scenarios.length > 0 ? state.scenarios[0].id : null;
      });
    },

    saveScenarios: async () => {
      const state = get();

      for (const scenario of state.scenarios) {
        await dbSaveScenario(scenarioToScenarioRecord(scenario));
      }
    },

    duplicateScenario: (scenarioId: string) => {
      const state = get();
      const scenario = state.scenarios.find((s) => s.id === scenarioId);

      if (!scenario) return null;

      const newId = uuidv4();
      const now = new Date();
      const color = getNextScenarioColor(state.scenarios);

      set((s) => {
        const duplicated: Scenario = {
          id: newId,
          flowchartId: scenario.flowchartId,
          name: `${scenario.name} (Copy)`,
          quantities: { ...scenario.quantities },
          isBaseline: false,
          color,
          createdAt: now,
          updatedAt: now,
        };

        s.scenarios.push(duplicated);
        s.activeScenarioId = newId;
      });

      return newId;
    },

    reset: () => {
      set(initialState);
    },
  }))
);

// =============================================================================
// Selector Hooks
// =============================================================================

export const useScenarios = () => useScenarioStore((state) => state.scenarios);
export const useActiveScenarioId = () => useScenarioStore((state) => state.activeScenarioId);
export const useBaselineScenarioId = () => useScenarioStore((state) => state.baselineScenarioId);

export const useActiveScenario = () => {
  const scenarios = useScenarioStore((state) => state.scenarios);
  const activeId = useScenarioStore((state) => state.activeScenarioId);

  if (!activeId) return null;
  return scenarios.find((s) => s.id === activeId) || null;
};

export const useBaselineScenario = () => {
  const scenarios = useScenarioStore((state) => state.scenarios);
  const baselineId = useScenarioStore((state) => state.baselineScenarioId);

  if (!baselineId) return null;
  return scenarios.find((s) => s.id === baselineId) || null;
};

