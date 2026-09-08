import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import PublishIcon from '@mui/icons-material/Publish';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type { NbJobPostingRow } from '../../services/nartbusiness/nbAdminService';
import { NbTitleBlock } from '../../components/nartbusiness/ui';

type StatusFilter = '' | 'PUBLISHED' | 'CLOSED' | 'HIDDEN';

const STATUS_LABEL: Record<string, string> = {
  PUBLISHED: 'Yayında',
  CLOSED: 'Kapalı',
  HIDDEN: 'Gizli',
};

const EMPLOYMENT_LABEL: Record<string, string> = {
  FULL_TIME: 'Tam zamanlı',
  PART_TIME: 'Yarı zamanlı',
  CONTRACT: 'Sözleşmeli',
  INTERNSHIP: 'Staj',
  FREELANCE: 'Serbest',
};

export default function NbJobModeration() {
  const [status, setStatus] = useState<StatusFilter>('');
  const [rows, setRows] = useState<NbJobPostingRow[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  // Durum filtresi değişince başa dön.
  useEffect(() => {
    setPage(0);
  }, [status]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    nbAdminService
      .listJobPostings(status || undefined, page)
      .then((p) => {
        setRows(p.content);
        setTotalPages(Math.max(1, p.totalPages));
      })
      .catch((e) => setError(e?.response?.data?.error?.message ?? 'Yüklenemedi'))
      .finally(() => setLoading(false));
  }, [status, page]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (row: NbJobPostingRow, hide: boolean) => {
    setBusyId(row.id);
    try {
      if (hide) {
        await nbAdminService.hideJobPosting(row.id);
        setMsg('İlan gizlendi.');
      } else {
        await nbAdminService.publishJobPosting(row.id);
        setMsg('İlan yeniden yayınlandı.');
      }
      load();
    } catch (e: any) {
      setMsg(e?.response?.data?.error?.message ?? 'İşlem başarısız');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Box sx={{ maxWidth: 1400 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <NbTitleBlock title="Pozisyon İlanları — Moderasyon" />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Durum</InputLabel>
          <Select
            label="Durum"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
          >
            <MenuItem value="">Tümü</MenuItem>
            <MenuItem value="PUBLISHED">Yayında</MenuItem>
            <MenuItem value="CLOSED">Kapalı</MenuItem>
            <MenuItem value="HIDDEN">Gizli</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper variant="outlined">
        {loading ? (
          <Stack alignItems="center" py={5}>
            <CircularProgress size={26} />
          </Stack>
        ) : rows.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 3 }}>
            Kayıt yok.
          </Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Pozisyon</TableCell>
                  <TableCell>İşveren</TableCell>
                  <TableCell>Tür</TableCell>
                  <TableCell>Lokasyon</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell align="right">İşlem</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => {
                  const loc = [r.city, r.remoteAllowed ? 'Uzaktan' : null]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <TableRow key={r.id} hover>
                      <TableCell sx={{ maxWidth: 280 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {r.title}
                        </Typography>
                        {r.applyEmail && (
                          <Typography variant="caption" color="text.secondary">
                            {r.applyEmail}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{r.ownerCompanyName || r.ownerDisplayName || '—'}</TableCell>
                      <TableCell>
                        {r.employmentType ? EMPLOYMENT_LABEL[r.employmentType] ?? r.employmentType : '—'}
                      </TableCell>
                      <TableCell>{loc || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          variant="outlined"
                          color={
                            r.status === 'PUBLISHED' ? 'success'
                              : r.status === 'HIDDEN' ? 'error' : 'default'
                          }
                          label={STATUS_LABEL[r.status] ?? r.status}
                        />
                      </TableCell>
                      <TableCell align="right">
                        {r.status === 'HIDDEN' ? (
                          <Tooltip title="Yeniden yayınla">
                            <span>
                              <Button
                                size="small"
                                startIcon={<PublishIcon />}
                                disabled={busyId === r.id}
                                onClick={() => act(r, false)}
                              >
                                Yayınla
                              </Button>
                            </span>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Gizle (kaldır)">
                            <span>
                              <Button
                                size="small"
                                color="error"
                                startIcon={<VisibilityOffIcon />}
                                disabled={busyId === r.id}
                                onClick={() => act(r, true)}
                              >
                                Gizle
                              </Button>
                            </span>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {totalPages > 1 && (
        <Stack alignItems="center" sx={{ mt: 2 }}>
          <Pagination
            count={totalPages}
            page={page + 1}
            onChange={(_, p) => setPage(p - 1)}
            color="primary"
          />
        </Stack>
      )}

      <Snackbar
        open={!!msg}
        autoHideDuration={4000}
        onClose={() => setMsg(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {msg ? (
          <Alert severity="success" variant="filled" onClose={() => setMsg(null)}>
            {msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
