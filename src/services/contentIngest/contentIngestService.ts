import { api } from '../api';
import type { ApiResponse } from '../../types/api';

export interface IngestConfig {
  id: number;
  publishIntervalDays: number;
  itemsPerRun: number;
  enabled: boolean;
  lastPublishedAt: string | null;
}

export interface IngestSource {
  id: string;
  name: string;
  baseUrl: string;
  type: 'WORDPRESS' | 'BLOGGER' | 'HTML_SCRAPE';
  langFilter: string;
  defaultCategory: string;
  enabled: boolean;
  lastCursor: string | null;
  lastRunAt: string | null;
}

export interface PoolItem {
  id: string;
  title: string;
  summary?: string;
  category?: string;
  sourceName?: string;
  sourceUrl?: string;
  language?: string;
  coverMedia?: { originalUrl?: string } | null;
  publishedAt?: string | null;
}

export interface IngestConfigUpdate {
  publishIntervalDays?: number;
  itemsPerRun?: number;
  enabled?: boolean;
}

function unwrap<T>(payload: T | ApiResponse<T>): T {
  if (payload && typeof payload === 'object' && 'data' in (payload as ApiResponse<T>)) {
    return (payload as ApiResponse<T>).data;
  }
  return payload as T;
}

const BASE = '/content/admin/ingest';

export const contentIngestService = {
  async getConfig(): Promise<IngestConfig> {
    const res = await api.get<IngestConfig | ApiResponse<IngestConfig>>(`${BASE}/config`);
    return unwrap(res.data);
  },

  async updateConfig(body: IngestConfigUpdate): Promise<IngestConfig> {
    const res = await api.put<IngestConfig | ApiResponse<IngestConfig>>(`${BASE}/config`, body);
    return unwrap(res.data);
  },

  async listSources(): Promise<IngestSource[]> {
    const res = await api.get<IngestSource[] | ApiResponse<IngestSource[]>>(`${BASE}/sources`);
    return unwrap(res.data) ?? [];
  },

  async toggleSource(id: string, value: boolean): Promise<IngestSource> {
    const res = await api.put<IngestSource | ApiResponse<IngestSource>>(
      `${BASE}/sources/${id}/enabled`,
      null,
      { params: { value } }
    );
    return unwrap(res.data);
  },

  async getPool(page = 0, size = 20): Promise<PoolItem[]> {
    const res = await api.get<PoolItem[] | ApiResponse<PoolItem[]>>(`${BASE}/pool`, {
      params: { page, size },
    });
    return unwrap(res.data) ?? [];
  },

  async reject(id: string): Promise<void> {
    await api.post(`${BASE}/pool/${id}/reject`);
  },

  async runIngestNow(): Promise<number> {
    const res = await api.post<number | ApiResponse<number>>(`${BASE}/run`);
    return unwrap(res.data) ?? 0;
  },

  async runDripNow(count = 1): Promise<number> {
    const res = await api.post<number | ApiResponse<number>>(`${BASE}/drip/run`, null, {
      params: { count },
    });
    return unwrap(res.data) ?? 0;
  },
};
