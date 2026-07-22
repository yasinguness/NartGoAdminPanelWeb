import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Link,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import PublishIcon from '@mui/icons-material/Publish';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import {
  contentIngestService,
  type IngestConfig,
  type IngestSource,
  type PoolItem,
} from '../../services/contentIngest/contentIngestService';

export default function ContentIngest() {
  const navigate = useNavigate();
  const [config, setConfig] = useState<IngestConfig | null>(null);
  const [sources, setSources] = useState<IngestSource[]>([]);
  const [pool, setPool] = useState<PoolItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; sev: 'success' | 'error' } | null>(null);

  const notify = (msg: string, sev: 'success' | 'error' = 'success') => setToast({ msg, sev });

  const loadAll = useCallback(async () => {
    try {
      const [cfg, src, pl] = await Promise.all([
        contentIngestService.getConfig(),
        contentIngestService.listSources(),
        contentIngestService.getPool(0, 30),
      ]);
      setConfig(cfg);
      setSources(src);
      setPool(pl);
    } catch {
      notify('Veriler yüklenemedi', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const refreshPool = async () => {
    try {
      setPool(await contentIngestService.getPool(0, 30));
    } catch {
      /* yut */
    }
  };

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const updated = await contentIngestService.updateConfig({
        publishIntervalDays: config.publishIntervalDays,
        itemsPerRun: config.itemsPerRun,
        enabled: config.enabled,
      });
      setConfig(updated);
      notify('Ayarlar kaydedildi');
    } catch {
      notify('Ayarlar kaydedilemedi', 'error');
    } finally {
      setSaving(false);
    }
  };

  const runIngest = async () => {
    setBusy('ingest');
    try {
      const n = await contentIngestService.runIngestNow();
      notify(`${n} yeni içerik havuza eklendi`);
      await refreshPool();
    } catch {
      notify('Çekim başarısız', 'error');
    } finally {
      setBusy(null);
    }
  };

  const runDrip = async () => {
    setBusy('drip');
    try {
      const n = await contentIngestService.runDripNow(config?.itemsPerRun ?? 1);
      notify(`${n} içerik yayınlandı`);
      await refreshPool();
    } catch {
      notify('Yayın başarısız', 'error');
    } finally {
      setBusy(null);
    }
  };

  const toggleSource = async (s: IngestSource) => {
    try {
      const updated = await contentIngestService.toggleSource(s.id, !s.enabled);
      setSources((prev) => prev.map((x) => (x.id === s.id ? updated : x)));
    } catch {
      notify('Kaynak güncellenemedi', 'error');
    }
  };

  const reject = async (item: PoolItem) => {
    try {
      await contentIngestService.reject(item.id);
      setPool((prev) => prev.filter((x) => x.id !== item.id));
      notify('İçerik elendi');
    } catch {
      notify('İşlem başarısız', 'error');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1100, mx: 'auto' }}>
      <Typography variant="h5" fontWeight={800} gutterBottom>
        İçerik Toplama
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Harici Çerkes/diaspora kaynaklarından makaleleri otomatik çeker; havuzdan belirlenen
        aralıkta damla damla yayınlar. Tam metin + kaynağa atıf ile.
      </Typography>

      {/* ── Yayın ayarları ── */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Yayın Ayarları
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
            <TextField
              label="Kaç günde bir"
              type="number"
              size="small"
              value={config?.publishIntervalDays ?? 1}
              onChange={(e) =>
                setConfig((c) => (c ? { ...c, publishIntervalDays: Math.max(1, Number(e.target.value)) } : c))
              }
              sx={{ width: 150 }}
              inputProps={{ min: 1 }}
            />
            <TextField
              label="Her turda kaç içerik"
              type="number"
              size="small"
              value={config?.itemsPerRun ?? 1}
              onChange={(e) =>
                setConfig((c) => (c ? { ...c, itemsPerRun: Math.max(1, Number(e.target.value)) } : c))
              }
              sx={{ width: 180 }}
              inputProps={{ min: 1 }}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={config?.enabled ?? false}
                  onChange={(e) => setConfig((c) => (c ? { ...c, enabled: e.target.checked } : c))}
                />
              }
              label="Otomatik yayın açık"
            />
            <Box sx={{ flexGrow: 1 }} />
            <Button variant="contained" onClick={saveConfig} disabled={saving}>
              {saving ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
          </Stack>
          <Divider sx={{ my: 2 }} />
          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              variant="outlined"
              startIcon={<CloudSyncIcon />}
              onClick={runIngest}
              disabled={busy !== null}
            >
              {busy === 'ingest' ? 'Çekiliyor…' : 'Şimdi çek'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<PublishIcon />}
              onClick={runDrip}
              disabled={busy !== null}
            >
              {busy === 'drip' ? 'Yayınlanıyor…' : 'Şimdi yayınla'}
            </Button>
            {config?.lastPublishedAt && (
              <Typography variant="caption" color="text.secondary">
                Son yayın: {new Date(config.lastPublishedAt).toLocaleString('tr-TR')}
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* ── Kaynaklar ── */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Kaynaklar
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Kaynak</TableCell>
                <TableCell>Tür</TableCell>
                <TableCell>Dil</TableCell>
                <TableCell>Son çekim</TableCell>
                <TableCell align="right">Aktif</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sources.map((s) => (
                <TableRow key={s.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {s.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {s.baseUrl}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={s.type} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>{s.langFilter}</TableCell>
                  <TableCell>
                    {s.lastRunAt ? new Date(s.lastRunAt).toLocaleString('tr-TR') : '—'}
                  </TableCell>
                  <TableCell align="right">
                    <Switch checked={s.enabled} onChange={() => toggleSource(s)} size="small" />
                  </TableCell>
                </TableRow>
              ))}
              {sources.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant="body2" color="text.secondary">
                      Kaynak yok.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Review kuyruğu ── */}
      <Card>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Yayın Kuyruğu
            </Typography>
            <Chip label={`${pool.length} bekliyor`} size="small" color="primary" variant="outlined" />
          </Stack>
          <Typography variant="caption" color="text.secondary">
            Otomatik yayınlanmadan önce buradan eleyebilirsin.
          </Typography>
          <Stack spacing={1.5} sx={{ mt: 2 }}>
            {pool.map((item) => (
              <Box
                key={item.id}
                sx={{
                  display: 'flex',
                  gap: 1.5,
                  alignItems: 'center',
                  p: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 2,
                }}
              >
                <Avatar
                  variant="rounded"
                  src={item.coverMedia?.originalUrl || undefined}
                  sx={{ width: 56, height: 56, bgcolor: 'grey.200' }}
                >
                  {item.title?.[0] ?? '?'}
                </Avatar>
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    fontWeight={600}
                    noWrap
                    sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                    onClick={() => navigate(`/content/${item.id}`)}
                  >
                    {item.title}
                  </Typography>
                  <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap">
                    {item.sourceName && <Chip label={item.sourceName} size="small" />}
                    {item.category && (
                      <Chip label={item.category} size="small" variant="outlined" />
                    )}
                    {item.language && (
                      <Chip label={item.language.toUpperCase()} size="small" variant="outlined" />
                    )}
                  </Stack>
                </Box>
                {item.sourceUrl && (
                  <Link href={item.sourceUrl} target="_blank" rel="noopener" sx={{ display: 'inline-flex' }}>
                    <OpenInNewIcon fontSize="small" />
                  </Link>
                )}
                <Button
                  size="small"
                  startIcon={<EditOutlinedIcon />}
                  onClick={() => navigate(`/content/${item.id}`)}
                >
                  Detay
                </Button>
                <Button
                  size="small"
                  color="error"
                  startIcon={<DeleteOutlineIcon />}
                  onClick={() => reject(item)}
                >
                  Ele
                </Button>
              </Box>
            ))}
            {pool.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Kuyruk boş. "Şimdi çek" ile içerik toplayabilirsin.
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <Alert severity={toast.sev} onClose={() => setToast(null)} variant="filled">
            {toast.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
