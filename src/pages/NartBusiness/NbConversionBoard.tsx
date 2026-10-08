/**
 * Dönüşüm Panosu — denemeden ödemeye geçişin altı metriği, hedefleri,
 * deneme bitiş haftasına göre kohortlar ve üç karar kapısı (analiz, 7 Ekim 2026).
 *
 * Hedefler ve kapı tarihleri Operasyon Ayarları → Dönüşüm hedefleri'nden.
 * Bir kapı geçilmezse sonraki aşamaya geçilmez; hangi halkanın kırık
 * olduğuna bakılır (değer ulaşmıyor / ilgi yok / ödeme yok).
 */
import { useEffect, useState } from 'react';
import { Alert, Box, CircularProgress, LinearProgress, Stack, Typography } from '@mui/material';
import { nbOpsService, type NbConversionBoard } from '../../services/nartbusiness/nbOpsService';
import { nbErrorMessage } from '../../services/nartbusiness/nbErrorMessage';
import { NbPageHeader, nbCard, nbDividerLine, nbGrid, nbHeadRow, nbPill } from '../../components/nartbusiness/ui';
import { nb } from '../../theme/nbBrand';

const day = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
const COHORT_GRID = '160px 110px 110px 110px minmax(0,1fr)';

const GATE_TONE = { PASSED: 'good', FAILED: 'bad', PENDING: 'info', MANUAL: 'neutral' } as const;
const GATE_LABEL = { PASSED: 'Geçildi', FAILED: 'Geçilmedi', PENDING: 'Tarihi gelmedi', MANUAL: 'Yönetici değerlendirmesi' } as const;

export default function NbConversionBoard() {
  const [board, setBoard] = useState<NbConversionBoard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    nbOpsService
      .conversionBoard()
      .then(setBoard)
      .catch((e) => setError(nbErrorMessage(e, 'Pano yüklenemedi.')));
  }, []);

  return (
    <Box>
      <NbPageHeader
        crumb="NartBusiness · Genel"
        title="Dönüşüm Panosu"
        subtitle="Deneme döneminden ücretli üyeliğe geçiş: temel göstergeler, hedefler ve değerlendirme tarihleri. Hedefler Operasyon Ayarları'ndan düzenlenir."
      />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {!board ? (
        !error && <CircularProgress size={24} />
      ) : (
        <>
          {!board.activityDataAvailable && (
            <Alert severity="warning" sx={{ mb: 2 }}>Son giriş verisi alınamadı; haftalık aktif üye sayısı görüntülenemiyor.</Alert>
          )}

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 1.5, mb: 2 }}>
            {board.metrics.map((m) => {
              const pctOfTarget = m.value == null || m.target === 0 ? 0 : Math.min(100, (m.value / m.target) * 100);
              const done = m.value != null && m.value >= m.target;
              return (
                <Box key={m.key} sx={{ ...(nbCard as object), p: 2 }}>
                  <Typography sx={{ fontSize: 11.5, color: nb.textMuted }}>{m.label}</Typography>
                  <Stack direction="row" alignItems="baseline" spacing={0.75} sx={{ mt: 0.5 }}>
                    <Typography sx={{ fontSize: 24, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {m.value == null ? '—' : m.unit === 'PERCENT' ? `%${m.value}` : m.value}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: nb.textFaint }}>
                      hedef {m.unit === 'PERCENT' ? `%${m.target}` : m.target}
                      {m.unit === 'COUNT' && m.denominator != null ? ` / ${m.denominator}` : ''}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={pctOfTarget}
                    sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: nb.divider, '& .MuiLinearProgress-bar': { bgcolor: done ? nb.green : nb.amber } }}
                  />
                  <Typography sx={{ fontSize: 11, color: nb.textFaint, mt: 0.75 }}>{m.hint}</Typography>
                </Box>
              );
            })}
          </Box>

          <Box sx={{ ...(nbCard as object), p: 2, mb: 2 }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, mb: 1 }}>Değerlendirme tarihleri</Typography>
            {board.gates.map((g) => (
              <Stack key={g.key} direction="row" spacing={1.5} alignItems="center" sx={{ py: 1, borderTop: `1px solid ${nb.divider}` }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 600, width: 110 }}>{day(g.date)}</Typography>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontSize: 12.5 }}>{g.question}</Typography>
                  <Typography sx={{ fontSize: 11, color: nb.textFaint }}>{g.detail}</Typography>
                </Box>
                <Box sx={nbPill(GATE_TONE[g.status])}>{GATE_LABEL[g.status]}</Box>
              </Stack>
            ))}
            <Typography sx={{ fontSize: 11.5, color: nb.textFaint, mt: 1 }}>
              Kapı geçilmezse: değer ulaşmıyorsa kanalı değiştirin (daha çok telefon); değer ulaşıp ilgi yoksa eşleştirmeyi
              düzeltin; ilgi var ama ödeme yoksa fiyatı ya da ödeme biçimini sorgulayın.
            </Typography>
          </Box>

          <Box sx={{ ...(nbCard as object), overflow: 'hidden' }}>
            <Typography sx={{ fontSize: 14, fontWeight: 600, px: 2, pt: 1.5, pb: 1 }}>Deneme bitiş haftasına göre dönüşüm</Typography>
            <Box sx={nbHeadRow(COHORT_GRID)}>
              <Box>HAFTA</Box>
              <Box>ÜYE</Box>
              <Box>BİTEN</Box>
              <Box>ÖDEYEN</Box>
              <Box>DÖNÜŞÜM</Box>
            </Box>
            {board.cohorts.length === 0 ? (
              <Typography sx={{ fontSize: 12.5, color: nb.textFaint, p: 2 }}>Henüz deneme dönemi tamamlanan üye bulunmuyor.</Typography>
            ) : (
              board.cohorts.map((c) => (
                <Box key={c.weekStart} sx={{ ...(nbGrid(COHORT_GRID) as object), px: 2, py: 1, borderBottom: nbDividerLine }}>
                  <Typography sx={{ fontSize: 12.5 }}>{day(c.weekStart)}</Typography>
                  <Typography sx={{ fontSize: 12.5 }}>{c.members}</Typography>
                  <Typography sx={{ fontSize: 12.5 }}>{c.ended}</Typography>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{c.paid}</Typography>
                  <Typography sx={{ fontSize: 12.5, color: nb.textMuted }}>
                    {c.ended > 0 ? `%${Math.round((c.paid / c.ended) * 100)} (${c.paid}/${c.ended})` : 'deneme devam ediyor'}
                  </Typography>
                </Box>
              ))
            )}
          </Box>
        </>
      )}
    </Box>
  );
}
