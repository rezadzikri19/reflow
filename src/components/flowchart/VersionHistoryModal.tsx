import React, { useEffect, useState } from 'react';
import { Modal, ModalFooter } from '../common/Modal';
import { Button } from '../common/Button';
import { useVersionHistory } from '../../hooks/useVersionHistory';
import type { VersionInfo } from '../../types/versionHistory';

interface VersionHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const HistoryIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-4 h-4"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const RestoreIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-4 h-4"
  >
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const TrashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-4 h-4"
  >
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const PlusIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="w-4 h-4"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  open,
  onOpenChange,
}) => {
  const {
    versions,
    isLoading,
    error,
    loadVersions,
    createManualVersion,
    restoreFromVersion,
    deleteVersionById,
    clearError,
  } = useVersionHistory();

  const [restoreConfirmId, setRestoreConfirmId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [newVersionLabel, setNewVersionLabel] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Load versions when modal opens
  useEffect(() => {
    if (open) {
      loadVersions();
    }
  }, [open, loadVersions]);

  const handleCreateVersion = async () => {
    setIsCreating(true);
    try {
      await createManualVersion(newVersionLabel.trim() || undefined);
      setNewVersionLabel('');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    const success = await restoreFromVersion(versionId);
    if (success) {
      onOpenChange(false);
    }
    setRestoreConfirmId(null);
  };

  const handleDelete = async (versionId: string) => {
    await deleteVersionById(versionId);
    setDeleteConfirmId(null);
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const isYesterday = new Date(now.getTime() - 86400000).toDateString() === d.toDateString();

    const time = d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (isToday) {
      return `Today at ${time}`;
    } else if (isYesterday) {
      return `Yesterday at ${time}`;
    } else {
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      }) + ` at ${time}`;
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Version History"
      description="View and manage saved versions of this flowchart"
      size="lg"
    >
      {/* Create new version section */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Version label (optional)"
            value={newVersionLabel}
            onChange={(e) => setNewVersionLabel(e.target.value)}
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreateVersion();
              }
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            onClick={handleCreateVersion}
            isLoading={isCreating}
            leftIcon={<PlusIcon />}
          >
            Create Version
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-gray-500">
          Create a manual snapshot of the current state
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <span className="text-sm text-red-600">{error}</span>
          <button
            onClick={clearError}
            className="text-red-400 hover:text-red-600"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}

      {/* Version list */}
      <div className="max-h-80 overflow-y-auto">
        {isLoading && versions.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <svg
              className="animate-spin h-6 w-6 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <HistoryIcon />
            <p className="mt-2 text-sm">No versions saved yet</p>
            <p className="text-xs text-gray-400">Versions are created automatically or manually above</p>
          </div>
        ) : (
          <div className="space-y-2">
            {versions.map((version) => (
              <VersionItem
                key={version.id}
                version={version}
                formatDate={formatDate}
                onRestore={() => setRestoreConfirmId(version.id)}
                onDelete={() => setDeleteConfirmId(version.id)}
                isRestoreConfirm={restoreConfirmId === version.id}
                isDeleteConfirm={deleteConfirmId === version.id}
                onConfirmRestore={() => handleRestore(version.id)}
                onCancelRestore={() => setRestoreConfirmId(null)}
                onConfirmDelete={() => handleDelete(version.id)}
                onCancelDelete={() => setDeleteConfirmId(null)}
              />
            ))}
          </div>
        )}
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

interface VersionItemProps {
  version: VersionInfo;
  formatDate: (date: Date) => string;
  onRestore: () => void;
  onDelete: () => void;
  isRestoreConfirm: boolean;
  isDeleteConfirm: boolean;
  onConfirmRestore: () => void;
  onCancelRestore: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}

const VersionItem: React.FC<VersionItemProps> = ({
  version,
  formatDate,
  onRestore,
  onDelete,
  isRestoreConfirm,
  isDeleteConfirm,
  onConfirmRestore,
  onCancelRestore,
  onConfirmDelete,
  onCancelDelete,
}) => {
  return (
    <div className="p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {version.label && (
              <span className="font-medium text-gray-900">{version.label}</span>
            )}
            <span
              className={`text-xs px-1.5 py-0.5 rounded ${
                version.triggerType === 'manual'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {version.triggerType === 'manual' ? 'Manual' : 'Auto'}
            </span>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {formatDate(version.createdAt)}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {version.nodeCount} nodes, {version.edgeCount} edges
          </div>
        </div>
        <div className="flex items-center gap-1">
          {isRestoreConfirm ? (
            <div className="flex items-center gap-1">
              <Button variant="danger" size="sm" onClick={onConfirmRestore}>
                Confirm
              </Button>
              <Button variant="ghost" size="sm" onClick={onCancelRestore}>
                Cancel
              </Button>
            </div>
          ) : isDeleteConfirm ? (
            <div className="flex items-center gap-1">
              <Button variant="danger" size="sm" onClick={onConfirmDelete}>
                Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={onCancelDelete}>
                Cancel
              </Button>
            </div>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={onRestore}
                leftIcon={<RestoreIcon />}
                className="!p-1.5"
                title="Restore this version"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                leftIcon={<TrashIcon />}
                className="!p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                title="Delete this version"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VersionHistoryModal;
