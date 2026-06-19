import { useEffect, useState } from 'react';
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
  CheckCircleOutline as KeepIcon,
  VisibilityOff as HideIcon,
  RemoveCircleOutline as DismissIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { api } from '../../services/api';
import { BulkActionBar, useRowSelection } from '../../components/Actions';

type ReportStatus =
  | 'OPEN'
  | 'RESOLVED_HIDDEN'
  | 'RESOLVED_KEPT'
  | 'DISMISSED';

type TargetType = 'QUESTION' | 'ANSWER' | 'MEMBER';

const TARGET_TYPE_LABEL: Record<TargetType, string> = {
  QUESTION: 'Soru',
  ANSWER: 'Cevap',
  MEMBER: 'Üye Profili',
};

const TARGET_TYPE_COLOR: Record<TargetType, 'default' | 'warning' | 'info'> = {
  QUESTION: 'default',
  ANSWER: 'default',
  MEMBER: 'warning',
};

interface Report {
  id: string;
  targetType: TargetType;
  targetId: string;
  reason: string;
  note?: string;
  status: ReportStatus;
  createdAt: string;
}

function unwrap<T>(body: any): T | null {
  if (!body) return null;
  if (typeof body === 'object' && 'data' in body) return body.data as T;
  return body as T;
}

/**
 * Sprint 13 — Topluluk moderasyon kuyruğu (admin paneli).
 * S12'de eklenen backend endpoint'lerini tüketir.
 */
export default function NbModerationQueue() {
  const [items, setItems] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const sel = useRowSelection();

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get<any>('/nb/admin/community/reports');
      setItems(unwrap<Report[]>(res.data) ?? []);
    } catch (e: any) {
      setError(e?.message ?? 'Veri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const resolve = async (id: string, hide: boolean) => {
    try {
      await api.post(`/nb/admin/community/reports/${id}/resolve?hide=${hide}`);
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'İşlem başarısız');
    }
  };

  const dismiss = async (id: string) => {
    try {
      await api.post(`/nb/admin/community/reports/${id}/dismiss`);
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'İşlem başarısız');
    }
  };

  const bulkAction = async (action: 'HIDE' | 'KEEP' | 'DISMISS') => {
    const ids = sel.ids;
    if (ids.length === 0) return;
    setBulkBusy(true);
    setError(null);
    try {
      await api.post('/nb/admin/community/reports/bulk', { ids, action });
      sel.clear();
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Toplu işlem başarısız');
    } finally {
      setBulkBusy(false);
    }
  };

  const allSelected = items.length > 0 && items.every((r) => sel.has(r.id));
  const someSelected = items.some((r) => sel.has(r.id));

  return (
    <Box p={3}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h4" fontWeight={600} gutterBottom>
            NartBusiness — Moderasyon Kuyruğu
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Üyelerin bildirdiği soru, cevap ve üye profilleri. Hide ile içerik
            gizlenir (üye profillerinde suspension için nb-membership admin
            ekranını kullan), Keep ile bildirim reddedilir, Dismiss ile rapor
            kapatılır.
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
            { label: 'İçeriği Gizle', color: 'error', icon: <HideIcon fontSize="small" />, confirm: `${sel.count} raporun içeriği gizlensin mi?`, onClick: () => bulkAction('HIDE') },
            { label: 'Koru', color: 'success', icon: <KeepIcon fontSize="small" />, onClick: () => bulkAction('KEEP') },
            { label: 'Raporu Kapat', color: 'inherit', icon: <DismissIcon fontSize="small" />, onClick: () => bulkAction('DISMISS') },
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
                    onChange={(e) => sel.setAll(items.map((r) => r.id), e.target.checked)}
                  />
                </TableCell>
                <TableCell>Tip</TableCell>
                <TableCell>Hedef ID</TableCell>
                <TableCell>Sebep</TableCell>
                <TableCell>Not</TableCell>
                <TableCell>Oluşturulma</TableCell>
                <TableCell align="right">İşlem</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.id} hover selected={sel.has(r.id)}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      size="small"
                      checked={sel.has(r.id)}
                      onChange={() => sel.toggle(r.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={TARGET_TYPE_COLOR[r.targetType] ?? 'default'}
                      label={TARGET_TYPE_LABEL[r.targetType] ?? r.targetType}
                    />
                  </TableCell>
                  <TableCell>
                    <Tooltip title={r.targetId} arrow>
                      <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: 12, cursor: 'default' }}>
                        {r.targetId.substring(0, 8)}…
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>{r.reason}</TableCell>
                  <TableCell sx={{ maxWidth: 220 }}>
                    <Typography variant="body2" noWrap title={r.note ?? ''}>
                      {r.note ?? '—'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ fontSize: 12 }}>
                    {new Date(r.createdAt).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' })}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="İçeriği gizle" arrow>
                      <IconButton size="small" color="error" onClick={() => resolve(r.id, true)}>
                        <HideIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Bildirimi reddet (içerik açık kalır)" arrow>
                      <IconButton size="small" color="success" onClick={() => resolve(r.id, false)}>
                        <KeepIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Raporu kapat" arrow>
                      <IconButton size="small" onClick={() => dismiss(r.id)}>
                        <DismissIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="text.secondary" py={3}>
                      Açık moderasyon talebi yok.
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
