import {
  RaffleCampaign,
  RaffleEntryMode,
  RafflePopupFrequency,
  RafflePrize,
  RaffleStatus,
  UpsertRaffleCampaign,
} from '../../services/raffle/raffleAdminService';

// ── Etiketler ──

export const STATUS_META: Record<RaffleStatus, { label: string; color: 'default' | 'success' | 'warning' | 'error' }> = {
  DRAFT: { label: 'Taslak', color: 'default' },
  ACTIVE: { label: 'Yayında', color: 'success' },
  ENDED: { label: 'Bitti', color: 'warning' },
  CANCELLED: { label: 'İptal', color: 'error' },
};

export const FREQ_LABEL: Record<RafflePopupFrequency, string> = {
  ONCE: 'Bir kez',
  DAILY: 'Günde bir',
  EVERY_OPEN: 'Her açılışta',
};

// ── Tarih ──

export function fmtDate(iso?: string | Date | null): string {
  if (!iso) return '—';
  const d = iso instanceof Date ? iso : new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('tr-TR', { dateStyle: 'medium', timeStyle: 'short' });
}

const validDate = (d: Date | null): d is Date => !!d && !Number.isNaN(d.getTime());

/** "7 gün", "1 gün 6 saat", "5 saat". */
export function durationText(start: Date | null, end: Date | null): string | null {
  if (!validDate(start) || !validDate(end) || end <= start) return null;
  const hours = Math.round((end.getTime() - start.getTime()) / 3_600_000);
  const days = Math.floor(hours / 24);
  const rest = hours % 24;
  if (days === 0) return `${hours} saat`;
  return rest ? `${days} gün ${rest} saat` : `${days} gün`;
}

/**
 * Listede ve detayda tek bakışta durum: kayıtlı durum + tarihler + kura.
 * "Yayında" kaydı süresi dolmuşsa "Kura bekliyor" olur; admin ne yapacağını görür.
 */
export function phaseOf(c: RaffleCampaign, now = Date.now()): {
  label: string;
  color: 'default' | 'success' | 'warning' | 'error' | 'info';
} {
  if (c.status === 'CANCELLED') return { label: 'İptal', color: 'error' };
  if (c.winnersDrawn) return { label: 'Kura çekildi', color: 'warning' };
  if (c.status === 'DRAFT') return { label: 'Taslak', color: 'default' };
  if (c.status === 'ENDED') return { label: 'Bitti', color: 'warning' };
  const start = new Date(c.startsAt).getTime();
  const end = new Date(c.endsAt).getTime();
  if (now < start) return { label: 'Başlayacak', color: 'info' };
  if (now > end) return { label: 'Kura bekliyor', color: 'warning' };
  return { label: 'Yayında', color: 'success' };
}

// ── Form ──

export interface PrizeRow extends RafflePrize {
  /** Satır anahtarı; sıralama değişince React girdileri karıştırmasın. */
  key: string;
}

export interface FormState {
  name: string;
  entryMode: RaffleEntryMode;
  description: string;
  startsAt: Date | null;
  endsAt: Date | null;
  status: RaffleStatus;
  // XP
  prize: string;
  xpPerEntry: number;
  maxEntriesPerUser: string; // '' = sınırsız
  // JOIN
  prizes: PrizeRow[];
  coverImageUrl: string;
  rules: string;
  // Açılış penceresi
  popupEnabled: boolean;
  popupTitle: string;
  popupBody: string;
  popupImageUrl: string;
  popupCtaText: string;
  popupFrequency: RafflePopupFrequency;
}

let keySeq = 0;
export const newPrize = (p: Partial<RafflePrize> = {}): PrizeRow => ({
  key: `p${++keySeq}`,
  title: p.title ?? '',
  quantity: p.quantity ?? 1,
  imageUrl: p.imageUrl ?? '',
  description: p.description ?? '',
});

export const emptyForm = (): FormState => ({
  name: '',
  entryMode: 'JOIN',
  description: '',
  startsAt: null,
  endsAt: null,
  status: 'DRAFT',
  prize: '',
  xpPerEntry: 50,
  maxEntriesPerUser: '',
  prizes: [newPrize()],
  coverImageUrl: '',
  rules: '',
  popupEnabled: false,
  popupTitle: '',
  popupBody: '',
  popupImageUrl: '',
  popupCtaText: '',
  popupFrequency: 'DAILY',
});

const toDate = (iso?: string | null): Date | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

export function campaignToForm(c: RaffleCampaign): FormState {
  return {
    name: c.name,
    entryMode: c.entryMode ?? 'XP',
    description: c.description ?? '',
    startsAt: toDate(c.startsAt),
    endsAt: toDate(c.endsAt),
    status: c.status,
    prize: c.prize ?? '',
    xpPerEntry: c.xpPerEntry,
    maxEntriesPerUser: c.maxEntriesPerUser ? String(c.maxEntriesPerUser) : '',
    prizes: c.prizes?.length ? c.prizes.map((p) => newPrize(p)) : [newPrize()],
    coverImageUrl: c.coverImageUrl ?? '',
    rules: c.rules ?? '',
    popupEnabled: c.popupEnabled,
    popupTitle: c.popupTitle ?? '',
    popupBody: c.popupBody ?? '',
    popupImageUrl: c.popupImageUrl ?? '',
    popupCtaText: c.popupCtaText ?? '',
    popupFrequency: c.popupFrequency ?? 'DAILY',
  };
}

export type FormErrors = Partial<Record<'name' | 'startsAt' | 'endsAt' | 'prize' | 'prizes' | 'xpPerEntry', string>> & {
  prizeRows?: Record<string, string>;
};

/**
 * Alan alan hata. Mesaj alanın altında görünür; ne eksik ve nasıl düzelir
 * söyler. Tarih seçiciden gelen yarım değer (gün seçili, saat yok) "geçersiz
 * tarih" olarak yakalanır: eskiden bu durum "ad ve tarih zorunlu" diye
 * dolu alanlar için uyarı veriyordu.
 */
export function validateForm(f: FormState): FormErrors {
  const e: FormErrors = {};
  const join = f.entryMode === 'JOIN';
  if (!f.name.trim()) e.name = 'Çekilişe bir ad ver.';
  if (!f.startsAt) e.startsAt = 'Başlangıç tarihini ve saatini seç.';
  else if (!validDate(f.startsAt)) e.startsAt = 'Tarih ya da saat eksik. Gün, ay, yıl ve saati tamamla.';
  if (!f.endsAt) e.endsAt = 'Bitiş tarihini ve saatini seç.';
  else if (!validDate(f.endsAt)) e.endsAt = 'Tarih ya da saat eksik. Gün, ay, yıl ve saati tamamla.';
  else if (validDate(f.startsAt) && f.endsAt <= f.startsAt) e.endsAt = 'Bitiş, başlangıçtan sonra olmalı.';

  if (join) {
    const rows: Record<string, string> = {};
    f.prizes.forEach((p) => {
      const touched = (p.imageUrl ?? '').trim() || (p.description ?? '').trim();
      if (!p.title.trim() && touched) rows[p.key] = 'Hediyenin adını yaz ya da satırı sil.';
    });
    if (Object.keys(rows).length) e.prizeRows = rows;
    if (!f.prizes.some((p) => p.title.trim())) e.prizes = 'En az bir hediye ekle.';
  } else {
    if (!f.prize.trim()) e.prize = 'Ödülü yaz (örn. Akordeon).';
    if (!(f.xpPerEntry >= 1)) e.xpPerEntry = 'Hak başına XP en az 1 olmalı.';
  }
  return e;
}

export const hasErrors = (e: FormErrors) =>
  Object.entries(e).some(([k, v]) => (k === 'prizeRows' ? v && Object.keys(v).length > 0 : !!v));

export function formToRequest(f: FormState, prizesLocked: boolean): UpsertRaffleCampaign {
  const join = f.entryMode === 'JOIN';
  const name = f.name.trim();
  return {
    name,
    // JOIN: özet ödül metni hediye adlarından sunucuda doldurulur.
    prize: join ? undefined : f.prize.trim(),
    entryMode: f.entryMode,
    rules: f.rules,
    coverImageUrl: f.coverImageUrl.trim(),
    prizes:
      join && !prizesLocked
        ? f.prizes
            .filter((p) => p.title.trim())
            .map((p) => ({
              title: p.title.trim(),
              quantity: Math.max(1, Number(p.quantity) || 1),
              imageUrl: p.imageUrl?.trim() || undefined,
              description: p.description?.trim() || undefined,
            }))
        : undefined,
    description: f.description,
    startsAt: f.startsAt?.toISOString(),
    endsAt: f.endsAt?.toISOString(),
    status: f.status,
    xpPerEntry: f.xpPerEntry,
    // 0 gönderilirse sunucu sınırsız (null) yapar
    maxEntriesPerUser: f.maxEntriesPerUser === '' ? 0 : Number(f.maxEntriesPerUser),
    popupEnabled: f.popupEnabled,
    // Boş bırakılan pencere metinleri çekilişin kendi bilgisinden dolar.
    popupTitle: f.popupTitle.trim() || (f.popupEnabled ? name : ''),
    popupBody: f.popupBody,
    popupImageUrl: f.popupImageUrl.trim() || (f.popupEnabled ? f.coverImageUrl.trim() : ''),
    popupCtaText: f.popupCtaText.trim() || (f.popupEnabled && join ? 'Çekilişe katıl' : ''),
    popupFrequency: f.popupFrequency,
  };
}
