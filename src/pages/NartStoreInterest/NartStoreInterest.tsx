import { useQuery } from '@tanstack/react-query';
import {
  Box, Container, Typography, Stack, Paper, Table, TableHead, TableRow,
  TableCell, TableBody, TableContainer, CircularProgress, Alert, IconButton, Tooltip,
} from '@mui/material';
import { Refresh as RefreshIcon } from '@mui/icons-material';
import { nartStoreInterestService } from '../../services/nartstore/nartStoreInterestService';

/**
 * NartStore "Açılınca haber ver" listesi: açılış bildiriminin gideceği kişiler.
 *
 * Satıcı başvuruları burada değil; NartStore'un kendi panelinde
 * (store-onboarding-requests) onaylanıyor.
 */
export default function NartStoreInterest() {
  const summary = useQuery({
    queryKey: ['nartstore-interest', 'summary'],
    queryFn: () => nartStoreInterestService.summary(),
  });
  const rows = useQuery({
    queryKey: ['nartstore-interest', 'list'],
    queryFn: () => nartStoreInterestService.list(),
  });

  const refresh = () => {
    summary.refetch();
    rows.refetch();
  };

  const items = rows.data?.content ?? [];
  const date = (iso?: string) =>
    iso ? new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>NartStore İlgi Listesi</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Ana sayfadaki NartStore kartında "Açılınca haber ver" diyenler. Satıcı başvuruları
            NartStore panelinde onaylanır.
          </Typography>
        </Box>
        <Tooltip title="Yenile">
          <IconButton onClick={refresh} size="small"><RefreshIcon /></IconButton>
        </Tooltip>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2, mb: 3, maxWidth: 320 }}>
        <Typography variant="body2" color="text.secondary">Açılınca haber bekleyen</Typography>
        <Typography variant="h4" fontWeight={700}>
          {summary.isLoading ? '…' : (summary.data?.notifyCount ?? 0)}
        </Typography>
      </Paper>

      <Paper variant="outlined">
        {rows.isError && <Alert severity="error" sx={{ m: 2 }}>Liste yüklenemedi.</Alert>}
        {rows.isLoading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={24} /></Box>
        ) : items.length === 0 ? (
          <Typography sx={{ p: 4, textAlign: 'center' }} color="text.secondary">Henüz kayıt yok.</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Kişi</TableCell>
                  <TableCell>Tarih</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{r.displayName || '—'}</Typography>
                      <Typography variant="caption" color="text.secondary">{r.userEmail}</Typography>
                    </TableCell>
                    <TableCell>{date(r.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
    </Container>
  );
}
