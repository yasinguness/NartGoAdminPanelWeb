import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  IconButton,
  Link,
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
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { api } from '../../services/api';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type { Sector } from '../../services/nartbusiness/nbTypes';
import { BulkActionBar, useRowSelection } from '../../components/Actions';
import { NbTitleBlock } from '../../components/nartbusiness/ui';

interface MarketNewsItem {
  id: string;
  source: string;
  sourceUrl: string;
  title: string;
  aiSummary?: string | null;
  whyMatters?: string | null;
  sectorCodes: string[];
  importance: number;
  publishedAt: string;
}

function unwrap<T>(body: any): T | null {
  if (!body) return null;
  if (typeof body === 'object' && 'data' in body) return body.data as T;
  return body as T;
}

/**
 * Hibrit haber moderasyonu (admin paneli). RSS+AI pipeline haberleri PENDING ingest
 * eder; burada onaylanan haber üye portalı Piyasa "Haberler" akışında görünür,
 * reddedilen (HIDDEN) yayımlanmaz. Üye Görüşleri moderasyonunun haber karşılığı.
 */
export default function NbMarketNews() {
  const [items, setItems] = useState<MarketNewsItem[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const sel = useRowSelection();

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<any>('/nb/market/admin/news/pending', { params: { limit: 100 } });
      setItems(unwrap<MarketNewsItem[]>(res.data) ?? []);
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
    () => (code: string) => sectors.find((s) => s.code === code)?.nameTr ?? code,
    [sectors],
  );

  const decide = async (id: string, approve: boolean) => {
    setBusyId(id);
    try {
      await api.post(`/nb/market/admin/news/${id}/${approve ? 'approve' : 'reject'}`);
      setItems((prev) => prev.filter((n) => n.id !== id));
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
      await api.post('/nb/market/admin/news/bulk-decide', { ids, approve });
      setItems((prev) => prev.filter((n) => !sel.has(n.id)));
      sel.clear();
    } catch (e: any) {
      setError(e?.message ?? 'Toplu işlem başarısız');
    } finally {
      setBulkBusy(false);
    }
  };

  const allSelected = items.length > 0 && items.every((n) => sel.has(n.id));
  const someSelected = items.some((n) => sel.has(n.id));

  return (
    <Box sx={{ maxWidth: 1400 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <NbTitleBlock title="Piyasa Haberleri Moderasyonu" />
          <Typography variant="body2" color="text.secondary">
            RSS + AI pipeline haberleri taslak (onay bekliyor) olarak çeker. Onaylanan
            haber üye portalında Piyasa akışının "Haberler" bölümünde görünür; reddedilen
            yayımlanmaz. Kaynağa git ile özgün makaleyi doğrulayabilirsin.
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
            { label: 'Reddet', color: 'error', icon: <RejectIcon fontSize="small" />, confirm: `${sel.count} haber reddedilsin mi?`, onClick: () => bulkDecide(false) },
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
                    onChange={(e) => sel.setAll(items.map((n) => n.id), e.target.checked)}
                  />
                </TableCell>
                <TableCell>Haber</TableCell>
                <TableCell>Kaynak</TableCell>
                <TableCell>Sektör</TableCell>
                <TableCell align="center">Önem</TableCell>
                <TableCell>Tarih</TableCell>
                <TableCell align="right">İşlem</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((n) => (
                <TableRow key={n.id} hover selected={sel.has(n.id)}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={sel.has(n.id)}
                      onChange={() => sel.toggle(n.id)}
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 440 }}>
                    <Typography variant="body2" fontWeight={600}>{n.title}</Typography>
                    {n.aiSummary && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {n.aiSummary}
                      </Typography>
                    )}
                    {n.whyMatters && (
                      <Typography variant="caption" color="primary.main" display="block" sx={{ mt: 0.5 }}>
                        Neden önemli: {n.whyMatters}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <Typography variant="caption">{n.source}</Typography>
                      {n.sourceUrl && (
                        <Tooltip title="Kaynağa git" arrow>
                          <IconButton
                            size="small"
                            component={Link}
                            href={n.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <OpenInNewIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell>
                    {n.sectorCodes.length === 0 ? (
                      <Chip size="small" variant="outlined" label="Genel" />
                    ) : (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {n.sectorCodes.slice(0, 3).map((c) => (
                          <Chip key={c} size="small" variant="outlined" label={sectorLabel(c)} />
                        ))}
                      </Stack>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">{n.importance}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    {new Date(n.publishedAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Onayla (yayımla)" arrow>
                      <span>
                        <IconButton
                          size="small"
                          color="success"
                          disabled={busyId === n.id}
                          onClick={() => decide(n.id, true)}
                        >
                          <ApproveIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Reddet (gizle)" arrow>
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={busyId === n.id}
                          onClick={() => decide(n.id, false)}
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
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="text.secondary" py={3}>
                      Onay bekleyen haber yok.
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
