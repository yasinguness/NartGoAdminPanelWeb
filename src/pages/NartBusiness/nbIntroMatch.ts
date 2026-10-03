import type { NbMatchSuggestion, NbIntroduction } from '../../services/nartbusiness/nbAdminService';
import type { NbMember } from '../../services/nartbusiness/nbTypes';

/**
 * Tanıştır ekranının yardımcıları: öneri gerekçesi, pasiflik, geçmiş ve
 * mesaj şablonları.
 *
 * Gerekçe ihale eşleşmesindeki ilkeyle aynı (nbTenderMatch): skor yanında
 * yazılı, cümle skoru tekrar etmiyor, skorun **nereden** geldiğini söylüyor
 * ve abartmıyor.
 */

/** 60 gündür uygulamaya girmeyen üye pasif sayılır (kullanıcı kararı, 2026-10-03). */
export const INACTIVE_DAYS = 60;

export function daysSince(iso?: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 86_400_000);
}

/**
 * Son aktiflik etiketi. `nbLastActiveAt` yalnız üye listesi uçlarında dolu;
 * tekil okumada null gelir, o durumda hiçbir şey söylemiyoruz (null ≠ hiç).
 */
export function activityLabel(m?: Pick<NbMember, 'nbLastActiveAt'> | null): { text: string; inactive: boolean } | null {
  if (!m || m.nbLastActiveAt === undefined) return null;
  if (m.nbLastActiveAt === null) return { text: 'Uygulamayı hiç açmadı', inactive: true };
  const d = daysSince(m.nbLastActiveAt);
  if (d === null) return null;
  if (d <= 1) return { text: 'Bugün aktif', inactive: false };
  if (d < 30) return { text: `${d} gün önce aktif`, inactive: false };
  const months = Math.floor(d / 30);
  return { text: `${months} ay önce aktif`, inactive: d >= INACTIVE_DAYS };
}

/** Benzerlik 0..1 — motor cosine distance (0..2) döndürüyor. */
export function similarity(s: NbMatchSuggestion): number | null {
  if (s.cosineDistance == null) return null;
  return 1 - s.cosineDistance / 2;
}

export interface MatchReason {
  /** Tek cümle. */
  sentence: string;
  /** Kısa etiketler — satırda cümlenin yanında. */
  tags: string[];
}

/**
 * "Neden önerildi" cümlesi. Eşikler bilerek tutucu: profil benzerliği
 * 0.85 altındaysa "benzer" demiyoruz, çünkü motor her adaya bir benzerlik
 * veriyor ve düşük değeri gerekçe gibi sunmak yanıltıcı olur.
 */
export function matchReason(
  s: NbMatchSuggestion,
  sectorName: (code?: string | null) => string | null,
  anchorSectorCode?: string | null,
): MatchReason {
  const parts: string[] = [];
  const tags: string[] = [];

  if ((s.valueChainWeight ?? 0) > 0) {
    const a = sectorName(anchorSectorCode);
    const b = sectorName(s.sectorCode);
    parts.push(a && b ? `sektörleri tedarik zincirinde bağlı (${a} ↔ ${b})` : 'sektörleri tedarik zincirinde bağlı');
    tags.push('Tedarik zinciri');
  }
  if (s.sameCity) {
    parts.push(s.city ? `ikisi de ${s.city}'de` : 'aynı şehirdeler');
    tags.push(s.city ? `Aynı şehir · ${s.city}` : 'Aynı şehir');
  }
  const sim = similarity(s);
  if (sim !== null && sim >= 0.85) {
    parts.push('profil açıklamaları birbirine çok yakın');
    tags.push('Profil benzerliği yüksek');
  } else if (sim !== null && sim >= 0.78) {
    parts.push('profil açıklamaları benzer');
    tags.push('Profil benzerliği');
  }
  if (s.verifiedBusiness) tags.push('Doğrulanmış işletme');

  if (parts.length === 0) {
    return { sentence: 'Belirgin bir gerekçe yok; puan genel profil yakınlığından geliyor.', tags };
  }
  const sentence = parts.join(', ');
  return { sentence: sentence.charAt(0).toUpperCase() + sentence.slice(1) + '.', tags };
}

/** Puan 0-100 tamsayı — ihale eşleşmesiyle aynı ölçek. */
export function scorePct(score?: number | null): number | null {
  if (score == null) return null;
  return Math.max(0, Math.min(100, Math.round(score * 100)));
}

/** A'nın geçmiş tanıştırmalarından, karşı taraf → en son kayıt haritası. */
export function pastByCounterpart(memberId: string, intros: NbIntroduction[]): Map<string, NbIntroduction> {
  const map = new Map<string, NbIntroduction>();
  for (const i of intros) {
    const other = i.memberAId === memberId ? i.memberBId : i.memberAId;
    const prev = map.get(other);
    if (!prev || new Date(i.createdAt) > new Date(prev.createdAt)) map.set(other, i);
  }
  return map;
}

export function formatDate(iso?: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Mesaj şablonları ────────────────────────────────────────────────────────

export interface IntroSide {
  company: string;
  city?: string | null;
  sector?: string | null;
  isProfessional?: boolean;
  title?: string | null;
}

export interface IntroTemplate {
  key: string;
  label: string;
  /** Alıcıya giden metin: "you" alıcı, "other" tanıştırılan taraf. */
  build: (you: IntroSide, other: IntroSide) => string;
}

function describe(o: IntroSide): string {
  const bits = [o.sector, o.city].filter(Boolean).join(', ');
  return bits ? `${o.company} (${bits})` : o.company;
}

/**
 * Senaryo şablonları. Metin taraflı kuruluyor: her taraf kendi işine göre
 * karşı tarafı neden tanıması gerektiğini okuyor. Admin gönderimden önce
 * düzenliyor; şablon bir başlangıç, son metin değil.
 */
export const INTRO_TEMPLATES: IntroTemplate[] = [
  {
    key: 'supply',
    label: 'Tedarikçi ↔ alıcı',
    build: (you, other) =>
      `${describe(other)} ile tanışmanızı istiyoruz. ${you.sector ? `${you.sector} alanındaki işiniz` : 'İşiniz'} için tedarik ya da hizmet tarafında birbirinize iş çıkarabileceğinizi düşünüyoruz.`,
  },
  {
    key: 'same-sector',
    label: 'Aynı sektörde iş birliği',
    build: (_you, other) =>
      `${describe(other)} sizinle aynı alanda çalışıyor. Büyük işlerde ortaklık, taşeronluk ya da kapasite paylaşımı için konuşmanızın faydalı olacağını düşünüyoruz.`,
  },
  {
    key: 'regional',
    label: 'Bölgesel ortaklık',
    build: (you, other) =>
      `${describe(other)} de ${other.city ?? you.city ?? 'bölgenizde'} faaliyet gösteriyor. Aynı bölgede olduğunuz için birbirinize müşteri ve iş yönlendirebilirsiniz.`,
  },
  {
    key: 'professional',
    label: 'Profesyonel ↔ işletme',
    build: (you, other) =>
      other.isProfessional
        ? `${other.company}${other.title ? ` bünyesinde ${other.title}` : ''} olarak çalışan bir üyemizle tanışmanızı istiyoruz. Kurumunun ihtiyaçları sizin sunduklarınızla örtüşebilir.`
        : `${describe(other)} ile tanışmanızı istiyoruz. ${you.isProfessional ? 'Kurumunuzun ihtiyaçları için' : 'İşiniz için'} doğru muhatap olabilir.`,
  },
];

