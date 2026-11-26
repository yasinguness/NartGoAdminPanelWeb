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
  /** Son 7 gün: messages, writers, reports, topics, comments, commenters. */
  lastWeek: Record<string, number>;
  /** v0.5: ACTIVE açık, HIDDEN mobilde görünmez, ARCHIVED kapatıldı. */
  status: RoomStatus;
  /** WhatsApp tarzı sohbet akışı. */
  chatEnabled: boolean;
  /** Üye konu açabilir (moderatör ve yönetici her zaman). */
  memberTopics: boolean;
}

export type RoomStatus = 'ACTIVE' | 'HIDDEN' | 'ARCHIVED';

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
  status?: RoomStatus;
  chatEnabled?: boolean;
  memberTopics?: boolean;
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

// ── Konular ve yorumlar (v0.5) ──

export type TopicStatus = 'VISIBLE' | 'HIDDEN' | 'SCHEDULED';

export interface AdminTopic {
  id: number;
  roomId: number;
  roomName: string | null;
  title: string;
  body: string | null;
  media: RoomMedia[];
  author: RoomPerson | null;
  /** Doluysa yazar yerine bu ad görünür ("NartGo"). */
  authorLabel: string | null;
  pinned: boolean;
  /** Haftanın Sorusu ise bitiş zamanı. */
  featuredUntil: string | null;
  commentsClosed: boolean;
  publishAt: string | null;
  commentCount: number;
  lastActivityAt: string;
  createdAt: string;
  status: TopicStatus;
  lastCommentPreview: string | null;
}

export interface TopicRequest {
  title?: string;
  body?: string;
  mediaIds?: number[];
  pinned?: boolean;
  /** Haftanın Sorusu süresi; 0 kaldırır. */
  featuredDays?: number;
  commentsClosed?: boolean;
  /** ISO; boş ya da geçmiş = hemen. */
  publishAt?: string | null;
  authorLabel?: string;
  /** true: yöneticinin kendi adı görünür. */
  showAuthor?: boolean;
}

export type TopicAction = 'PIN' | 'UNPIN' | 'FEATURE' | 'UNFEATURE' | 'CLOSE' | 'OPEN' | 'HIDE' | 'UNHIDE' | 'DELETE';

export interface AdminComment {
  id: number;
  topicId: number;
  topicTitle: string | null;
  roomId: number;
  roomName: string | null;
  sender: RoomPerson | null;
  content: string | null;
  media: RoomMedia[];
  replyToId: number | null;
  createdAt: string;
  hidden: boolean;
}

export interface TopicReportItem {
  kind: 'TOPIC' | 'COMMENT';
  targetId: number;
  roomId: number;
  roomName: string | null;
  topicId: number;
  topicTitle: string | null;
  sender: RoomPerson | null;
  content: string | null;
  media: RoomMedia[];
  createdAt: string;
  hidden: boolean;
  reporterCount: number;
  reasons: string[];
  firstReportedAt: string | null;
}

export interface UploadedMedia {
  id: number;
  kind: 'IMAGE';
  url: string;
}

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
  /** Sohbet mesajı + konu + yorum şikâyetleri (eski sunucu yalnız openMessages döner). */
  async reportCount(config?: Record<string, unknown>): Promise<number> {
    const r = unwrap<{ openMessages: number; openTotal?: number }>(await api.get(`${ROOT}/reports/count`, config));
    return r?.openTotal ?? r?.openMessages ?? 0;
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

  async topics(roomId?: number, limit = 100): Promise<AdminTopic[]> {
    return unwrap(await api.get(`${ROOT}/topics`, { params: { roomId, limit } }));
  },
  async createTopic(roomId: number, req: TopicRequest): Promise<AdminTopic> {
    return unwrap(await api.post(`${ROOT}/${roomId}/topics`, req));
  },
  async updateTopic(topicId: number, req: TopicRequest): Promise<AdminTopic> {
    return unwrap(await api.put(`${ROOT}/topics/${topicId}`, req));
  },
  async topicAction(topicId: number, action: TopicAction, days?: number): Promise<AdminTopic> {
    return unwrap(await api.post(`${ROOT}/topics/${topicId}/action`, { action, days }));
  },
  /** Konu fotoğrafı; dönen kimlik konu kaydında mediaIds olarak gönderilir. */
  async uploadTopicImage(roomId: number, file: File): Promise<UploadedMedia> {
    const form = new FormData();
    form.append('file', file);
    return unwrap(await api.post(`${ROOT}/${roomId}/media`, form, { headers: { 'Content-Type': 'multipart/form-data' } }));
  },
  async comments(filter: { roomId?: number; topicId?: number }, limit = 100): Promise<AdminComment[]> {
    return unwrap(await api.get(`${ROOT}/comments`, { params: { ...filter, limit } }));
  },
  async hideComment(id: number): Promise<void> {
    await api.post(`${ROOT}/comments/${id}/hide`);
  },
  async unhideComment(id: number): Promise<void> {
    await api.post(`${ROOT}/comments/${id}/unhide`);
  },
  async topicReports(limit = 100): Promise<TopicReportItem[]> {
    return unwrap(await api.get(`${ROOT}/topic-reports`, { params: { limit } }));
  },
  async resolveTopicReport(kind: 'TOPIC' | 'COMMENT', id: number, action: ResolveAction, silenceHours?: number): Promise<void> {
    await api.post(`${ROOT}/topic-reports/${kind}/${id}/resolve`, { action, silenceHours });
  },
};
