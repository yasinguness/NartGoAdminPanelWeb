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

/**
 * Planın gönderilmeden önceki hâli.
 *
 * Açma anahtarına basmadan önce gösterilir: admin hangi metnin kaç cihaza
 * gideceğini görmeden planı açmasın. `warnings` sunucudan Türkçe gelir ve
 * olduğu gibi basılır.
 */
export interface PlanPreview {
  title: string;
  body: string;
  deepLink?: string | null;
  topic?: string | null;
  /** Bu planın şu an ulaşacağı yaklaşık cihaz sayısı. */
  estimatedDevices?: number | null;
  /** Başlık uzunluğu, eksik bağlantı, sessiz saat gibi uyarılar. */
  warnings?: string[];
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

  /** Gönderim önizlemesi — yazma yapmaz. */
  preview: async (id: string): Promise<PlanPreview> => {
    const res = await api.get<PlanPreview>(`${BASE}/${id}/preview`);
    return (res.data as { data?: PlanPreview })?.data ?? (res.data as PlanPreview);
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
