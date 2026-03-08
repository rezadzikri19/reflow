import { useState, useCallback } from 'react';
import { useAutoSaveStore } from '../stores/autoSaveStore';
import { useFlowchartStore } from '../stores/flowchartStore';
import type { FlowchartVersionRecord } from '../db/database';
import type { VersionInfo } from '../types/versionHistory';

/**
 * Hook to manage version history for a flowchart.
 *
 * Features:
 * - Load version list
 * - Create manual versions
 * - Restore versions
 * - Delete versions
 */
export function useVersionHistory() {
  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { getVersionInfos, createVersion, restoreVersion, deleteVersion } = useAutoSaveStore();
  const {
    flowchartId,
    sheets: currentSheets,
    activeSheetId: currentActiveSheetId,
    isDirty,
    saveFlowchart,
    loadFlowchartFromVersion,
  } = useFlowchartStore();

  // Load versions for current flowchart
  const loadVersions = useCallback(async () => {
    if (!flowchartId) {
      setVersions([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const versionInfos = await getVersionInfos(flowchartId);
      setVersions(versionInfos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load versions');
    } finally {
      setIsLoading(false);
    }
  }, [flowchartId, getVersionInfos]);

  // Create a manual version
  const createManualVersion = useCallback(
    async (label?: string) => {
      if (!flowchartId) {
        return null;
      }

      setIsLoading(true);
      setError(null);
      try {
        const versionId = await createVersion(
          flowchartId,
          currentSheets,
          currentActiveSheetId,
          label,
          'manual'
        );
        if (versionId) {
          await loadVersions();
        }
        return versionId;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create version');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [flowchartId, currentSheets, currentActiveSheetId, createVersion, loadVersions]
  );

  // Restore a version
  const restoreFromVersion = useCallback(
    async (versionId: string) => {
      setError(null);
      try {
        // If there are unsaved changes, create a backup first
        if (isDirty) {
          await saveFlowchart();
        }

        const versionData = await restoreVersion(versionId);
        if (!versionData) {
          setError('Version not found');
          return false;
        }

        // Load the version into the store
        if (loadFlowchartFromVersion) {
          loadFlowchartFromVersion(versionData);
        }

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to restore version');
        return false;
      }
    },
    [isDirty, saveFlowchart, restoreVersion, loadFlowchartFromVersion]
  );

  // Delete a version
  const deleteVersionById = useCallback(
    async (versionId: string) => {
      setError(null);
      try {
        await deleteVersion(versionId);
        setVersions((prev) => prev.filter((v) => v.id !== versionId));
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete version');
        return false;
      }
    },
    [deleteVersion]
  );

  // Get version details
  const getVersionDetails = useCallback(
    async (versionId: string): Promise<FlowchartVersionRecord | null> => {
      try {
        return await restoreVersion(versionId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get version details');
        return null;
      }
    },
    [restoreVersion]
  );

  return {
    versions,
    isLoading,
    error,
    loadVersions,
    createManualVersion,
    restoreFromVersion,
    deleteVersionById,
    getVersionDetails,
    clearError: () => setError(null),
  };
}

export default useVersionHistory;
