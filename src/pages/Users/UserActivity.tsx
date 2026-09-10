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
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  userActivityService,
  type UserActivityRow,
} from '../../services/user/userActivityService';

type App = 'NARTGO' | 'NARTBUSINESS';
type Mode = 'all' | 'active' | 'inactive';

function fmt(ts?: string | null): { abs: string; rel: string } {
  if (!ts) return { abs: '—', rel: 'Hiç' };
  const d = new Date(ts);
  const abs = d.toLocaleString('tr-TR');
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  let rel: string;
  if (min < 1) rel = 'az önce';
  else if (min < 60) rel = `${min} dk önce`;
  else if (min < 1440) rel = `${Math.floor(min / 60)} sa önce`;
  else rel = `${Math.floor(min / 1440)} gün önce`;
  return { abs, rel };
}

export default function UserActivity() {
  const [app, setApp] = useState<App>('NARTGO');
  const [mode, setMode] = useState<Mode>('all');
  const [days, setDays] = useState(30);
  const [q, setQ] = useState('');
  const [qDebounced, setQDebounced] = useState('');

  const [rows, setRows] = useState<UserActivityRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 400);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await userActivityService.list({
        app,
        mode,
        days,
        q: qDebounced || undefined,
        page,
        size,
      });
      setRows(res.content ?? []);
      setTotal(res.totalElements ?? 0);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Liste yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, [app, mode, days, qDebounced, page, size]);

  useEffect(() => {
    load();
  }, [load]);

  // Filtre değişince ilk sayfaya dön.
  useEffect(() => {
    setPage(0);
  }, [app, mode, days, qDebounced]);

  const primaryCol = app === 'NARTBUSINESS' ? 'nb' : 'nartgo';

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Kullanıcı Aktivitesi
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Kullanıcıların NartGo ve NartBusiness'ta en son aktif olduğu an. Seçili uygulamaya göre
        sıralanır (en son aktif önce).
      </Typography>

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap alignItems="center">
          <ToggleButtonGroup
            size="small"
            exclusive
            value={app}
            onChange={(_, v) => v && setApp(v)}
          >
            <ToggleButton value="NARTGO">NartGo</ToggleButton>
            <ToggleButton value="NARTBUSINESS">NartBusiness</ToggleButton>
          </ToggleButtonGroup>

          <TextField
            select
            size="small"
            label="Durum"
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="all">Hepsi</MenuItem>
            <MenuItem value="active">Son {days} günde aktif</MenuItem>
            <MenuItem value="inactive">{days} gündür sessiz</MenuItem>
          </TextField>

          <TextField
            select
            size="small"
            label="Gün"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            sx={{ minWidth: 100 }}
            disabled={mode === 'all'}
          >
            {[7, 14, 30, 60, 90].map((d) => (
              <MenuItem key={d} value={d}>{d}</MenuItem>
            ))}
          </TextField>

          <TextField
            size="small"
            label="Ara (e-posta / isim)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            sx={{ minWidth: 240, flex: 1 }}
          />
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper variant="outlined">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Kullanıcı</TableCell>
                <TableCell>E-posta</TableCell>
                <TableCell>Tür</TableCell>
                <TableCell sx={{ fontWeight: primaryCol === 'nartgo' ? 700 : 400 }}>
                  NartGo son aktif
                </TableCell>
                <TableCell sx={{ fontWeight: primaryCol === 'nb' ? 700 : 400 }}>
                  NartBusiness son aktif
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                    <CircularProgress size={28} />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    Kayıt yok.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => {
                  const nartgo = fmt(r.nartgoLastActiveAt);
                  const nb = fmt(r.nbLastActiveAt);
                  return (
                    <TableRow key={r.id} hover>
                      <TableCell>
                        {r.displayName || [r.firstName, r.lastName].filter(Boolean).join(' ') || '—'}
                      </TableCell>
                      <TableCell>{r.email}</TableCell>
                      <TableCell>
                        {r.accountType && <Chip size="small" label={r.accountType} />}
                      </TableCell>
                      <TableCell>
                        <Tooltip title={nartgo.abs}><span>{nartgo.rel}</span></Tooltip>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={nb.abs}><span>{nb.rel}</span></Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })
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
