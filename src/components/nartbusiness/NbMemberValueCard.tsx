/**
 * Üye sonuç kartı — platformun bu üyeye ne ulaştırdığı.
 *
 * Dört değer işareti analizdeki hedeften geliyor: deneme bitmeden üyeye en az
 * 3 ihale, 1 tanıştırma, 1 alım talebi ve profil görünürlüğünden en az ikisi
 * ulaşmalı. "—" = ilgili servise ulaşılamadı; 0 ile karıştırılmasın.
 */
import { Alert, Button, Box, CircularProgress, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { nb, nbRadius } from '../../theme/nbBrand';
import { nbOpsService, type NbValueSummary } from '../../services/nartbusiness/nbOpsService';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';

const num = (v: number | null | undefined) => (v == null ? '—' : String(v));

export function NbValueSignals({ value }: { value?: NbValueSummary | null }) {
  const signals: { key: string; label: string; on: boolean | null | undefined }[] = [
    { key: 'tender', label: 'İhale (3+)', on: value?.tenderValue },
    { key: 'intro', label: 'Tanıştırma', on: value?.introValue },
    { key: 'request', label: 'Alım talebi', on: value?.requestValue },
    { key: 'visibility', label: 'Profil ilgisi', on: value?.visibilityValue },
  ];
  return (
    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', rowGap: 0.5 }}>
      {signals.map((s) => (
        <Box
          key={s.key}
          title={s.on == null ? `${s.label}: veri yok` : s.on ? `${s.label}: karşılandı` : `${s.label}: karşılanmadı`}
          sx={{
            fontSize: 10.5,
            px: 0.75,
            py: 0.125,
            borderRadius: '999px',
            border: `1px solid ${s.on ? '#bcd8ca' : nb.border}`,
            bgcolor: s.on ? nb.greenTint : 'transparent',
            color: s.on ? nb.green : s.on == null ? nb.textFaint : nb.textMuted,
            whiteSpace: 'nowrap',
          }}
        >
          {s.on ? '✓ ' : ''}
          {s.label}
        </Box>
      ))}
    </Stack>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Box
      sx={{
        flex: '1 1 120px',
        bgcolor: nb.surface,
        border: `1px solid ${nb.divider}`,
        borderRadius: `${nbRadius.panel}px`,
        px: 1.5,
        py: 1.25,
      }}
    >
      <Typography sx={{ fontSize: 11, color: nb.textMuted }}>{label}</Typography>
      <Typography sx={{ fontSize: 20, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography>
      {hint && <Typography sx={{ fontSize: 10.5, color: nb.textFaint }}>{hint}</Typography>}
    </Box>
  );
}

export function NbValueSummaryView({ value }: { value: NbValueSummary }) {
  return (
    <Box>
      <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={1} sx={{ mb: 1.25 }}>
        <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
          Hizmet göstergeleri: {value.valueSignals}/4
        </Typography>
        <NbValueSignals value={value} />
      </Stack>
      <Typography sx={{ fontSize: 12, color: nb.textMuted, mb: 1.5 }}>İhale, tanıştırma ve ilan sayıları tüm dönemi kapsar. Hizmet göstergeleri ulaştırılan faydayı izler; kazanılan iş sayısı değildir.</Typography>
      {[value.requestsOpened, value.offersOpened, value.profileViewsTotal].some((v) => v == null) && <Alert severity="warning" sx={{ mb: 1.5 }}>Bazı servislerden veri alınamadı. “—” eksik veriyi belirtir; sıfır değildir.</Alert>}
      <Stack direction="row" flexWrap="wrap" sx={{ gap: 1 }}>
        <Stat
          label="İhale"
          value={String(value.tendersReferred)}
          hint={`${value.tendersViewed} görüntülendi, ${value.tendersInterested} ilgi, ${value.tendersBid} teklif, ${value.tendersWon} kazanıldı`}
        />
        <Stat
          label="Tanıştırma"
          value={String(value.introductions)}
          hint={`${value.introductionsMet} görüşme, ${value.introductionsSucceeded} olumlu sonuç`}
        />
        <Stat
          label="Alım talebi"
          value={num(value.requestsOpened)}
          hint={`gelen teklif: ${num(value.quotesReceived)}`}
        />
        <Stat label="Arz ilanı" value={num(value.offersOpened)} />
        <Stat
          label="Verdiği teklif"
          value={num(value.quotesGiven)}
          hint={`ilgi bildirdiği ilan: ${num(value.interestsGiven)}`}
        />
        <Stat
          label="Profil görüntülenmesi"
          value={num(value.profileViewsRecent)}
          hint={`son 30 gün (toplam ${num(value.profileViewsTotal)})`}
        />
      </Stack>
    </Box>
  );
}

/** Üye detayı sekmesi: sonuç kartını kendisi yükler. */
export default function NbMemberValueCard({ memberId }: { memberId: string }) {
  const [reload, setReload] = useState(0);
  const [value, setValue] = useState<NbValueSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setValue(null);
    setError(null);
    nbOpsService
      .valueSummary(memberId)
      .then((v) => alive && setValue(v))
      .catch((e) => alive && setError(nbErrorMessage(e, 'Faaliyet özeti yüklenemedi.')));
    return () => {
      alive = false;
    };
  }, [memberId, reload]);

  if (error) return <Alert severity="error" action={<Button onClick={() => setReload((v) => v + 1)}>Tekrar dene</Button>}>{error}</Alert>;
  if (!value) return <CircularProgress size={20} />;
  return <NbValueSummaryView value={value} />;
}
