import { api } from '../api';
import { ApiResponse } from '../../types/api';

const basePath = '/auth/admin/raffle-campaigns';

export type RaffleStatus = 'DRAFT' | 'ACTIVE' | 'ENDED' | 'CANCELLED';
export type RafflePopupFrequency = 'ONCE' | 'DAILY' | 'EVERY_OPEN';
/** XP: hak XP'den türetilir. JOIN: kullanıcı "Çekilişe katıl" der, bir kez. */
export type RaffleEntryMode = 'XP' | 'JOIN';

export interface RafflePrize {
  id?: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  quantity: number;
  sortOrder?: number;
}

export interface RaffleCampaign {
  id: string;
  name: string;
  prize: string;
  description?: string | null;
  startsAt: string;
  endsAt: string;
  status: RaffleStatus;
  xpPerEntry: number;
  maxEntriesPerUser?: number | null;
  popupEnabled: boolean;
  popupTitle?: string | null;
  popupBody?: string | null;
  popupImageUrl?: string | null;
  popupCtaText?: string | null;
  popupFrequency: RafflePopupFrequency;
  createdAt?: string | null;
  winnersDrawn: boolean;
  eligibleCount?: number | null;
  entryMode: RaffleEntryMode;
  rules?: string | null;
  coverImageUrl?: string | null;
  prizes: RafflePrize[];
}

export interface UpsertRaffleCampaign {
  name?: string;
  prize?: string;
  description?: string;
  startsAt?: string;
  endsAt?: string;
  status?: RaffleStatus;
  xpPerEntry?: number;
  maxEntriesPerUser?: number;
  popupEnabled?: boolean;
  popupTitle?: string;
  popupBody?: string;
  popupImageUrl?: string;
  popupCtaText?: string;
  popupFrequency?: RafflePopupFrequency;
  entryMode?: RaffleEntryMode;
  rules?: string;
  coverImageUrl?: string;
  /** Verilirse hediye listesinin tamamı bununla değişir. */
  prizes?: RafflePrize[];
}

export interface RaffleEntry {
  userId: string;
  displayName?: string | null;
  email?: string | null;
  campaignXp: number;
  entries: number;
  /** JOIN: katılım zamanı. */
  joinedAt?: string | null;
}

export interface RaffleWinner {
  userId: string;
  displayName?: string | null;
  email?: string | null;
  rank: number;
  entryCount: number;
  campaignXp: number;
  drawnAt: string;
  drawnBy?: string | null;
  /** JOIN: kazanılan hediye. */
  prizeId?: string | null;
  prizeTitle?: string | null;
}

export const raffleAdminService = {
  async list(): Promise<RaffleCampaign[]> {
    const res = await api.get<ApiResponse<RaffleCampaign[]>>(basePath);
    return res.data.data ?? [];
  },

  async get(id: string): Promise<RaffleCampaign> {
    const res = await api.get<ApiResponse<RaffleCampaign>>(`${basePath}/${id}`);
    return res.data.data as RaffleCampaign;
  },

  async create(body: UpsertRaffleCampaign): Promise<RaffleCampaign> {
    const res = await api.post<ApiResponse<RaffleCampaign>>(basePath, body);
    return res.data.data as RaffleCampaign;
  },

  async update(id: string, body: UpsertRaffleCampaign): Promise<RaffleCampaign> {
    const res = await api.patch<ApiResponse<RaffleCampaign>>(`${basePath}/${id}`, body);
    return res.data.data as RaffleCampaign;
  },

  /** Yumuşak silme: uygulamadan kalkar; katılım ve kazanan kayıtları kalır. */
  async remove(id: string): Promise<void> {
    await api.delete(`${basePath}/${id}`);
  },

  async entries(id: string, limit = 100): Promise<RaffleEntry[]> {
    const res = await api.get<ApiResponse<RaffleEntry[]>>(`${basePath}/${id}/entries`, {
      params: { limit },
    });
    return res.data.data ?? [];
  },

  /** Ağırlıklı çekim — rank 1 asıl, 2+ yedek. force: erken/yeniden çekim onayı. */
  async draw(id: string, count: number, force: boolean): Promise<RaffleWinner[]> {
    const res = await api.post<ApiResponse<RaffleWinner[]>>(`${basePath}/${id}/draw`, null, {
      params: { count, force },
    });
    return res.data.data ?? [];
  },

  async winners(id: string): Promise<RaffleWinner[]> {
    const res = await api.get<ApiResponse<RaffleWinner[]>>(`${basePath}/${id}/winners`);
    return res.data.data ?? [];
  },
};
