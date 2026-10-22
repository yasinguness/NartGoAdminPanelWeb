import { api } from '../api';

/**
 * Admin öne çıkarma (business-service `FeaturedAdminController`). Yalnız genel öne çıkarma var;
 * yerel öne çıkarma şimdilik kapalı. Sahiplik aranmaz, işletmenin sahibi olmasa da çalışır.
 */

export interface FeaturedItem {
  id: string;
  name: string;
  profileImageUrl: string | null;
  city: string | null;
  categoryName: string | null;
  status: string | null;
  featuredStartDate: string | null;
  featuredEndDate: string | null;
  remainingDays: number | null;
  views: number;
  clicks: number;
}

export interface FeaturedList { items: FeaturedItem[]; count: number; endingSoon: number }

const ROOT = '/businesses/admin/featured';
const unwrap = <T,>(response: { data: unknown }): T => {
  const body = response.data as { data?: T } | T;
  return (body && typeof body === 'object' && 'data' in (body as object) ? (body as { data: T }).data : body) as T;
};

export const featuredAdminService = {
  async list(): Promise<FeaturedList> {
    return unwrap(await api.get(ROOT));
  },
  /** days ya da endDate (yyyy-MM-dd). extend: hâlâ öne çıkan kayıtta süre mevcut bitişe eklenir. */
  async feature(id: string, opts: { days?: number; endDate?: string; extend?: boolean }): Promise<FeaturedItem> {
    return unwrap(await api.put(`${ROOT}/${id}`, null, { params: opts }));
  },
  async unfeature(id: string): Promise<void> {
    await api.delete(`${ROOT}/${id}`);
  },
};

export const featuredErrorText = (e: unknown) => {
  const err = e as { response?: { data?: { message?: string } }; message?: string };
  return err?.response?.data?.message ?? err?.message ?? 'İşlem tamamlanamadı.';
};

export const formatDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—');
