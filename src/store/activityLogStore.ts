import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ActivityType = 'farmer_approval' | 'farmer_suspension' | 'order_status_change' | 'farmer_edit';

export interface ActivityLog {
  id: string;
  adminId: string;
  adminName: string;
  adminEmail: string;
  type: ActivityType;
  description: string;
  timestamp: string;
  metadata: {
    farmerId?: string;
    orderId?: string;
    oldStatus?: string;
    newStatus?: string;
    region?: string;
  };
}

interface ActivityLogState {
  logs: ActivityLog[];
  addLog: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
}

export const useActivityLogStore = create<ActivityLogState>()(
  persist(
    (set) => ({
      logs: [],
      addLog: (log) =>
        set((state) => ({
          logs: [
            {
              ...log,
              id: Date.now().toString(),
              timestamp: new Date().toISOString(),
            },
            ...state.logs,
          ],
        })),
      clearLogs: () => set({ logs: [] }),
    }),
    {
      name: 'activity-log-storage',
    }
  )
);