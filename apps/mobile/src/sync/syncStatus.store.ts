import { create } from 'zustand';

export type SyncStatus = 'synced' | 'pending' | 'offline' | 'error';

interface SyncStatusState {
  status: SyncStatus;
  pendingCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
  setStatus: (status: SyncStatus) => void;
  setPendingCount: (count: number) => void;
  setLastSyncedAt: (iso: string) => void;
  setLastError: (message: string | null) => void;
}

/** Estado singleton del SyncEngine — leído por la pastilla de estado en Dashboard/Settings. */
export const useSyncStatusStore = create<SyncStatusState>((set) => ({
  status: 'offline',
  pendingCount: 0,
  lastSyncedAt: null,
  lastError: null,
  setStatus: (status) => set({ status }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
  setLastError: (lastError) => set({ lastError }),
}));
