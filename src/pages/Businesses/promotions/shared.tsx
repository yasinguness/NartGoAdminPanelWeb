import type { ReactNode } from 'react';
import { Box, Chip, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import CheckIcon from '@mui/icons-material/CheckCircleOutline';
import WarnIcon from '@mui/icons-material/ErrorOutline';
import {
  CHECK_LABEL, KNOWN_CHECKS, MISSING_LABEL, SCOPE_LABEL,
  type PromotionMissing, type PromotionPurchase, type PromotionScope,
} from '../../../services/business/promotionAdminService';

/** Tasarımın renk dili: koyu yeşil onay, kum sarısı dikkat. */
export const TONE = {
  go: '#1f5132',
  goBg: '#e8f0e9',
  warn: '#8a6100',
  warnBg: '#fdf4e3',
  warnBorder: '#e8d5a8',
  quiet: '#6b7280',
};

export const tl = (n: number | null | undefined, dash = '—') =>
  n == null ? dash : `${Number(n).toLocaleString('tr-TR')} ₺`;

export const fmtDate = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }) : '—';

export const fmtDateShort = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString('tr-TR') : '—';

/** Bugünden hedefe kalan tam gün. Geçmişse negatif. */
export function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) return null;
  const a = new Date();
  a.setHours(0, 0, 0, 0);
  const b = new Date(end);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/** Kayıt şu an yayında mı: ödendi/tanımlandı ve tarih aralığı bugünü kapsıyor. */
export function isLive(p: PromotionPurchase, now = Date.now()): boolean {
  if (p.status !== 'ACTIVE' || !p.startsAt || !p.endsAt) return false;
  return new Date(p.startsAt).getTime() <= now && new Date(p.endsAt).getTime() >= now;
}

/** "İl · Samsun", "Bölge · İç Anadolu", "Tüm Türkiye" */
export function scopeLine(p: PromotionPurchase): string {
  const parts = [SCOPE_LABEL[p.scope]];
  if (p.province && p.scope !== 'COUNTRY') parts.push(titleCase(p.province));
  const base = parts.join(' · ');
  return p.includeStory ? `${base} + hikâye` : base;
}

/**
 * Yer adına bulunma eki: Samsun'da, Kayseri'de, Sinop'ta, Uşak'ta.
 * Son ünlüye göre kalın/ince, son sesin sertliğine göre d/t.
 */
export function locative(name: string): string {
  const clean = name.trim();
  if (!clean) return clean;
  const back = 'aıouAIOU';
  const vowels = 'aeıioöuüAEIİOÖUÜ';
  let lastVowel = '';
  for (const ch of clean) if (vowels.includes(ch)) lastVowel = ch;
  const hard = 'fstkçşhpFSTKÇŞHP'.includes(clean[clean.length - 1]);
  const d = hard ? 't' : 'd';
  const v = back.includes(lastVowel) ? 'a' : 'e';
  return `${clean}'${d}${v}`;
}

export const titleCase = (s: string) =>
  s.replace(/\S+/g, (w) => w.charAt(0).toLocaleUpperCase('tr') + w.slice(1).toLocaleLowerCase('tr'));

/** Üst şeritteki dört kutu. */
export function StatTile({ label, value, hint, tone, active, onClick }: {
  label: string; value: string; hint?: string; tone?: 'warn'; active?: boolean; onClick?: () => void;
}) {
  return (
    <Paper
      variant="outlined"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      sx={{
        px: 2.5, py: 2, minWidth: 0, borderRadius: 2.5,
        borderColor: active ? TONE.warnBorder : 'divider',
        bgcolor: active ? TONE.warnBg : 'background.paper',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color .15s',
        '&:hover': onClick ? { borderColor: active ? TONE.warn : 'text.secondary' } : undefined,
      }}
    >
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography sx={{ fontSize: { xs: 24, md: 30 }, fontWeight: 700, lineHeight: 1.15, mt: 0.25, whiteSpace: 'nowrap' }}>{value}</Typography>
      {hint && (
        <Typography variant="caption" sx={{ color: tone === 'warn' ? TONE.warn : 'text.secondary' }}>
          {hint}
        </Typography>
      )}
    </Paper>
  );
}

/** Başlık + açıklama + sağda eylem taşıyan kart kabuğu. */
export function SectionCard({ title, description, action, children, dense }: {
  title: string; description?: string; action?: ReactNode; children: ReactNode; dense?: boolean;
}) {
  return (
    <Paper variant="outlined" sx={{ borderRadius: 2.5, mb: 2.5, overflow: 'hidden' }}>
      <Stack direction="row" alignItems="flex-start" spacing={2} sx={{ px: 2.5, pt: 2.25, pb: dense ? 1 : 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography fontWeight={700}>{title}</Typography>
          {description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>{description}</Typography>
          )}
        </Box>
        {action}
      </Stack>
      {children}
    </Paper>
  );
}

/**
 * Uygunluk kontrolleri. Sunucu yalnız EKSİKLERİ döndürür (`eligibility.missing`),
 * dolayısıyla listede olmayan her kontrol geçmiş sayılır — tasarımdaki
 * "✓ Fotoğraf / ! Fotoğraf yok" ayrımı buradan çıkıyor.
 *
 * Tanınan listenin dışında bir kod gelirse onu da basıyoruz. Sessizce atmak
 * tezat üretiyordu: sunucu OWNERSHIP eksiğiyle `ok: false` dönerken panel o
 * kodu bilmediği için tüm çipleri yeşil gösteriyor, altında da "öne
 * çıkarılamaz" yazıyordu. Sunucu yeni bir kontrol eklediğinde panel artık
 * hiç değilse kodu gösterir.
 */
export function CheckChips({ missing }: { missing: PromotionMissing[] }) {
  const list = Array.isArray(missing) ? missing : [];
  const unknown = list.filter((m) => !KNOWN_CHECKS.includes(m as typeof KNOWN_CHECKS[number]));
  const all: string[] = [...KNOWN_CHECKS, ...unknown];
  return (
    <>
      {all.map((c) => {
        const bad = list.includes(c);
        return (
          <Chip
            key={c}
            size="small"
            icon={bad ? <WarnIcon sx={{ fontSize: 15 }} /> : <CheckIcon sx={{ fontSize: 15 }} />}
            label={bad ? (MISSING_LABEL[c] ?? c) : (CHECK_LABEL[c] ?? c)}
            sx={{
              height: 24, fontSize: 12, fontWeight: 600,
              bgcolor: bad ? TONE.warnBg : TONE.goBg,
              color: bad ? TONE.warn : TONE.go,
              '& .MuiChip-icon': { color: 'inherit', ml: '6px' },
            }}
          />
        );
      })}
    </>
  );
}

/** "Samsun 2/3 dolu" — doluluk rozeti. */
export function SlotChip({ label, used, limit }: { label: string; used: number; limit: number }) {
  const full = used >= limit;
  return (
    <Chip
      size="small"
      label={`${label} ${used}/${limit} dolu`}
      sx={{
        height: 24, fontSize: 12, fontWeight: 600,
        bgcolor: full ? TONE.warnBg : 'action.hover',
        color: full ? TONE.warn : 'text.secondary',
      }}
    />
  );
}

/** Kalan gün + tükenme çubuğu. Son 3 günde sarıya döner. */
export function RemainingBar({ endsAt, days }: { endsAt?: string | null; days: number }) {
  const left = daysUntil(endsAt);
  if (left == null) return <Typography variant="body2" color="text.secondary">—</Typography>;
  const urgent = left <= 3;
  const pct = days > 0 ? Math.max(0, Math.min(100, (left / days) * 100)) : 0;
  return (
    <Box sx={{ minWidth: 110 }}>
      <Typography variant="body2" fontWeight={600} sx={{ color: urgent ? TONE.warn : 'text.primary' }}>
        {left <= 0 ? 'bugün bitiyor' : `${left} gün`}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          mt: 0.5, height: 4, borderRadius: 2, bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': { bgcolor: urgent ? '#c99a2e' : TONE.go, borderRadius: 2 },
        }}
      />
    </Box>
  );
}

export function TrialBadge() {
  return (
    <Chip size="small" label="Deneme"
      sx={{ height: 20, fontSize: 11, fontWeight: 700, bgcolor: TONE.goBg, color: TONE.go }} />
  );
}

export const scopeOrder: PromotionScope[] = ['CITY', 'REGION', 'COUNTRY'];
