import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import type { FlowchartVersionRecord } from '../db/database';
import {
  getSetting,
  setSetting,
  saveFlowchartVersion,
  getFlowchartVersions,
  getFlowchartVersion,
  deleteFlowchartVersion,
  cleanupOldFlowchartVersions,
} from '../db/database';
import type {
  AutoSaveConfig,
  AutoSaveStatus,
  VersionInfo,
} from '../types/versionHistory';
import { DEFAULT_AUTO_SAVE_CONFIG, AUTO_SAVE_CONFIG_KEY } from '../types/versionHistory';

interface AutoSaveState {
  config: AutoSaveConfig;
  status: AutoSaveStatus;
  isLoaded: boolean;

  // Actions
  loadConfig: () => Promise<void>;
  updateConfig: (config: Partial<AutoSaveConfig>) => Promise<void>;
  setSaving: (isSaving: boolean) => void;
  updateStatus: (updates: Partial<AutoSaveStatus>) => void;
  createVersion: (
    flowchartId: string,
    sheets: FlowchartVersionRecord['sheets'],
    activeSheetId: string,
    label?: string,
    triggerType?: 'auto' | 'manual'
  ) => Promise<string | null>;
  getVersions: (flowchartId: string) => Promise<FlowchartVersionRecord[]>;
  getVersionInfos: (flowchartId: string) => Promise<VersionInfo[]>;
  restoreVersion: (versionId: string) => Promise<FlowchartVersionRecord | null>;
  deleteVersion: (versionId: string) => Promise<void>;
  cleanupVersions: (flowchartId: string) => Promise<void>;
}

export const useAutoSaveStore = create<AutoSaveState>()(
  immer((set, get) => ({
    config: DEFAULT_AUTO_SAVE_CONFIG,
    status: {
      lastSaveTime: null,
      lastVersionTime: null,
      isSaving: false,
      nextSaveTime: null,
      nextVersionTime: null,
    },
    isLoaded: false,

    loadConfig: async () => {
      try {
        const savedConfig = await getSetting<AutoSaveConfig>(AUTO_SAVE_CONFIG_KEY);
        if (savedConfig) {
          set((state) => {
            state.config = { ...DEFAULT_AUTO_SAVE_CONFIG, ...savedConfig };
            state.isLoaded = true;
          });
        } else {
          set((state) => {
            state.isLoaded = true;
          });
        }
      } catch (error) {
        console.error('Failed to load auto-save config:', error);
        set((state) => {
          state.isLoaded = true;
        });
      }
    },

    updateConfig: async (updates) => {
      set((state) => {
        state.config = { ...state.config, ...updates };
      });
      try {
        await setSetting(AUTO_SAVE_CONFIG_KEY, get().config);
      } catch (error) {
        console.error('Failed to save auto-save config:', error);
      }
    },

    setSaving: (isSaving) => {
      set((state) => {
        state.status.isSaving = isSaving;
      });
    },

    updateStatus: (updates) => {
      set((state) => {
        state.status = { ...state.status, ...updates };
      });
    },

    createVersion: async (flowchartId, sheets, activeSheetId, label, triggerType = 'auto') => {
      try {
        // Calculate node and edge counts
        let nodeCount = 0;
        let edgeCount = 0;
        for (const sheet of sheets) {
          nodeCount += sheet.nodes?.length || 0;
          edgeCount += sheet.edges?.length || 0;
        }

        const version: FlowchartVersionRecord = {
          id: uuidv4(),
          flowchartId,
          sheets,
          activeSheetId,
          label,
          triggerType,
          nodeCount,
          edgeCount,
          createdAt: new Date(),
        };

        await saveFlowchartVersion(version);

        set((state) => {
          state.status.lastVersionTime = new Date();
        });

        // Cleanup old versions
        await get().cleanupVersions(flowchartId);

        return version.id;
      } catch (error) {
        console.error('Failed to create version:', error);
        return null;
      }
    },

    getVersions: async (flowchartId) => {
      try {
        const versions = await getFlowchartVersions(flowchartId);
        return versions;
      } catch (error) {
        console.error('Failed to get versions:', error);
        return [];
      }
    },

    getVersionInfos: async (flowchartId) => {
      try {
        const versions = await getFlowchartVersions(flowchartId);
        return versions.map((v): VersionInfo => ({
          id: v.id,
          flowchartId: v.flowchartId,
          label: v.label,
          description: v.description,
          triggerType: v.triggerType,
          nodeCount: v.nodeCount,
          edgeCount: v.edgeCount,
          createdAt: v.createdAt,
        }));
      } catch (error) {
        console.error('Failed to get version infos:', error);
        return [];
      }
    },

    restoreVersion: async (versionId) => {
      try {
        const version = await getFlowchartVersion(versionId);
        if (!version) {
          console.error('Version not found:', versionId);
          return null;
        }
        return version;
      } catch (error) {
        console.error('Failed to restore version:', error);
        return null;
      }
    },

    deleteVersion: async (versionId) => {
      try {
        await deleteFlowchartVersion(versionId);
      } catch (error) {
        console.error('Failed to delete version:', error);
      }
    },

    cleanupVersions: async (flowchartId) => {
      try {
        const maxVersions = get().config.maxVersions;
        await cleanupOldFlowchartVersions(flowchartId, maxVersions);
      } catch (error) {
        console.error('Failed to cleanup versions:', error);
      }
    },
  }))
);

// Selector hooks
export const useAutoSaveConfig = () => useAutoSaveStore((state) => state.config);
export const useAutoSaveStatus = () => useAutoSaveStore((state) => state.status);
export const useIsAutoSaveLoaded = () => useAutoSaveStore((state) => state.isLoaded);

export const useAutoSaveActions = () =>
  useAutoSaveStore((state) => ({
    loadConfig: state.loadConfig,
    updateConfig: state.updateConfig,
    setSaving: state.setSaving,
    updateStatus: state.updateStatus,
    createVersion: state.createVersion,
    getVersions: state.getVersions,
    getVersionInfos: state.getVersionInfos,
    restoreVersion: state.restoreVersion,
    deleteVersion: state.deleteVersion,
    cleanupVersions: state.cleanupVersions,
  }));
