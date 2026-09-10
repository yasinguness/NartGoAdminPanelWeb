import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
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
import {
  CheckCircleOutline as ApproveIcon,
  RemoveCircleOutline as RejectIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { api } from '../../services/api';
import { BulkActionBar, useRowSelection } from '../../components/Actions';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type { Sector } from '../../services/nartbusiness/nbTypes';
import { NbTitleBlock } from '../../components/nartbusiness/ui';

interface MarketOpinion {
  id: string;
  authorName: string;
  authorCompany?: string | null;
  sectorCode?: string | null;
  body: string;
  status: string;
  createdAt: string;
}

function unwrap<T>(body: any): T | null {
  if (!body) return null;
  if (typeof body === 'object' && 'data' in body) return body.data as T;
  return body as T;
}

/**
 * A5 — Üye-üretimi piyasa görüşü moderasyonu (admin paneli).
 * Bekleyen görüşleri listeler; onaylanınca üye portalı Piyasa akışında görünür.
 */
export default function NbMarketOpinions() {
  const [items, setItems] = useState<MarketOpinion[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const sel = useRowSelection();

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<any>('/nb/market/admin/opinions/pending', { params: { limit: 100 } });
      setItems(unwrap<MarketOpinion[]>(res.data) ?? []);
    } catch (e: any) {
      const code = e?.response?.status;
      // Endpoint yoksa (servis ayakta değil) sessiz boş kuyruk göster.
      if (code === 404 || code === 501) setItems([]);
      else setError(e?.message ?? 'Veri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    nbAdminService.listSectors().then(setSectors).catch(() => setSectors([]));
  }, []);

  const sectorLabel = useMemo(
    () => (code?: string | null) => {
      if (!code) return 'Genel';
      return sectors.find((s) => s.code === code)?.nameTr ?? code;
    },
    [sectors],
  );

  const decide = async (id: string, approve: boolean) => {
    setBusyId(id);
    try {
      await api.post(`/nb/market/admin/opinions/${id}/${approve ? 'approve' : 'reject'}`);
      setItems((prev) => prev.filter((o) => o.id !== id));
    } catch (e: any) {
      setError(e?.message ?? 'İşlem başarısız');
    } finally {
      setBusyId(null);
    }
  };

  const bulkDecide = async (approve: boolean) => {
    const ids = sel.ids;
    if (ids.length === 0) return;
    setBulkBusy(true);
    setError(null);
    try {
      await api.post('/nb/market/admin/opinions/bulk-decide', { ids, approve });
      setItems((prev) => prev.filter((o) => !sel.has(o.id)));
      sel.clear();
    } catch (e: any) {
      setError(e?.message ?? 'Toplu işlem başarısız');
    } finally {
      setBulkBusy(false);
    }
  };

  const allSelected = items.length > 0 && items.every((o) => sel.has(o.id));
  const someSelected = items.some((o) => sel.has(o.id));

  return (
    <Box sx={{ maxWidth: 1400 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <NbTitleBlock title="Üye Görüşleri Moderasyonu" />
          <Typography variant="body2" color="text.secondary">
            Üyelerin paylaştığı sektörel görüşler. Onaylanan görüş üye portalında
            Piyasa akışında "Üye Görüşleri" bölümünde görünür; reddedilen yayımlanmaz.
          </Typography>
        </Box>
        <Button onClick={load} startIcon={<RefreshIcon />}>Yenile</Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <>
        <BulkActionBar
          count={sel.count}
          busy={bulkBusy}
          onClear={sel.clear}
          actions={[
            { label: 'Onayla', color: 'success', icon: <ApproveIcon fontSize="small" />, onClick: () => bulkDecide(true) },
            { label: 'Reddet', color: 'error', icon: <RejectIcon fontSize="small" />, confirm: `${sel.count} görüş reddedilsin mi?`, onClick: () => bulkDecide(false) },
          ]}
        />
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    size="small"
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onChange={(e) => sel.setAll(items.map((o) => o.id), e.target.checked)}
                  />
                </TableCell>
                <TableCell>Görüş</TableCell>
                <TableCell>Yazan</TableCell>
                <TableCell>Sektör</TableCell>
                <TableCell>Tarih</TableCell>
                <TableCell align="right">İşlem</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((o) => (
                <TableRow key={o.id} hover selected={sel.has(o.id)}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={sel.has(o.id)}
                      onChange={() => sel.toggle(o.id)}
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 420 }}>
                    <Typography variant="body2">{o.body}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>{o.authorName}</Typography>
                    {o.authorCompany && (
                      <Typography variant="caption" color="text.secondary">
                        {o.authorCompany}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip size="small" variant="outlined" label={sectorLabel(o.sectorCode)} />
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>
                    {new Date(o.createdAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Onayla (yayımla)" arrow>
                      <span>
                        <IconButton
                          size="small"
                          color="success"
                          disabled={busyId === o.id}
                          onClick={() => decide(o.id, true)}
                        >
                          <ApproveIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Reddet" arrow>
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={busyId === o.id}
                          onClick={() => decide(o.id, false)}
                        >
                          <RejectIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary" py={3}>
                      Bekleyen üye görüşü yok.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        </>
      )}
    </Box>
  );
}
