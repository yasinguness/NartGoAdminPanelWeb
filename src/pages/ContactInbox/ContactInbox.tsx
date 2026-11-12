import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { api } from '../../services/api';

/**
 * İletişim formundan gelen mesajlar (auth-service /auth/contact). Yanıt e-postayla verilir; burada mesaj
 * okunur ve "yanıtlandı" olarak işaretlenir. Mesajlar KVKK başvurusu içerebilir: bekleme süresi görünür.
 */
type Status = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED';
interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: Status;
  createdDate: string;
  acceptedDate?: string | null;
}

const STATUS_LABEL: Record<Status, string> = {
  PENDING: 'Bekliyor',
  ACCEPTED: 'Yanıtlandı',
  REJECTED: 'Geçersiz',
  BLOCKED: 'Engellendi',
};
const STATUS_COLOR: Record<Status, 'warning' | 'success' | 'default' | 'error'> = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  REJECTED: 'default',
  BLOCKED: 'error',
};

const waitingDays = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);

export default function ContactInbox() {
  const [rows, setRows] = useState<ContactMessage[]>([]);
  const [filter, setFilter] = useState<'PENDING' | 'ALL'>('PENDING');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const pageSize = 25;

  // Uç duruma göre süzmüyor; kayıt sayısı küçük olduğu için hepsi alınıp burada süzülür.
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<any>('/auth/contact', { params: { page: 0, size: 500, sort: 'createdDate,desc' } });
      setRows(res.data?.data?.content ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'İletişim mesajları yüklenemedi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = useMemo(() => rows.filter((r) => r.status === 'PENDING'), [rows]);
  const shown = filter === 'PENDING' ? pending : rows;
  const oldest = pending.length ? Math.max(...pending.map((r) => waitingDays(r.createdDate))) : 0;

  const setStatus = async (row: ContactMessage, status: Status) => {
    setSaving(row.id);
    setError(null);
    try {
      await api.put(`/auth/contact/${row.id}/status`, null, { params: { status } });
      setRows((all) => all.map((r) => (r.id === row.id ? { ...r, status } : r)));
    } catch (e: any) {
      setError(e?.response?.data?.message ?? e?.message ?? 'Durum güncellenemedi.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2} mb={2}>
        <Box>
          <Typography variant="h5" fontWeight={700}>İletişim Mesajları</Typography>
          <Typography variant="body2" color="text.secondary">
            {pending.length} mesaj yanıt bekliyor{pending.length ? `, en eskisi ${oldest} gündür` : ''}. Yanıtı e-postayla
            verip burada işaretleyin.
          </Typography>
        </Box>
        <ToggleButtonGroup size="small" exclusive value={filter} onChange={(_, v) => { if (v) { setFilter(v); setPage(0); } }}>
          <ToggleButton value="PENDING">Bekleyenler ({pending.length})</ToggleButton>
          <ToggleButton value="ALL">Tümü ({rows.length})</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box textAlign="center" py={6}><CircularProgress /></Box>
      ) : shown.length === 0 ? (
        <Alert severity="success">Bekleyen mesaj yok.</Alert>
      ) : (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tarih</TableCell>
                <TableCell>Gönderen</TableCell>
                <TableCell>Konu</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell align="right">İşlem</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shown.slice(page * pageSize, (page + 1) * pageSize).map((r) => (
                <Fragment key={r.id}>
                  <TableRow hover sx={{ cursor: 'pointer' }} onClick={() => setOpen(open === r.id ? null : r.id)}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {new Date(r.createdDate).toLocaleDateString('tr-TR')}
                      {r.status === 'PENDING' && (
                        <Typography variant="caption" color={waitingDays(r.createdDate) > 2 ? 'error' : 'text.secondary'} display="block">
                          {waitingDays(r.createdDate)} gündür bekliyor
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.name}
                      <Typography variant="caption" color="text.secondary" display="block">{r.email}</Typography>
                    </TableCell>
                    <TableCell>{r.subject}</TableCell>
                    <TableCell><Chip size="small" color={STATUS_COLOR[r.status]} label={STATUS_LABEL[r.status]} /></TableCell>
                    <TableCell align="right" onClick={(e) => e.stopPropagation()} sx={{ whiteSpace: 'nowrap' }}>
                      <Button size="small" href={`mailto:${r.email}?subject=${encodeURIComponent('Ynt: ' + (r.subject ?? ''))}`}>E-posta yaz</Button>
                      {r.status === 'PENDING' && (
                        <>
                          <Button size="small" variant="contained" disabled={saving === r.id} onClick={() => setStatus(r, 'ACCEPTED')} sx={{ ml: 1 }}>
                            Yanıtlandı
                          </Button>
                          <Button size="small" color="inherit" disabled={saving === r.id} onClick={() => setStatus(r, 'REJECTED')} sx={{ ml: 1 }}>
                            Geçersiz
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                  {open === r.id && (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ bgcolor: 'action.hover' }}>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', py: 1 }}>{r.message}</Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            component="div"
            count={shown.length}
            page={page}
            onPageChange={(_, p) => setPage(p)}
            rowsPerPage={pageSize}
            rowsPerPageOptions={[pageSize]}
          />
        </TableContainer>
      )}
    </Box>
  );
}
