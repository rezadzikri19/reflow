import Dexie, { type EntityTable } from 'dexie';

// =============================================================================
// Database Model Interfaces
// =============================================================================

export interface FlowchartRecord {
  id: string;
  name: string;
  nodes: unknown[];
  edges: unknown[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ScenarioRecord {
  id: string;
  flowchartId: string;
  name: string;
  quantities: Record<string, number>;
  results: Record<string, number>;
  isBaseline: boolean;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SettingsRecord {
  id: string;
  key: string;
  value: unknown;
}

// =============================================================================
// Database Class Definition
// =============================================================================

export class FlowchartDatabase extends Dexie {
  flowcharts!: EntityTable<FlowchartRecord, 'id'>;
  scenarios!: EntityTable<ScenarioRecord, 'id'>;
  settings!: EntityTable<SettingsRecord, 'id'>;

  constructor() {
    super('FlowchartProcessDB');

    this.version(1).stores({
      flowcharts: 'id, name, createdAt, updatedAt',
      scenarios: 'id, flowchartId, name, isBaseline, createdAt, updatedAt',
      settings: 'id, &key',
    });
  }
}

// =============================================================================
// Database Instance
// =============================================================================

export const db = new FlowchartDatabase();

// =============================================================================
// Flowchart Helper Functions
// =============================================================================

export async function saveFlowchart(flowchart: FlowchartRecord): Promise<string> {
  const existingFlowchart = await db.flowcharts.get(flowchart.id);
  const now = new Date();

  if (existingFlowchart) {
    await db.flowcharts.update(flowchart.id, {
      ...flowchart,
      updatedAt: now,
    });
    return flowchart.id;
  } else {
    const newFlowchart: FlowchartRecord = {
      ...flowchart,
      createdAt: flowchart.createdAt || now,
      updatedAt: now,
    };
    await db.flowcharts.add(newFlowchart);
    return flowchart.id;
  }
}

export async function loadFlowchart(id: string): Promise<FlowchartRecord | undefined> {
  return db.flowcharts.get(id);
}

export async function getAllFlowcharts(): Promise<FlowchartRecord[]> {
  return db.flowcharts.orderBy('updatedAt').reverse().toArray();
}

export async function deleteFlowchart(id: string): Promise<void> {
  // Also delete all associated scenarios
  await db.transaction('rw', [db.flowcharts, db.scenarios], async () => {
    await db.scenarios.where('flowchartId').equals(id).delete();
    await db.flowcharts.delete(id);
  });
}

// =============================================================================
// Scenario Helper Functions
// =============================================================================

export async function saveScenario(scenario: ScenarioRecord): Promise<string> {
  const existingScenario = await db.scenarios.get(scenario.id);
  const now = new Date();

  if (existingScenario) {
    await db.scenarios.update(scenario.id, {
      ...scenario,
      updatedAt: now,
    });
    return scenario.id;
  } else {
    const newScenario: ScenarioRecord = {
      ...scenario,
      createdAt: scenario.createdAt || now,
      updatedAt: now,
    };
    await db.scenarios.add(newScenario);
    return scenario.id;
  }
}

export async function loadScenarios(flowchartId: string): Promise<ScenarioRecord[]> {
  return db.scenarios.where('flowchartId').equals(flowchartId).toArray();
}

export async function deleteScenario(id: string): Promise<void> {
  await db.scenarios.delete(id);
}

// =============================================================================
// Settings Helper Functions
// =============================================================================

export async function getSetting<T = unknown>(key: string): Promise<T | undefined> {
  const setting = await db.settings.where('key').equals(key).first();
  return setting?.value as T | undefined;
}

export async function setSetting(key: string, value: unknown): Promise<void> {
  const existingSetting = await db.settings.where('key').equals(key).first();

  if (existingSetting) {
    await db.settings.update(existingSetting.id, { value });
  } else {
    await db.settings.add({
      id: crypto.randomUUID(),
      key,
      value,
    });
  }
}

export async function deleteSetting(key: string): Promise<void> {
  await db.settings.where('key').equals(key).delete();
}
