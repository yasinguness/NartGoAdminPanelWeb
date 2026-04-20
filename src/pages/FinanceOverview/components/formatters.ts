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
  return `${n.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} ${sym}`;
};

export const formatMoneyFull = (v: number | string | undefined | null, currency = 'TRY'): string => {
  const n = toNumber(v);
  const sym = currency === 'TRY' ? '₺' : currency;
  return `${n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${sym}`;
};

export const formatPct = (v: number | string | undefined | null, digits = 1): string => {
  const n = toNumber(v);
  return `%${n.toFixed(digits)}`;
};

export const formatCount = (v: number | string | undefined | null): string => {
  return toNumber(v).toLocaleString('tr-TR');
};
