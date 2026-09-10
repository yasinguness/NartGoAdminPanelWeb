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

export const relativeTime = (iso?: string | null): string => {
  if (!iso) return '—';
  try {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60_000) return `${Math.round(diff / 1000)}sn önce`;
    if (diff < 3_600_000) return `${Math.round(diff / 60_000)}dk önce`;
    if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}sa önce`;
    if (diff < 30 * 86_400_000) return `${Math.round(diff / 86_400_000)}g önce`;
    return new Date(iso).toLocaleDateString('tr-TR');
  } catch {
    return '—';
  }
};

export const unwrap = <T>(v: any): T | null => {
  if (!v) return null;
  if (typeof v === 'object' && 'data' in v && 'success' in v) return (v.data ?? null) as T | null;
  return v as T;
};
