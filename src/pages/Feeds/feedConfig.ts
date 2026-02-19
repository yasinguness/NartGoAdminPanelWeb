import { FeedStatus } from '../../types/feed/feedModel';

export const STATUS_CONFIG: Record<FeedStatus, { label: string; color: string; bg: string; border: string }> = {
  [FeedStatus.PENDING]:   { label: 'Beklemede',  color: '#b45309', bg: '#fef3c7', border: '#fde68a' },
  [FeedStatus.APPROVED]:  { label: 'Onaylı',     color: '#15803d', bg: '#dcfce7', border: '#bbf7d0' },
  [FeedStatus.PUBLISHED]: { label: 'Yayında',    color: '#1d4ed8', bg: '#dbeafe', border: '#bfdbfe' },
  [FeedStatus.REJECTED]:  { label: 'Reddedildi', color: '#dc2626', bg: '#fee2e2', border: '#fecaca' },
  [FeedStatus.ARCHIVED]:  { label: 'Arşivlendi', color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb' },
  [FeedStatus.DRAFT]:     { label: 'Taslak',     color: '#374151', bg: '#f3f4f6', border: '#e5e7eb' },
};

export const SAVED_VIEWS = [
  { label: 'Tüm Videolar', filter: null },
  { label: 'Bekleyenler', filter: FeedStatus.PENDING },
  { label: 'Yayındakiler', filter: FeedStatus.PUBLISHED },
  { label: 'Reddedilenler', filter: FeedStatus.REJECTED },
];

export const SORT_OPTIONS = [
  { label: 'En Yeni', value: 'newest' },
  { label: 'En Eski', value: 'oldest' },
  { label: 'Başlık (A-Z)', value: 'title' },
];
