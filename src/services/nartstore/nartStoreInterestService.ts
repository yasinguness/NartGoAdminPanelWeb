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

// ─── Satıcı başvuruları (NartStore'da tutulur; business-service admin'in
// token'ıyla NartStore'a iletir) ───────────────────────────────────────────

export type NartStoreApplicationStatus = 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'CANCELED';

export interface NartStoreApplication {
  id: string;
  status: NartStoreApplicationStatus;
  storeName: string;
  storeSlug?: string | null;
  storeId?: string | null;
  merchantType: 'INDIVIDUAL' | 'COMPANY';
  companyName?: string | null;
  taxOffice?: string | null;
  taxNumber?: string | null;
  /** Maskeli; tam değer NartStore panelinde. */
  tcknMasked?: string | null;
  ibanMasked?: string | null;
  accountHolderName?: string | null;
  whatYouSell?: string | null;
  city?: string | null;
  address?: string | null;
  rejectionReason?: string | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  applicantName?: string | null;
  applicantEmail?: string | null;
  applicantPhone?: string | null;
  applicantEmailVerified: boolean;
}

export interface NartStoreApplicationPage {
  items: NartStoreApplication[];
  total: number;
  page: number;
  limit: number;
}

const applicationsUrl = '/businesses/nartstore-applications';

export const nartStoreApplicationService = {
  async list(params: { status?: NartStoreApplicationStatus | ''; search?: string; page?: number; limit?: number }) {
    const res = await api.get<ApiEnvelope<NartStoreApplicationPage>>(applicationsUrl, {
      params: {
        status: params.status || undefined,
        search: params.search?.trim() || undefined,
        page: params.page ?? 1,
        limit: params.limit ?? 20,
      },
    });
    return res.data.data ?? { items: [], total: 0, page: 1, limit: 20 };
  },

  async pendingCount(): Promise<number> {
    const res = await api.get<ApiEnvelope<{ pendingCount: number }>>(`${applicationsUrl}/summary`);
    return res.data.data?.pendingCount ?? 0;
  },

  approve: (id: string) => api.post(`${applicationsUrl}/${id}/approve`),

  reject: (id: string, reason: string) => api.post(`${applicationsUrl}/${id}/reject`, { reason }),
};
