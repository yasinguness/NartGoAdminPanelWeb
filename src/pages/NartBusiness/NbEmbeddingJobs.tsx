import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  PlayArrow as PlayArrowIcon,
  Refresh as RefreshIcon,
  Replay as ReplayIcon,
} from '@mui/icons-material';
import { nbAdminService } from '../../services/nartbusiness/nbAdminService';
import type {
  EmbeddingJob,
  EmbeddingJobStatus,
  MatchBatchSummary,
} from '../../services/nartbusiness/nbTypes';
import { relativeDate, fullDate } from '../../utils/nbDisplay';
import { NbTitleBlock } from '../../components/nartbusiness/ui';

const STATUS_TR: Record<EmbeddingJobStatus, string> = {
  FAILED: 'Başarısız',
  PENDING: 'Bekliyor',
  RUNNING: 'Çalışıyor',
  DONE: 'Tamamlandı',
};

const STATUS_OPTIONS: EmbeddingJobStatus[] = ['FAILED', 'PENDING', 'RUNNING', 'DONE'];

/**
 * Sprint 10 — Embedding job operasyonu + Matching batch tetikleme.
 *
 * Failed job: nb-embedding-service'e ulaşılamadı / model timeout / başka hata
 * sonrası 3 attempt'i tüketmiş job'lar. Admin retry ile PENDING'e geri atar.
 *
 * Matching batch: Pazartesi 08:00 otomatik tetiklenir; buradan manuel de
 * koşturulur (örn. büyük matris değişikliği sonrası).
 */
export default function NbEmbeddingJobs() {
  const [jobs, setJobs] = useState<EmbeddingJob[]>([]);
  const [status, setStatus] = useState<EmbeddingJobStatus>('FAILED');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [batchRunning, setBatchRunning] = useState(false);
  const [lastBatch, setLastBatch] = useState<MatchBatchSummary | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const items = await nbAdminService.listEmbeddingJobs(status, 0, 100);
      setJobs(items);
    } catch (e: any) {
      setError(e?.message ?? 'Veri yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [status]);

  const retry = async (id: string) => {
    try {
      await nbAdminService.retryEmbeddingJob(id);
      await load();
    } catch (e: any) {
      setError(e?.message ?? 'Yeniden deneme başarısız');
    }
  };

  const runBatch = async () => {
    setBatchRunning(true);
    try {
      const summary = await nbAdminService.triggerMatchingBatch();
      setLastBatch(summary);
    } catch (e: any) {
      setError(e?.message ?? 'Batch tetiklenemedi');
    } finally {
      setBatchRunning(false);
    }
  };

  const statusChipColor = (s: EmbeddingJobStatus): 'default' | 'success' | 'warning' | 'error' => {
    switch (s) {
      case 'DONE':
        return 'success';
      case 'RUNNING':
        return 'warning';
      case 'FAILED':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ maxWidth: 1400 }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ md: 'flex-start' }}
        gap={2}
        mb={2}
      >
        <Box>
          <NbTitleBlock title="Embedding & Matching Operasyon" />
          <Typography variant="body2" color="text.secondary">
            Profil embedding kuyruğu ve haftalık eşleştirme batch'i. FAILED durumdaki job'ları
            "Retry" ile yeniden PENDING'e alabilirsiniz; batch çalıştığında threshold üstü
            tüm öneriler için push notification yayımlanır.
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={runBatch}
            disabled={batchRunning}
          >
            {batchRunning ? 'Çalışıyor...' : 'Batch Tetikle'}
          </Button>
          <Button onClick={load} startIcon={<RefreshIcon />}>
            Yenile
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {lastBatch && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setLastBatch(null)}>
          Batch tamamlandı — anchor: <b>{lastBatch.anchorsProcessed}</b>,
          öneri: <b>{lastBatch.suggestionsEmitted}</b>,
          süre: <b>{(lastBatch.elapsedMs / 1000).toFixed(1)}s</b>
        </Alert>
      )}

      <Stack direction="row" spacing={2} mb={2} alignItems="center">
        <TextField
          select
          size="small"
          label="Durum"
          value={status}
          onChange={(e) => setStatus(e.target.value as EmbeddingJobStatus)}
          sx={{ minWidth: 160 }}
        >
          {STATUS_OPTIONS.map((s) => (
            <MenuItem key={s} value={s}>
              {STATUS_TR[s]}
            </MenuItem>
          ))}
        </TextField>
        <Typography variant="body2" color="text.secondary">
          {jobs.length} kayıt
        </Typography>
      </Stack>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Üye ID</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell align="right">Deneme</TableCell>
                <TableCell>Kuyruğa Alınma</TableCell>
                <TableCell>Tamamlandı</TableCell>
                <TableCell sx={{ minWidth: 240 }}>Son Hata</TableCell>
                <TableCell align="right">İşlem</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {jobs.map((j) => (
                <TableRow key={j.id} hover>
                  <TableCell>
                    <Tooltip title={j.memberId} arrow>
                      <Typography variant="body2" fontFamily="monospace" sx={{ fontSize: 12, cursor: 'default' }}>
                        {j.memberId.substring(0, 8)}…
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={STATUS_TR[j.status] ?? j.status} color={statusChipColor(j.status)} />
                  </TableCell>
                  <TableCell align="right">{j.attempts}</TableCell>
                  <TableCell>
                    <Tooltip title={fullDate(j.enqueuedAt)} arrow>
                      <Typography variant="body2">{relativeDate(j.enqueuedAt)}</Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    {j.completedAt ? (
                      <Tooltip title={fullDate(j.completedAt)} arrow>
                        <Typography variant="body2">{relativeDate(j.completedAt)}</Typography>
                      </Tooltip>
                    ) : '—'}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 320 }}>
                    <Tooltip title={j.lastError ?? ''}>
                      <Typography variant="body2" noWrap>
                        {j.lastError ?? '—'}
                      </Typography>
                    </Tooltip>
                  </TableCell>
                  <TableCell align="right">
                    {j.status === 'FAILED' && (
                      <Tooltip title="Yeniden dene" arrow>
                        <IconButton size="small" onClick={() => retry(j.id)}>
                          <ReplayIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {jobs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body2" color="text.secondary" py={3}>
                      Bu filtreyle eşleşen job yok.
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
