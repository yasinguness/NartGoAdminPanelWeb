/**
 * Telefon numarasından aksiyon bağlantıları.
 *
 * Panel numarayı yalnız metin olarak gösteriyordu; admin WhatsApp'tan yazmak
 * istediğinde numarayı elle kopyalayıp telefonunda aratıyordu. Numara zaten
 * elimizde olduğuna göre bağlantıyı kurabiliriz.
 *
 * Kurallar backend'deki `ExternalContactLink` ile aynı tutuluyor: Türkiye
 * varsayılan ülke, yerel yazımlar (`0545…`, `545…`, `+90…`, `0090…`) E.164'e
 * çevriliyor. İki yerde iki farklı normalleştirme, aynı numaranın iki farklı
 * bağlantı üretmesi demekti.
 */

/** E.164 biçimi (`+905454566440`). Çevrilemiyorsa `null`. */
export function nbNormalizePhone(raw?: string | null): string | null {
  if (!raw) return null;
  let d = raw.replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('90') && d.length === 12) return `+${d}`;
  if (d.startsWith('0') && d.length === 11) return `+90${d.slice(1)}`;
  if (/^[1-9]\d{9}$/.test(d)) return `+90${d}`;
  // Yabancı numara: 8-15 hane arası olduğu gibi kabul.
  if (d.length >= 8 && d.length <= 15) return `+${d}`;
  return null;
}

/** Okunabilir biçim: `+90 545 456 64 40`. Çevrilemezse ham değeri döndürür. */
export function nbFormatPhone(raw?: string | null): string {
  const e164 = nbNormalizePhone(raw);
  if (!e164) return (raw ?? '').trim();
  if (e164.startsWith('+90') && e164.length === 13) {
    const n = e164.slice(3);
    return `+90 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6, 8)} ${n.slice(8)}`;
  }
  return e164;
}

/**
 * WhatsApp web/masaüstü bağlantısı.
 *
 * `text` verilirse mesaj hazır gelir ama GÖNDERİLMEZ; admin yollamadan önce
 * okur ve düzenler. Hazır metni otomatik göndermek, yanlış kişiye giden bir
 * mesajı geri alınamaz hâle getirirdi.
 */
export function nbWhatsAppLink(raw?: string | null, text?: string): string | null {
  const e164 = nbNormalizePhone(raw);
  if (!e164) return null;
  const base = `https://wa.me/${e164.slice(1)}`;
  return text && text.trim() ? `${base}?text=${encodeURIComponent(text.trim())}` : base;
}

/** `tel:` bağlantısı — masaüstünde yazılım telefonu, mobilde arama ekranı. */
export function nbTelLink(raw?: string | null): string | null {
  const e164 = nbNormalizePhone(raw);
  return e164 ? `tel:${e164}` : null;
}
