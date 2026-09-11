/**
 * NB yüzey dili — sayfaların paylaştığı hazır stil parçaları.
 *
 * `nbBrand.ts` renkleri ve ölçekleri tanımlıyor ama sayfalar onları her
 * seferinde kendi `sx` bloklarında yeniden birleştiriyordu: aynı filtre çipi
 * dört ekranda dört ayrı yazımla duruyor, seçili satır kimi yerde mavi kimi
 * yerde griydi. Buradaki fonksiyonlar o birleştirmeyi tek yerde yapar.
 *
 * Hepsi düz nesne döndürür (MUI `SxProps` uyumlu), bileşen değil: bir
 * `<Box>` içine de, bir `<Button>` içine de aynı şekilde geçer.
 */

import type { SxProps, Theme } from '@mui/material';
import { nb, nbRadius, nbType } from '../../../theme/nbBrand';

/** Kart / panel: 1px kenarlık, 12px köşe, gölge yok. */
export const nbCard: SxProps<Theme> = {
    bgcolor: nb.surface,
    border: `1px solid ${nb.border}`,
    borderRadius: `${nbRadius.card}px`,
    boxShadow: 'none',
    minWidth: 0,
};

/** Kart içi bölüm ayracı — kenarlıktan bir ton açık. */
export const nbDividerLine = `1px solid ${nb.divider}`;

/** Büyük harf etiket: 10px, 0.12em, 600. */
export const nbLabel: SxProps<Theme> = {
    ...nbType.label,
    color: nb.textFaint,
    lineHeight: 1.4,
};

/** Breadcrumb — etiketten biraz daha geniş aralıklı. */
export const nbCrumb: SxProps<Theme> = {
    ...nbType.crumb,
    color: nb.textFaint,
};

/** Sayfa başlığı — Instrument Serif 34/400. */
export const nbPageTitle: SxProps<Theme> = {
    ...nbType.pageTitle,
    color: nb.text,
    m: 0,
};

/** Sayısal/teknik alan — rakam genişliği sabit olmalı. */
export const nbMono: SxProps<Theme> = {
    fontFamily: nbType.mono,
    fontVariantNumeric: 'tabular-nums',
};

/**
 * Filtre çipi.
 *
 * Açık/kapalı ayrımı renk tonuyla değil doluluk ile yapılır: seçili çip
 * lacivert dolgu, seçilmemiş çip beyaz zemin. Aksan altını buraya sokmak
 * "birincil aksiyon" işaretini ucuzlatırdı.
 */
export function nbChip(active: boolean): SxProps<Theme> {
    return {
        border: `1px solid ${active ? nb.navy : nb.inputBorder}`,
        bgcolor: active ? nb.navy : '#fff',
        color: active ? '#fff' : nb.textMuted,
        borderRadius: `${nbRadius.pill}px`,
        px: 1.375,
        py: 0.625,
        fontSize: 11.5,
        fontWeight: active ? 600 : 400,
        lineHeight: 1.3,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        textTransform: 'none',
        minWidth: 0,
        '&:hover': { bgcolor: active ? nb.navyDeep : nb.inputBg, borderColor: active ? nb.navyDeep : nb.textFaint },
    };
}

/** Durum rozeti tonları — açık zemin + koyu metin. */
export type NbTone = 'good' | 'warn' | 'bad' | 'neutral' | 'info';

const TONE: Record<NbTone, { bg: string; fg: string }> = {
    good: { bg: nb.greenTint, fg: nb.green },
    warn: { bg: nb.amberTint, fg: nb.amber },
    bad: { bg: nb.redTint, fg: nb.red },
    neutral: { bg: '#f2f1ec', fg: '#7b858c' },
    info: { bg: '#f0f3f5', fg: '#4a545c' },
};

/** Durum rozeti: 10.5px, 600, radius 5, açık zemin + koyu metin. */
export function nbPill(tone: NbTone): SxProps<Theme> {
    const t = TONE[tone];
    return {
        display: 'inline-block',
        bgcolor: t.bg,
        color: t.fg,
        fontSize: 10.5,
        fontWeight: 600,
        lineHeight: 1.5,
        borderRadius: `${nbRadius.badge}px`,
        px: 1,
        py: 0.375,
        whiteSpace: 'nowrap',
    };
}

/**
 * Seçili liste satırı — soluk yeşil zemin + sol iç 3px yeşil çizgi.
 *
 * Çizgi `box-shadow: inset` ile çiziliyor, kenarlıkla değil: kenarlık satırın
 * genişliğini 3px değiştirir ve seçim değiştikçe tablo kolonları kayar.
 */
export function nbSelectedRow(selected: boolean): SxProps<Theme> {
    return {
        bgcolor: selected ? '#f2f6f4' : 'transparent',
        boxShadow: selected ? `inset 3px 0 0 ${nb.green}` : 'none',
        '&:hover': { bgcolor: selected ? '#f2f6f4' : nb.inputBg },
    };
}

/** Birincil aksiyon — lacivert dolgu. Altın yalnız CTA'nın kendisinde. */
export const nbPrimaryBtn: SxProps<Theme> = {
    border: 'none',
    bgcolor: nb.navy,
    color: '#fff',
    borderRadius: `${nbRadius.control}px`,
    px: 1.875,
    py: 1.125,
    fontSize: 12.5,
    fontWeight: 600,
    lineHeight: 1.2,
    textTransform: 'none',
    boxShadow: 'none',
    '&:hover': { bgcolor: nb.navyDeep, boxShadow: 'none' },
};

/** Altın CTA — sayfada en fazla bir tane. Karar anının kendisi. */
export const nbGoldBtn: SxProps<Theme> = {
    ...nbPrimaryBtn,
    bgcolor: nb.gold,
    color: nb.navy,
    '&:hover': { bgcolor: '#c2952d', boxShadow: 'none' },
};

/** İkincil aksiyon — beyaz zemin, 1px kenarlık. */
export const nbSecondaryBtn: SxProps<Theme> = {
    border: `1px solid ${nb.inputBorder}`,
    bgcolor: '#fff',
    color: '#4a545c',
    borderRadius: `${nbRadius.control}px`,
    px: 1.875,
    py: 1.125,
    fontSize: 12.5,
    fontWeight: 400,
    lineHeight: 1.2,
    textTransform: 'none',
    boxShadow: 'none',
    '&:hover': { bgcolor: nb.inputBg, borderColor: nb.textFaint, boxShadow: 'none' },
};

/** Kart içi küçük aksiyon — satır sonundaki tek butonlar için. */
export const nbQuietBtn: SxProps<Theme> = {
    border: `1px solid ${nb.inputBorder}`,
    bgcolor: nb.inputBg,
    color: '#26313a',
    borderRadius: `${nbRadius.controlSm}px`,
    px: 1.25,
    py: 0.875,
    fontSize: 11.5,
    fontWeight: 500,
    lineHeight: 1.2,
    textTransform: 'none',
    boxShadow: 'none',
    '&:hover': { bgcolor: '#f0eee7', boxShadow: 'none' },
};

/** Girdi kutusu — arama ve metin alanları. */
export const nbInput: SxProps<Theme> = {
    '& .MuiOutlinedInput-root': {
        bgcolor: nb.inputBg,
        borderRadius: `${nbRadius.control}px`,
        fontSize: 12.5,
        '& fieldset': { borderColor: nb.inputBorder },
        '&:hover fieldset': { borderColor: nb.textFaint },
        '&.Mui-focused fieldset': { borderColor: nb.navy, borderWidth: 1 },
    },
    '& .MuiOutlinedInput-input': { py: 1.125, px: 1.375 },
};

/**
 * Esnek kolon kabı.
 *
 * `grid-template-columns` sabit piksel track ile kurulduğunda dar ekranda
 * yatay kaydırma çıkıyordu. Kolonlar `flex: <grow> 1 <basis>` ile tanımlanır;
 * basis'in altına düşünce kendiliğinden alt alta yığılır.
 */
export const nbColumns: SxProps<Theme> = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 2,
    alignItems: 'flex-start',
};

/** Bir kolon: `nbColumn(3, 520)` → geniş ekranda 3 pay, 520px altında yığılır. */
export function nbColumn(grow: number, basis: number): SxProps<Theme> {
    return { flex: `${grow} 1 ${basis}px`, minWidth: 0 };
}

/**
 * Tablo satırı ızgarası.
 *
 * Kolon şablonu başlık ve satırlarda birebir aynı olmak zorunda; ikisini iki
 * ayrı yerde yazmak kaymaya yol açıyordu. Şablon tek sabit, iki yerde okunur.
 */
export function nbGrid(template: string): SxProps<Theme> {
    return {
        display: 'grid',
        gridTemplateColumns: template,
        gap: 1.25,
        alignItems: 'center',
    };
}

/** Tablo başlık şeridi. */
export function nbHeadRow(template: string): SxProps<Theme> {
    return {
        ...(nbGrid(template) as object),
        px: 2,
        py: 1.125,
        borderBottom: nbDividerLine,
        ...(nbLabel as object),
    };
}

/** Yatay taşan içerik (geniş tablo) yalnız kendi kabında kaysın. */
export const nbScrollX: SxProps<Theme> = { overflowX: 'auto', minWidth: 0 };
