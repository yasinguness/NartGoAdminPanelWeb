import { useState } from 'react';
import {
  Box, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography,
} from '@mui/material';
import type { PromotionPurchase } from '../../../services/business/promotionAdminService';
import { RemainingBar, TrialBadge, scopeLine } from './shared';

const PAGE = 5;

/**
 * Yayında olan öne çıkarmalar. Kalan süreye göre sıralı: biteni en üstte
 * görmek, yenileme konuşmasını zamanında yapabilmek demek.
 */
export default function LiveTab({ rows }: { rows: PromotionPurchase[] }) {
  const [limit, setLimit] = useState(PAGE);

  if (rows.length === 0) {
    return (
      <Box sx={{ px: 2.5, py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          Şu an yayında öne çıkarma yok. Satın alma geldiğinde ya da deneme tanımladığında burada görünür.
        </Typography>
      </Box>
    );
  }

  const shown = rows.slice(0, limit);
  const rest = rows.length - shown.length;

  return (
    <>
      <Box sx={{ overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 680 }}>
          <TableHead>
            <TableRow>
              <TableCell>İşletme</TableCell>
              <TableCell sx={{ width: 150 }}>Kalan</TableCell>
              <TableCell align="right">Görüntülenme</TableCell>
              <TableCell align="right">Tıklama</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shown.map((p) => (
              <TableRow key={p.id} hover>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" fontWeight={600}>
                      {p.businessName ?? p.businessId}
                    </Typography>
                    {p.trial && <TrialBadge />}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {scopeLine(p)}
                    {p.trial && p.note ? ` · ${p.note}` : ''}
                  </Typography>
                </TableCell>
                <TableCell><RemainingBar endsAt={p.endsAt} days={p.days} /></TableCell>
                <TableCell align="right">{p.views.toLocaleString('tr-TR')}</TableCell>
                <TableCell align="right">{p.clicks.toLocaleString('tr-TR')}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      {rest > 0 && (
        <Box sx={{ px: 2.5, py: 1.5 }}>
          <Button size="small" onClick={() => setLimit(limit + PAGE)}>
            {rest} tane daha göster
          </Button>
        </Box>
      )}
    </>
  );
}
