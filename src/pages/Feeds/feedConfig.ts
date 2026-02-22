import { FeedStatus } from '../../types/feed/feedModel';

export const STATUS_CONFIG: Record<FeedStatus, { label: string; color: string; bg: string; border: string }> = {
  [FeedStatus.UPLOADED_RAW]:        { label: 'Yüklendi (Raw)',       color: '#4b5563', bg: '#f3f4f6', border: '#e5e7eb' },
  [FeedStatus.PROCESSING_METADATA]: { label: 'Metadata İşleniyor',    color: '#2563eb', bg: '#dbeafe', border: '#bfdbfe' },
  [FeedStatus.READY_RAW]:           { label: 'MP4 Hazır',            color: '#059669', bg: '#d1fae5', border: '#a7f3d0' },
  [FeedStatus.PROCESSING_STREAM]:   { label: 'Yayın Hazırlanıyor',    color: '#7c3aed', bg: '#ede9fe', border: '#ddd6fe' },
  [FeedStatus.READY_STREAM]:        { label: 'Yayın Hazır (HLS)',    color: '#0891b2', bg: '#cffafe', border: '#a5f3fc' },
  [FeedStatus.PROCESSING]:          { label: 'İşleniyor',            color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
  [FeedStatus.PENDING_APPROVAL]:    { label: 'Onay Bekliyor',        color: '#b45309', bg: '#fff7ed', border: '#ffedd5' },
  [FeedStatus.APPROVED]:            { label: 'Onaylandı',            color: '#15803d', bg: '#dcfce7', border: '#bbf7d0' },
  [FeedStatus.REJECTED]:            { label: 'Reddedildi',           color: '#dc2626', bg: '#fee2e2', border: '#fecaca' },
  [FeedStatus.FAILED]:              { label: 'Hata',                 color: '#991b1b', bg: '#fef2f2', border: '#fee2e2' },
  [FeedStatus.REPORTED]:            { label: 'Şikayet Edildi',        color: '#7f1d1d', bg: '#fff1f1', border: '#fee2e2' },
};

export const SAVED_VIEWS = [
  { label: 'Tüm Videolar', filter: null },
  { label: 'Onay Bekleyenler', filter: FeedStatus.PENDING_APPROVAL },
  { label: 'Yayındakiler (Onaylı)', filter: FeedStatus.APPROVED },
  { label: 'Hatalı Videolar', filter: FeedStatus.FAILED },
  { label: 'Şikayet Edilenler', filter: FeedStatus.REPORTED },
];

export const SORT_OPTIONS = [
  { label: 'En Yeni', value: 'newest' },
  { label: 'En Eski', value: 'oldest' },
  { label: 'Başlık (A-Z)', value: 'title' },
];
