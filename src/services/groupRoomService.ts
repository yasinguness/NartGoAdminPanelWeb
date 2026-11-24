import { api } from './api';

/**
 * Sohbet odaları (yalnız yönetici): oda tanımı, moderatör atama, şikâyet kuyruğu.
 * Bkz. docs/plan/nartgo-sohbet-odalari.md
 */
const ROOT = '/content/admin/rooms';

const unwrap = <T,>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } | T;
  return (body && typeof body === 'object' && 'data' in (body as object) ? (body as { data: T }).data : body) as T;
};

export interface RoomPerson {
  userId: string | null;
  name: string;
  avatarUrl: string | null;
}

export type WeekDay = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

export interface WeeklyHour {
  day: WeekDay;
  /** "21:00:00" */
  time: string;
  timezone: string;
  topic: string | null;
}

export interface AdminRoom {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  rules: string[];
  pinnedText: string | null;
  sortOrder: number;
  archived: boolean;
  weeklyHour: WeeklyHour | null;
  memberCount: number;
  moderators: RoomPerson[];
  /** Son 7 gün: messages, writers, reports. */
  lastWeek: Record<string, number>;
}

export interface AdminRoomRequest {
  slug?: string;
  name?: string;
  description?: string;
  icon?: string;
  rules?: string[];
  pinnedText?: string;
  sortOrder?: number;
  archived?: boolean;
  weeklyDay?: WeekDay | null;
  weeklyTime?: string | null;
  weeklyTopic?: string;
}

export interface RoomMedia {
  id: number;
  kind: 'IMAGE' | 'VIDEO';
  url: string;
}

export interface RoomReportItem {
  messageId: number;
  roomId: number;
  roomName: string | null;
  sender: RoomPerson | null;
  type: string;
  content: string | null;
  media: RoomMedia[];
  sentAt: string;
  hidden: boolean;
  reporterCount: number;
  reasons: string[];
  firstReportedAt: string | null;
}

export interface BlockedWord {
  id: number;
  word: string;
  createdAt: string;
}

/** Çikolata istatistiği (yalnız toplu sayı). docs/plan/nartgo-cikolata.md */
export interface ChocolateStats {
  days: number;
  sent: number;
  accepted: number;
  declined: number;
  expired: number;
  pending: number;
  acceptanceRate: number | null;
  fromRoom: number;
  /** 30 günde 3+ "kabul etmedi" alan gönderenler; haftalık hakları kısılabilir. */
  brakedSenders: number;
}

export type ResolveAction = 'DISMISS' | 'HIDE' | 'HIDE_AND_SILENCE';

export const groupRoomService = {
  async rooms(): Promise<AdminRoom[]> {
    return unwrap(await api.get(ROOT));
  },
  async create(req: AdminRoomRequest): Promise<AdminRoom> {
    return unwrap(await api.post(ROOT, req));
  },
  async update(id: number, req: AdminRoomRequest): Promise<AdminRoom> {
    return unwrap(await api.put(`${ROOT}/${id}`, req));
  },
  /** identity: e-posta ya da kullanıcı kimliği. */
  async addModerator(roomId: number, identity: string): Promise<AdminRoom> {
    return unwrap(await api.post(`${ROOT}/${roomId}/moderators`, { identity }));
  },
  async removeModerator(roomId: number, identity: string): Promise<AdminRoom> {
    return unwrap(await api.delete(`${ROOT}/${roomId}/moderators/${encodeURIComponent(identity)}`));
  },
  async reports(limit = 100): Promise<RoomReportItem[]> {
    return unwrap(await api.get(`${ROOT}/reports`, { params: { limit } }));
  },
  async reportCount(config?: Record<string, unknown>): Promise<number> {
    const r = unwrap<{ openMessages: number }>(await api.get(`${ROOT}/reports/count`, config));
    return r?.openMessages ?? 0;
  },
  async blockedWords(): Promise<BlockedWord[]> {
    return unwrap(await api.get(`${ROOT}/blocked-words`));
  },
  /** Virgülle ya da satır satır yazılmış kelimeler; dönen değer güncel liste. */
  async addBlockedWords(words: string): Promise<BlockedWord[]> {
    return unwrap(await api.post(`${ROOT}/blocked-words`, { words }));
  },
  async removeBlockedWord(id: number): Promise<BlockedWord[]> {
    return unwrap(await api.delete(`${ROOT}/blocked-words/${id}`));
  },
  async chocolateStats(days = 7, config?: Record<string, unknown>): Promise<ChocolateStats> {
    return unwrap(await api.get('/content/admin/chocolates/stats', { ...(config ?? {}), params: { days } }));
  },
  async resolve(messageId: number, action: ResolveAction, silenceHours?: number): Promise<void> {
    await api.post(`${ROOT}/reports/${messageId}/resolve`, { action, silenceHours });
  },
};
