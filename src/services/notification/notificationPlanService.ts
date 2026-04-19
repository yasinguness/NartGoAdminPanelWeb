import { api } from '../api';

export interface NotificationPlan {
  id: string;
  name: string;
  category: string;
  weekNumber: number;
  dayOfWeek: string;
  sendTime: string; // HH:mm
  title: string;
  body: string;
  deepLink?: string;
  imageUrl?: string;
  targetTopic: string;
  priority: string;
  active: boolean;
  planType: string; // RECURRING | CULTURAL | ONE_TIME
  fixedDate?: string; // MM-dd
  lastSentAt?: string;
  totalSentCount: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  sortOrder: number;
}

const BASE = '/notifications/admin/plans';

export const notificationPlanService = {
  list: async (): Promise<NotificationPlan[]> => {
    const res = await api.get<NotificationPlan[]>(BASE);
    return res.data;
  },

  get: async (id: string): Promise<NotificationPlan> => {
    const res = await api.get<NotificationPlan>(`${BASE}/${id}`);
    return res.data;
  },

  create: async (plan: Partial<NotificationPlan>): Promise<NotificationPlan> => {
    const res = await api.post<NotificationPlan>(BASE, plan);
    return res.data;
  },

  update: async (id: string, plan: Partial<NotificationPlan>): Promise<NotificationPlan> => {
    const res = await api.put<NotificationPlan>(`${BASE}/${id}`, plan);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`${BASE}/${id}`);
  },

  toggleActive: async (id: string): Promise<NotificationPlan> => {
    const res = await api.post<NotificationPlan>(`${BASE}/${id}/toggle`);
    return res.data;
  },

  sendNow: async (id: string): Promise<void> => {
    await api.post(`${BASE}/${id}/send-now`);
  },

  seedDefaults: async (): Promise<{ count: number }> => {
    const res = await api.post<{ count: number }>(`${BASE}/seed-defaults`);
    return res.data;
  },
};
