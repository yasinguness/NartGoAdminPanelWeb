/**
 * NartGo Tarih Standardı
 *
 * Backend iki farklı format döner:
 *   1. ZonedDateTime (event-service): "2026-04-28T17:00:00Z" veya "2026-04-12T22:01:34+03:00"
 *   2. LocalDateTime (ticket-service): "2026-04-13T21:00:00" (timezone bilgisi YOK)
 *
 * Kural:
 *   - Timezone bilgisi olmayan tarihler UTC kabul edilir (Z eklenir)
 *   - Tüm gösterimler kullanıcının local timezone'unda yapılır
 *   - Tüm gönderimler UTC (toISOString → "...Z") olarak yapılır
 *
 * Kullanım:
 *   import { parseDate, formatDate, formatDateTime, toUTC } from '@/utils/dateUtils';
 *
 *   // Parse (backend → Date)
 *   const date = parseDate(event.eventTime);
 *   const saleStart = parseDate(ticketType.saleStartAt);
 *
 *   // Gösterim (Date → string)
 *   formatDate(date)      → "28 Nis 2026"
 *   formatDateTime(date)  → "28 Nis 2026, 20:00"
 *   formatTime(date)      → "20:00"
 *
 *   // Gönderim (Date → UTC ISO string)
 *   toUTC(date)           → "2026-04-28T17:00:00.000Z"
 */

import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

/**
 * Backend'den gelen tarih string'ini güvenli parse et.
 * Timezone bilgisi yoksa UTC kabul eder.
 */
export function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  try {
    // Zaten timezone bilgisi varsa (Z, +, -) doğrudan parse et
    if (dateStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(dateStr)) {
      return new Date(dateStr);
    }
    // Timezone bilgisi yoksa UTC kabul et
    return new Date(dateStr + 'Z');
  } catch {
    return null;
  }
}

/**
 * Date → UTC ISO string (backend'e gönderim için)
 */
export function toUTC(date: Date | null | undefined): string | null {
  if (!date) return null;
  return date.toISOString();
}

/**
 * Tarih gösterimi: "28 Nis 2026"
 */
export function formatDate(date: Date | string | null | undefined): string {
  const d = typeof date === 'string' ? parseDate(date) : date;
  if (!d) return '—';
  return format(d, 'dd MMM yyyy', { locale: tr });
}

/**
 * Tarih + saat gösterimi: "28 Nis 2026, 20:00"
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  const d = typeof date === 'string' ? parseDate(date) : date;
  if (!d) return '—';
  return format(d, 'dd MMM yyyy, HH:mm', { locale: tr });
}

/**
 * Sadece saat: "20:00"
 */
export function formatTime(date: Date | string | null | undefined): string {
  const d = typeof date === 'string' ? parseDate(date) : date;
  if (!d) return '—';
  return format(d, 'HH:mm', { locale: tr });
}

/**
 * Tam tarih + saat + saniye: "28.04.2026 20:00:35"
 */
export function formatDateTimeFull(date: Date | string | null | undefined): string {
  const d = typeof date === 'string' ? parseDate(date) : date;
  if (!d) return '—';
  return format(d, 'dd.MM.yyyy HH:mm:ss', { locale: tr });
}

/**
 * Etkinlik saatini, etkinliğin kendi saat diliminde (IANA, ör. "Europe/Istanbul")
 * göster. Tarayıcının değil etkinliğin yerel saatini kullanır.
 * Saat dilimi yoksa tarayıcının yerel saatine düşer (native Intl).
 *
 * formatEventDateTime("2026-04-28T17:00:00Z", "Europe/Istanbul", { hour: '2-digit', minute: '2-digit' })
 *   → "20:00"
 */
export function formatEventDateTime(
  iso: string | null | undefined,
  ianaZone?: string | null,
  opts?: Intl.DateTimeFormatOptions
): string {
  if (!iso) return '';
  const d = parseDate(iso);
  if (!d) return '';
  const tz = ianaZone && ianaZone.length > 0 ? ianaZone : undefined; // undefined => tarayıcı yereli
  return new Intl.DateTimeFormat('tr-TR', {
    ...(opts ?? { day: 'numeric', month: 'long', year: 'numeric' }),
    timeZone: tz,
  }).format(d);
}

/**
 * Etkinliğin saat dilimi etiketi: "İstanbul saati"
 */
export function eventZoneLabel(ianaZone?: string | null): string {
  if (!ianaZone) return '';
  const city = ianaZone.split('/').pop()?.replace(/_/g, ' ') ?? '';
  const tr: Record<string, string> = { Istanbul: 'İstanbul' };
  return city ? `${tr[city] ?? city} saati` : '';
}

/**
 * Göreli zaman: "2 saat önce", "5 dakika önce"
 */
export function formatRelative(date: Date | string | null | undefined): string {
  const d = typeof date === 'string' ? parseDate(date) : date;
  if (!d) return '—';
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  return `${days} gün önce`;
}
