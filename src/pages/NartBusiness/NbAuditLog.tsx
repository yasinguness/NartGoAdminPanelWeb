import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { nbAuditService, type NbAuditRow } from '../../services/nartbusiness/nbAuditService';

function fmt(ts?: string | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('tr-TR');
}

function outcomeColor(o?: string | null): 'success' | 'error' | 'default' {
  if (!o) return 'default';
  if (o.toUpperCase() === 'SUCCESS') return 'success';
  if (o.toUpperCase() === 'FAILURE' || o.toUpperCase() === 'ERROR') return 'error';
  return 'default';
}

export default function NbAuditLog() {
  const [action, setAction] = useState('');
  const [actionDebounced, setActionDebounced] = useState('');
  const [actorUserId, setActorUserId] = useState('');
  const [actorDebounced, setActorDebounced] = useState('');
  const [days, setDays] = useState(30);

  const [rows, setRows] = useState<NbAuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setActionDebounced(action.trim()), 400);
    return () => clearTimeout(t);
  }, [action]);
  useEffect(() => {
    const t = setTimeout(() => setActorDebounced(actorUserId.trim()), 400);
    return () => clearTimeout(t);
  }, [actorUserId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await nbAuditService.list({
        action: actionDebounced || undefined,
        actorUserId: actorDebounced || undefined,
        days,
        page,
        size,
      });
      setRows(res.content ?? []);
      setTotal(res.totalElements ?? 0);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Kayıtlar yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [actionDebounced, actorDebounced, days, page, size]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [actionDebounced, actorDebounced, days]);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        NartBusiness İşlem Kayıtları
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Kritik kullanıcı ve admin işlemlerinin denetim kaydı (başvuru/kayıt, içerik oluşturma,
        üyelik/ödeme, admin aksiyonları). Aksiyona, aktöre ve tarihe göre filtrelenir.
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
          <TextField
            size="small"
            label="Aksiyon (örn. NB_APPLICATION_SUBMITTED)"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            sx={{ minWidth: 280 }}
          />
          <TextField
            size="small"
            label="Aktör User ID (opsiyonel)"
            value={actorUserId}
            onChange={(e) => setActorUserId(e.target.value)}
            sx={{ minWidth: 280 }}
          />
          <TextField
            select
            size="small"
            label="Son"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            sx={{ minWidth: 120 }}
          >
            {[1, 7, 14, 30, 60, 90].map((d) => (
              <MenuItem key={d} value={d}>{d} gün</MenuItem>
            ))}
          </TextField>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper variant="outlined">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Zaman</TableCell>
                <TableCell>Aksiyon</TableCell>
                <TableCell>Kaynak</TableCell>
                <TableCell>Aktör</TableCell>
                <TableCell>Hedef</TableCell>
                <TableCell>Sonuç</TableCell>
                <TableCell>Detay</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    Kayıt yok.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id} hover>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{fmt(r.occurredAt)}</TableCell>
                    <TableCell><Chip size="small" label={r.action} /></TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{r.source}</TableCell>
                    <TableCell>
                      <Stack>
                        {r.actorRole && (
                          <Typography variant="caption" fontWeight={600}>{r.actorRole}</Typography>
                        )}
                        {r.actorUserId && (
                          <Tooltip title={r.actorUserId}>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 120 }}>
                              {r.actorUserId.slice(0, 8)}…
                            </Typography>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack>
                        {r.targetType && (
                          <Typography variant="caption">{r.targetType}</Typography>
                        )}
                        {r.targetId && (
                          <Tooltip title={r.targetId}>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 120 }}>
                              {r.targetId.slice(0, 8)}…
                            </Typography>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" color={outcomeColor(r.outcome)} label={r.outcome ?? '—'} />
                    </TableCell>
                    <TableCell>
                      {r.meta && Object.keys(r.meta).length > 0 && (
                        <Tooltip title={<pre style={{ margin: 0 }}>{JSON.stringify(r.meta, null, 2)}</pre>}>
                          <Typography variant="caption" color="primary" sx={{ cursor: 'help' }}>
                            {Object.keys(r.meta).length} alan
                          </Typography>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={size}
          onRowsPerPageChange={(e) => { setSize(Number(e.target.value)); setPage(0); }}
          rowsPerPageOptions={[25, 50, 100]}
          labelRowsPerPage="Sayfa başına"
        />
      </Paper>
    </Box>
  );
}
