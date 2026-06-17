import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
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
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type { Sector } from '../../services/nartbusiness/nbTypes';

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

  return (
    <Box p={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            NartBusiness — Üye Görüşleri Moderasyonu
          </Typography>
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
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Görüş</TableCell>
                <TableCell>Yazan</TableCell>
                <TableCell>Sektör</TableCell>
                <TableCell>Tarih</TableCell>
                <TableCell align="right">İşlem</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((o) => (
                <TableRow key={o.id} hover>
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
                  <TableCell colSpan={5} align="center">
                    <Typography variant="body2" color="text.secondary" py={3}>
                      Bekleyen üye görüşü yok.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
