/** Kullanıcılar sayfalarının metin yardımcıları (bileşen değil). */

/** Sunucunun hata mesajı (axios); yoksa undefined. */
export function apiMessage(e: unknown): string | undefined {
  const m = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return typeof m === 'string' ? m : undefined;
}

export function timeAgo(iso?: string | null): string {
  if (!iso) return 'Hiç girmedi';
  const d = Date.now() - new Date(iso).getTime();
  const h = Math.floor(d / 3_600_000);
  if (h < 1) return 'Az önce';
  if (h < 24) return `${h} saat önce`;
  const days = Math.floor(h / 24);
  if (days === 1) return 'Dün';
  if (days < 7) return `${days} gün önce`;
  if (days < 30) return `${Math.floor(days / 7)} hafta önce`;
  if (days < 365) return `${Math.floor(days / 30)} ay önce`;
  return `${Math.floor(days / 365)} yıl önce`;
}

/** Ad ya da e-posta yoksa (silinmiş, e-postasız hesap) boş döner; Avatar kendi simgesini gösterir. */
export const initials = (name?: string | null) =>
  (name ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toLocaleUpperCase('tr-TR'))
    .join('');
