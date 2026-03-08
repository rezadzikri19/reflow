import Dexie, { type EntityTable } from 'dexie';
import type { Sheet } from '../types';

// =============================================================================
// Database Model Interfaces
// =============================================================================

/**
 * Flowchart record stored in the database.
 * Supports both legacy format (v1: nodes/edges) and new format (v2+: sheets).
 */
export interface FlowchartRecord {
  id: string;
  name: string;
  description?: string;
  // Legacy format (v1) - kept for backward compatibility
  nodes?: unknown[];
  edges?: unknown[];
  // New format (v2+)
  sheets?: Sheet[];
  activeSheetId?: string;
  // Schema version for migration purposes
  version?: number;
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

/**
 * Flowchart version record for version history.
 * Stores complete snapshots of flowchart state at specific points in time.
 */
export interface FlowchartVersionRecord {
  id: string;
  flowchartId: string;
  sheets: Sheet[];
  activeSheetId: string;
  label?: string;
  description?: string;
  triggerType: 'auto' | 'manual';
  nodeCount: number;
  edgeCount: number;
  createdAt: Date;
}

// =============================================================================
// Database Class Definition
// =============================================================================

export class FlowchartDatabase extends Dexie {
  flowcharts!: EntityTable<FlowchartRecord, 'id'>;
  scenarios!: EntityTable<ScenarioRecord, 'id'>;
  settings!: EntityTable<SettingsRecord, 'id'>;
  flowchartVersions!: EntityTable<FlowchartVersionRecord, 'id'>;

  constructor() {
    super('FlowchartProcessDB');

    this.version(1).stores({
      flowcharts: 'id, name, createdAt, updatedAt',
      scenarios: 'id, flowchartId, name, isBaseline, createdAt, updatedAt',
      settings: 'id, &key',
    });

    this.version(2).stores({
      flowcharts: 'id, name, createdAt, updatedAt',
      scenarios: 'id, flowchartId, name, isBaseline, createdAt, updatedAt',
      settings: 'id, &key',
      flowchartVersions: 'id, flowchartId, createdAt, triggerType',
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

// =============================================================================
// Flowchart Version Helper Functions
// =============================================================================

export async function saveFlowchartVersion(version: FlowchartVersionRecord): Promise<string> {
  const newVersion: FlowchartVersionRecord = {
    ...version,
    createdAt: version.createdAt || new Date(),
  };
  await db.flowchartVersions.add(newVersion);
  return newVersion.id;
}

export async function getFlowchartVersions(flowchartId: string): Promise<FlowchartVersionRecord[]> {
  return db.flowchartVersions
    .where('flowchartId')
    .equals(flowchartId)
    .reverse()
    .sortBy('createdAt');
}

export async function getFlowchartVersion(versionId: string): Promise<FlowchartVersionRecord | undefined> {
  return db.flowchartVersions.get(versionId);
}

export async function deleteFlowchartVersion(versionId: string): Promise<void> {
  await db.flowchartVersions.delete(versionId);
}

export async function deleteAllFlowchartVersions(flowchartId: string): Promise<void> {
  await db.flowchartVersions.where('flowchartId').equals(flowchartId).delete();
}

export async function getFlowchartVersionCount(flowchartId: string): Promise<number> {
  return db.flowchartVersions.where('flowchartId').equals(flowchartId).count();
}

export async function cleanupOldFlowchartVersions(
  flowchartId: string,
  maxVersions: number
): Promise<void> {
  const versions = await db.flowchartVersions
    .where('flowchartId')
    .equals(flowchartId)
    .reverse()
    .sortBy('createdAt');

  if (versions.length > maxVersions) {
    const versionsToDelete = versions.slice(maxVersions);
    const idsToDelete = versionsToDelete.map((v) => v.id);
    await db.flowchartVersions.bulkDelete(idsToDelete);
  }
}
