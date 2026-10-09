import { api } from '../api';

export interface NartStoreInterest {
  id: string;
  userEmail: string;
  displayName?: string | null;
  createdAt?: string;
}

export interface NartStoreInterestSummary {
  notifyCount: number;
}

interface Page<T> {
  content: T[];
  totalElements: number;
}

interface ApiEnvelope<T> {
  data: T;
}

const baseUrl = '/businesses/nartstore-interest';

export const nartStoreInterestService = {
  async summary(): Promise<NartStoreInterestSummary> {
    const res = await api.get<ApiEnvelope<NartStoreInterestSummary>>(`${baseUrl}/summary`);
    return res.data.data;
  },

  async list(page = 0, size = 100): Promise<Page<NartStoreInterest>> {
    const res = await api.get<ApiEnvelope<Page<NartStoreInterest>>>(baseUrl, { params: { page, size } });
    return res.data.data ?? { content: [], totalElements: 0 };
  },
};
