import { Box, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import type { OnboardingFunnel } from '../../services/dashboardStatsService';

/**
 * "Kayıt hunisi" — kaydolan kişi nerede duruyor.
 *
 * Adımlar sunucuda kümülatif tutuluyor: her adım kendinden öncekini
 * tamamlayanların alt kümesi. Bu yüzden yüzdeler `count / cohortSize` ile
 * hesaplanıyor, sunucudan yüzde beklenmiyor.
 *
 * En büyük düşüş burada bulunup işaretleniyor; asıl bilgi "kaç kişi kaldı"
 * değil, "nerede kaybediyoruz".
 *
 * `FIRST_ACTION` bu karşılaştırmanın dışında. O adım 7 günlük bir pencereye
 * bağlı: 30 günlük kohortta dün kaydolan biri henüz penceresini doldurmadığı
 * hâlde "katkı yok" sayılıyor, yani kohortun kabaca dörtte biri sistematik
 * olarak eksik görünüyor. Oradaki farkı "en büyük düşüş" diye işaretlemek
 * admin'i ölçüm artefaktının peşine düşürürdü. Profil adımlarında böyle bir
 * zaman bağımlılığı yok, karşılaştırma onlar arasında adil.
 */
const TIME_BOXED = new Set(['FIRST_ACTION']);
export default function OnboardingFunnelCard({ data }: { data: OnboardingFunnel }) {
  const total = data.cohortSize;

  // Ardışık iki adım arasındaki en büyük kayıp; zamana bağlı adım hariç.
  let worst: { key: string; lost: number } | null = null;
  for (let i = 1; i < data.steps.length; i += 1) {
    const step = data.steps[i];
    if (TIME_BOXED.has(step.key)) continue;
    const lost = data.steps[i - 1].count - step.count;
    if (lost > 0 && (!worst || lost > worst.lost)) worst = { key: step.key, lost };
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
      <Stack direction="row" alignItems="baseline" sx={{ mb: 2 }}>
        <Typography fontWeight={700} sx={{ flex: 1 }}>Kayıt hunisi</Typography>
        <Typography variant="caption" color="text.secondary">
          Son {data.days} gün · {total.toLocaleString('tr-TR')} kişi
        </Typography>
      </Stack>

      {total === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Son {data.days} günde yeni kayıt yok.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {data.steps.map((s) => {
            const pct = Math.round((s.count / total) * 100);
            const isWorst = worst?.key === s.key;
            const timeBoxed = TIME_BOXED.has(s.key);
            return (
              <Box key={s.key}>
                <Stack direction="row" alignItems="baseline" spacing={1}>
                  <Typography variant="body2" sx={{ flex: 1 }}>{s.label}</Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {s.count.toLocaleString('tr-TR')} · %{pct}
                  </Typography>
                </Stack>
                <LinearProgress
                  variant="determinate" value={pct}
                  sx={{
                    mt: 0.5, height: 6, borderRadius: 3, bgcolor: 'action.hover',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: isWorst ? '#c99a2e' : timeBoxed ? '#8aa79a' : '#1f5132',
                      borderRadius: 3,
                    },
                  }}
                />
                {isWorst && worst && (
                  <Typography variant="caption" sx={{ color: '#8a6100' }}>
                    En büyük düşüş bu adımda: {worst.lost.toLocaleString('tr-TR')} kişi.
                  </Typography>
                )}
                {timeBoxed && (
                  <Typography variant="caption" color="text.secondary">
                    7 günlük pencere: son bir haftada kaydolanların süresi henüz dolmadı,
                    bu oran zamanla yükselir.
                  </Typography>
                )}
              </Box>
            );
          })}
        </Stack>
      )}
    </Paper>
  );
}
