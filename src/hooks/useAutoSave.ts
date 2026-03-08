import { useEffect, useRef, useCallback } from 'react';
import { useAutoSaveStore, useAutoSaveConfig, useAutoSaveStatus } from '../stores/autoSaveStore';
import { useFlowchartStore } from '../stores/flowchartStore';

/**
 * Hook to manage automatic saving of flowchart changes.
 *
 * Features:
 * - Periodic auto-save at configurable intervals
 * - Creates version snapshots at separate intervals
 * - Saves when tab becomes hidden (visibility change)
 * - Only saves when there are unsaved changes (isDirty)
 */
export function useAutoSave() {
  const config = useAutoSaveConfig();
  const status = useAutoSaveStatus();
  const { loadConfig, updateStatus, setSaving, createVersion } = useAutoSaveStore();
  const { flowchartId, sheets, activeSheetId, isDirty, saveFlowchart } = useFlowchartStore();

  const saveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const versionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastVersionCheckRef = useRef<Date | null>(null);

  // Perform auto-save
  const performAutoSave = useCallback(async () => {
    if (!config.enabled || !flowchartId || !isDirty || status.isSaving) {
      return false;
    }

    setSaving(true);
    try {
      await saveFlowchart();
      updateStatus({
        lastSaveTime: new Date(),
        nextSaveTime: new Date(Date.now() + config.intervalSeconds * 1000),
      });
      return true;
    } catch (error) {
      console.error('Auto-save failed:', error);
      return false;
    } finally {
      setSaving(false);
    }
  }, [config.enabled, config.intervalSeconds, flowchartId, isDirty, status.isSaving, saveFlowchart, setSaving, updateStatus]);

  // Create version snapshot
  const createVersionSnapshot = useCallback(async () => {
    if (!config.enabled || !flowchartId) {
      return null;
    }

    try {
      const versionId = await createVersion(
        flowchartId,
        sheets,
        activeSheetId,
        undefined,
        'auto'
      );
      updateStatus({ lastVersionTime: new Date() });
      return versionId;
    } catch (error) {
      console.error('Failed to create version snapshot:', error);
      return null;
    }
  }, [config.enabled, flowchartId, sheets, activeSheetId, createVersion, updateStatus]);

  // Handle visibility change - save when tab becomes hidden
  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === 'hidden' && config.enabled && isDirty && flowchartId) {
      performAutoSave();
    }
  }, [config.enabled, isDirty, flowchartId, performAutoSave]);

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  // Setup auto-save interval
  useEffect(() => {
    if (!config.enabled || !flowchartId) {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
      return;
    }

    // Set initial next save time
    if (!status.nextSaveTime) {
      updateStatus({
        nextSaveTime: new Date(Date.now() + config.intervalSeconds * 1000),
      });
    }

    saveIntervalRef.current = setInterval(() => {
      performAutoSave();
    }, config.intervalSeconds * 1000);

    return () => {
      if (saveIntervalRef.current) {
        clearInterval(saveIntervalRef.current);
        saveIntervalRef.current = null;
      }
    };
  }, [config.enabled, config.intervalSeconds, flowchartId, performAutoSave, updateStatus, status.nextSaveTime]);

  // Setup version interval
  useEffect(() => {
    if (!config.enabled || !flowchartId) {
      if (versionIntervalRef.current) {
        clearInterval(versionIntervalRef.current);
        versionIntervalRef.current = null;
      }
      return;
    }

    // Initialize last version check time
    if (!lastVersionCheckRef.current) {
      lastVersionCheckRef.current = new Date();
    }

    // Check every minute if it's time to create a version
    versionIntervalRef.current = setInterval(() => {
      const now = new Date();
      const lastCheck = lastVersionCheckRef.current;
      if (!lastCheck) {
        lastVersionCheckRef.current = now;
        return;
      }

      const timeSinceLastCheck = now.getTime() - lastCheck.getTime();
      const versionIntervalMs = config.versionIntervalMinutes * 60 * 1000;

      if (timeSinceLastCheck >= versionIntervalMs) {
        createVersionSnapshot();
        lastVersionCheckRef.current = now;
      }
    }, 60 * 1000); // Check every minute

    return () => {
      if (versionIntervalRef.current) {
        clearInterval(versionIntervalRef.current);
        versionIntervalRef.current = null;
      }
    };
  }, [config.enabled, config.versionIntervalMinutes, flowchartId, createVersionSnapshot]);

  // Setup visibility change listener
  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  return {
    performAutoSave,
    createVersionSnapshot,
    isSaving: status.isSaving,
    lastSaveTime: status.lastSaveTime,
    lastVersionTime: status.lastVersionTime,
    nextSaveTime: status.nextSaveTime,
  };
}

export default useAutoSave;
