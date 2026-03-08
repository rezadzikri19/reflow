/**
 * Types for auto-save and version history features.
 */

export type VersionTriggerType = 'auto' | 'manual';

/**
 * Configuration for auto-save behavior.
 */
export interface AutoSaveConfig {
  /** Whether auto-save is enabled */
  enabled: boolean;
  /** Interval in seconds for regular auto-saves */
  intervalSeconds: number;
  /** Interval in minutes for creating version snapshots */
  versionIntervalMinutes: number;
  /** Maximum number of versions to keep per flowchart */
  maxVersions: number;
}

/**
 * Status information about auto-save state.
 */
export interface AutoSaveStatus {
  /** Timestamp of the last auto-save */
  lastSaveTime: Date | null;
  /** Timestamp of the last version snapshot creation */
  lastVersionTime: Date | null;
  /** Whether an auto-save is currently in progress */
  isSaving: boolean;
  /** Estimated time of next auto-save */
  nextSaveTime: Date | null;
  /** Estimated time of next version creation */
  nextVersionTime: Date | null;
}

/**
 * Default auto-save configuration.
 */
export const DEFAULT_AUTO_SAVE_CONFIG: AutoSaveConfig = {
  enabled: true,
  intervalSeconds: 5,
  versionIntervalMinutes: 10,
  maxVersions: 20,
};

/**
 * Version info for UI display.
 */
export interface VersionInfo {
  id: string;
  flowchartId: string;
  label?: string;
  description?: string;
  triggerType: VersionTriggerType;
  nodeCount: number;
  edgeCount: number;
  createdAt: Date;
  /** Whether this is the current state (for comparison) */
  isCurrent?: boolean;
}

/**
 * Settings key for storing auto-save configuration.
 */
export const AUTO_SAVE_CONFIG_KEY = 'autoSaveConfig';
