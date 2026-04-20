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

export const formatAge = (minutes?: number): string => {
  if (minutes === undefined || minutes === null) return '—';
  if (minutes < 60) return `${Math.round(minutes)}dk`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)}s`;
  return `${(minutes / 1440).toFixed(1)}g`;
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

export const TYPE_LABEL: Record<string, string> = {
  STALE_PENDING: 'Takılı Kalmış',
  ORPHANED_CHECKOUT: 'Boşta Checkout',
  PROVIDER_DB_DRIFT: 'Provider ↔ DB Uyumsuz',
  DUPLICATE_TRANSACTION: 'Mükerrer İşlem',
};

export const TYPE_COLOR: Record<string, string> = {
  STALE_PENDING: '#f59e0b',
  ORPHANED_CHECKOUT: '#64748b',
  PROVIDER_DB_DRIFT: '#ef4444',
  DUPLICATE_TRANSACTION: '#ef4444',
};

export const SEVERITY_COLOR: Record<string, string> = {
  low: '#64748b',
  medium: '#f59e0b',
  high: '#ef4444',
};

export const SEVERITY_LABEL: Record<string, string> = {
  low: 'Düşük',
  medium: 'Orta',
  high: 'Kritik',
};
