/**
 * TicketStats — Hiyerarşik metrik kartları
 * 2 büyük kart (Toplam + Gelir) + 4 küçük kart (Aktif, Giriş, İptal, İade)
 */
import { Box, Typography, Paper, alpha, useTheme } from '@mui/material';

interface Stats {
  total: number;
  active: number;
  checkedIn: number;
  cancelled: number;
  refunded: number;
  revenue: number;
  currency: string;
}

interface Props {
  stats: Stats;
}

export default function TicketStats({ stats }: Props) {
  const theme = useTheme();

  // Sadece başarılı siparişlerden gelen gelir
  const paidRevenue = stats.revenue;

  return (
    <Box sx={{ mb: 3 }}>
      {/* Birincil metrikler — büyük kartlar */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
        {/* Toplam Bilet */}
        <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
            Toplam Bilet
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
            <Typography variant="h3" fontWeight={800} fontFamily="monospace">{stats.total}</Typography>
            <Typography variant="body2" color="text.secondary">{stats.active} aktif</Typography>
          </Box>
          {/* Mini progress */}
          <Box sx={{ mt: 1.5, height: 6, borderRadius: 3, bgcolor: alpha(theme.palette.divider, 0.5), overflow: 'hidden', display: 'flex' }}>
            <Box sx={{ width: `${stats.total > 0 ? (stats.active / stats.total) * 100 : 0}%`, bgcolor: theme.palette.success.main, borderRadius: 3 }} />
            <Box sx={{ width: `${stats.total > 0 ? (stats.checkedIn / stats.total) * 100 : 0}%`, bgcolor: theme.palette.info.main }} />
            <Box sx={{ width: `${stats.total > 0 ? (stats.cancelled / stats.total) * 100 : 0}%`, bgcolor: theme.palette.error.main }} />
          </Box>
        </Paper>

        {/* Mevcut Gelir */}
        <Paper sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: alpha(theme.palette.success.main, 0.2), bgcolor: alpha(theme.palette.success.main, 0.03), boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
            Mevcut Gelir
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
            <Typography variant="h3" fontWeight={800} fontFamily="monospace" color="success.main">
              ₺{paidRevenue.toLocaleString('tr-TR')}
            </Typography>
            <Typography variant="body2" color="text.secondary">{stats.currency}</Typography>
          </Box>
          <Typography variant="caption" color="text.disabled" sx={{ mt: 0.5, display: 'block' }}>
            Sadece başarılı ödemelerden
          </Typography>
        </Paper>
      </Box>

      {/* İkincil metrikler — küçük kartlar */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 1.5 }}>
        {[
          { label: 'Aktif', value: stats.active, color: theme.palette.success.main },
          { label: 'Giriş Yapan', value: stats.checkedIn, color: theme.palette.info.main },
          { label: 'İptal', value: stats.cancelled, color: theme.palette.error.main },
          { label: 'İade', value: stats.refunded, color: theme.palette.warning.main },
        ].map((s, i) => (
          <Paper key={i} sx={{ p: 1.5, borderRadius: 2.5, border: '1px solid', borderColor: 'divider', textAlign: 'center', boxShadow: 'none' }}>
            <Typography variant="h5" fontWeight={800} fontFamily="monospace" sx={{ color: s.color }}>
              {s.value}
            </Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" fontSize={9}>
              {s.label}
            </Typography>
          </Paper>
        ))}
      </Box>
    </Box>
  );
}
