/**
 * Son seçilen workspace.
 *
 * Aktif workspace'in tek gerçek kaynağı adres çubuğudur
 * (workspaceForPath). Bu store yalnızca "geçen sefer neyi seçtin"
 * bilgisini tutar; seçim ekranı bunu öne çıkarmak için okur.
 * Yetki kararı asla buradan verilmez.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WorkspaceId } from '../config/workspaces';

interface WorkspaceState {
    lastWorkspaceId: WorkspaceId | null;
    setLastWorkspace: (id: WorkspaceId) => void;
    clearLastWorkspace: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
    persist(
        (set) => ({
            lastWorkspaceId: null,
            setLastWorkspace: (id) => set({ lastWorkspaceId: id }),
            clearLastWorkspace: () => set({ lastWorkspaceId: null }),
        }),
        { name: 'workspace-storage' },
    ),
);
