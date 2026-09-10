export const toNumber = (v: number | string | undefined | null): number => {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const formatMoney = (v: number | string | undefined | null, currency = 'TRY'): string => {
  const n = toNumber(v);
  const sym = currency === 'TRY' ? '₺' : currency;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M ${sym}`;
  if (Math.abs(n) >= 10_000) return `${(n / 1_000).toFixed(1)}K ${sym}`;
  return `${n.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ${sym}`;
};

export const formatMoneyFull = (v: number | string | undefined | null, currency = 'TRY'): string => {
  const n = toNumber(v);
  const sym = currency === 'TRY' ? '₺' : currency;
  return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${sym}`;
};

export const formatAge = (hours?: number): string => {
  if (hours === undefined || hours === null) return '—';
  if (hours < 1) return `${Math.round(hours * 60)}dk`;
  if (hours < 24) return `${hours.toFixed(1)}s`;
  return `${(hours / 24).toFixed(1)}g`;
};

export const safeDate = (iso?: string | null): string => {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('tr-TR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
};

export const STATUS_COLOR: Record<string, string> = {
  PENDING: '#f59e0b',
  PROCESSING: '#3b82f6',
  COMPLETED: '#22c55e',
  FAILED: '#ef4444',
};

export const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Bekliyor',
  PROCESSING: 'İşleniyor',
  COMPLETED: 'Tamamlandı',
  FAILED: 'Başarısız',
};
