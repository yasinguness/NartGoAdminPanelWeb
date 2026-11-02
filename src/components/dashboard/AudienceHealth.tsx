import { Box, LinearProgress, Paper, Stack, Typography } from '@mui/material';
import type { EngagementOverviewDto } from '../../types/security/loginStats';

/**
 * "Kitle sağlığı" — kaç kişi kayıtlı değil, kaçı geri geliyor.
 *
 * Aylık aktif / toplam oranı tek başına en dürüst sağlık göstergesi: kayıt
 * sayısı büyürken bu oran düşüyorsa büyüme gerçek değil. Günlük/haftalık/aylık
 * üçlüsü de sunucudaki DAU/WAU/MAU'dan geliyor, burada hesaplanmıyor.
 */
export default function AudienceHealth({ engagement, totalUsers }: {
  engagement: EngagementOverviewDto | null;
  totalUsers: number | null;
}) {
  const mau = engagement?.monthlyActiveUsers ?? null;
  const ratio = mau != null && totalUsers ? mau / totalUsers : null;
  const pct = ratio == null ? null : Math.round(ratio * 100);

  /** Yorum satırı: sayıyı okumak yerine ne anlama geldiğini yaz. */
  const verdict = (() => {
    if (pct == null) return null;
    if (pct < 15) return { text: 'Kayıt olanların çoğu ayda bir bile dönmüyor.', tone: '#8a6100' };
    if (pct < 35) return { text: 'Kayıtlıların küçük bir kısmı düzenli dönüyor.', tone: '#8a6100' };
    return { text: 'Kayıtlıların önemli kısmı ayda en az bir kez dönüyor.', tone: '#1f5132' };
  })();

  return (
    <Paper variant="outlined" sx={{ borderRadius: 3, p: 2.5 }}>
      <Stack direction="row" alignItems="baseline" sx={{ mb: 2 }}>
        <Typography fontWeight={700} sx={{ flex: 1 }}>Kitle sağlığı</Typography>
        <Typography variant="caption" color="text.secondary">
          {engagement?.asOfDate ? new Date(engagement.asOfDate).toLocaleDateString('tr-TR') : ''}
        </Typography>
      </Stack>

      <Typography variant="caption" color="text.secondary">Aylık aktif / toplam kullanıcı</Typography>
      <Stack direction="row" alignItems="baseline" spacing={1.5}>
        <Typography sx={{ fontSize: 34, fontWeight: 700, lineHeight: 1.1 }}>
          {pct == null ? '—' : `%${pct}`}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {mau != null && totalUsers
            ? `${mau.toLocaleString('tr-TR')} / ${totalUsers.toLocaleString('tr-TR')}`
            : 'veri yok'}
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate" value={Math.min(100, pct ?? 0)}
        sx={{
          mt: 1, mb: 0.75, height: 6, borderRadius: 3, bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': { bgcolor: (pct ?? 0) < 15 ? '#c99a2e' : '#1f5132', borderRadius: 3 },
        }}
      />
      {verdict && (
        <Typography variant="caption" sx={{ color: verdict.tone, display: 'block', mb: 2 }}>
          {verdict.text}
        </Typography>
      )}

      <Stack direction="row" spacing={1.5}>
        <Mini label="Günlük" value={engagement?.dailyActiveUsers} />
        <Mini label="Haftalık" value={engagement?.weeklyActiveUsers} />
        <Mini label="Aylık" value={engagement?.monthlyActiveUsers} />
      </Stack>

      {engagement && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
          Günlük/haftalık oranı %{Math.round((engagement.dauWauRatio ?? 0) * 100)} ·
          {' '}haftalık/aylık %{Math.round((engagement.wauMauRatio ?? 0) * 100)}.
          Yüksek oran, aynı kişilerin sık döndüğünü gösterir.
        </Typography>
      )}
    </Paper>
  );
}

function Mini({ label, value }: { label: string; value?: number | null }) {
  return (
    <Box sx={{ flex: 1, px: 1.5, py: 1.25, borderRadius: 2, bgcolor: 'action.hover' }}>
      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
      <Typography sx={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2 }}>
        {value == null ? '—' : value.toLocaleString('tr-TR')}
      </Typography>
    </Box>
  );
}
