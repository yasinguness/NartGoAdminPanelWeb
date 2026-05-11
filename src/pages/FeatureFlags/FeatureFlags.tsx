import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  Switch,
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
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { PageContainer, PageHeader } from '../../components/Page';
import { LoadingState, ErrorState } from '../../components/Feedback';
import {
  FeatureFlag,
  FeatureFlagService,
  FeatureFlagUpsert,
} from '../../services/featureFlag/featureFlagService';
import StoryVisibilityPanel from './StoryVisibilityPanel';

const service = FeatureFlagService.getInstance();

/** Teknik kategori kodunu insan dostu başlığa çevir. */
const categoryLabels: Record<string, string> = {
  story: 'Ana Sayfa • Hikaye Akışı',
  nartlive: 'NartLive',
  reels: 'Reels',
  community: 'Topluluk',
  event: 'Etkinlikler',
  business: 'İşletmeler',
  gamification: 'Puan & Ödüller',
  home: 'Ana Sayfa',
};

const humanizeCategory = (raw?: string) =>
  !raw ? 'Diğer' : categoryLabels[raw] ?? raw.charAt(0).toUpperCase() + raw.slice(1);

const emptyForm = (): FeatureFlagUpsert => ({
  flagKey: '',
  enabled: true,
  description: '',
  category: '',
});

const FeatureFlags = () => {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FeatureFlag | null>(null);
  const [formData, setFormData] = useState<FeatureFlagUpsert>(emptyForm());

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      setFlags(await service.list());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Feature flag listesi alınamadı');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const grouped = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const filtered = q
      ? flags.filter(
          (f) =>
            f.flagKey.toLowerCase().includes(q) ||
            (f.description ?? '').toLowerCase().includes(q) ||
            (f.category ?? '').toLowerCase().includes(q),
        )
      : flags;

    const groups = new Map<string, FeatureFlag[]>();
    filtered.forEach((f) => {
      const cat = humanizeCategory(f.category);
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(f);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b, 'tr'));
  }, [flags, filter]);

  const openCreate = () => {
    setEditing(null);
    setFormData(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (flag: FeatureFlag) => {
    setEditing(flag);
    setFormData({
      flagKey: flag.flagKey,
      enabled: flag.enabled,
      description: flag.description ?? '',
      category: flag.category ?? '',
    });
    setDialogOpen(true);
  };

  const handleToggle = async (flag: FeatureFlag) => {
    try {
      const updated = await service.toggle(flag.id, !flag.enabled);
      setFlags((prev) => prev.map((f) => (f.id === flag.id ? updated : f)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Toggle başarısız');
    }
  };

  const handleSubmit = async () => {
    if (!formData.flagKey.trim()) {
      setError('flag_key zorunlu');
      return;
    }
    try {
      if (editing) {
        await service.update(editing.id, formData);
      } else {
        await service.create(formData);
      }
      setDialogOpen(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kayıt başarısız');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await service.remove(deleteId);
      setDeleteId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Silme başarısız');
    }
  };

  if (loading) {
    return <LoadingState message="Özellikler yükleniyor..." />;
  }
  if (error && !dialogOpen) {
    return (
      <PageContainer>
        <ErrorState title="Yüklenemedi" message={error} onRetry={load} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Özellik Görünürlüğü"
        subtitle="Uygulamadaki widget ve özellikleri bölüme göre aç/kapat — değişiklik mobile uygulamada bir sonraki açılışta geçerli olur."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Yeni Özellik Ekle
          </Button>
        }
      />

      <StoryVisibilityPanel
        flags={flags}
        onChange={(updated) =>
          setFlags((prev) => {
            const idx = prev.findIndex((f) => f.id === updated.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = updated;
              return next;
            }
            // Newly created (auto-create on first toggle path).
            return [...prev, updated];
          })
        }
        onError={(message) => setError(message)}
      />

      <Stack direction="row" spacing={2} mb={2}>
        <TextField
          size="small"
          placeholder="Bölüm veya özellik adı ile ara..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          sx={{ maxWidth: 420, flex: 1 }}
        />
      </Stack>

      <Stack spacing={3}>
        {grouped.length === 0 && (
          <Typography color="text.secondary" align="center" py={4}>
            Henüz kontrol edilebilir bir özellik yok.
          </Typography>
        )}
        {grouped.map(([category, items]) => (
          <Box key={category}>
            <Typography variant="overline" color="text.secondary" fontWeight={700}>
              {category}
            </Typography>
            <TableContainer component={Paper} sx={{ mt: 1 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Özellik</TableCell>
                    <TableCell align="center" sx={{ width: 200 }}>Görünürlük</TableCell>
                    <TableCell align="right" sx={{ width: 120 }}>İşlemler</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((flag) => (
                    <TableRow key={flag.id} hover>
                      <TableCell>
                        <Stack spacing={0.25}>
                          <Typography fontWeight={600} fontSize={14}>
                            {flag.description?.trim() || flag.flagKey}
                          </Typography>
                          <Typography
                            fontFamily="monospace"
                            fontSize={11}
                            color="text.secondary"
                          >
                            {flag.flagKey}
                          </Typography>
                        </Stack>
                      </TableCell>
                      <TableCell align="center">
                        <Stack
                          direction="row"
                          alignItems="center"
                          spacing={1}
                          justifyContent="center"
                        >
                          <Switch
                            size="small"
                            checked={flag.enabled}
                            onChange={() => handleToggle(flag)}
                          />
                          <Chip
                            size="small"
                            label={flag.enabled ? 'Görünür' : 'Gizli'}
                            color={flag.enabled ? 'success' : 'default'}
                          />
                        </Stack>
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                          <Tooltip title="Düzenle">
                            <IconButton size="small" onClick={() => openEdit(flag)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Sil">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => setDeleteId(flag.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        ))}
      </Stack>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Özelliği Düzenle' : 'Yeni Özellik Ekle'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} mt={1}>
            <TextField
              label="Özellik Adı"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ana Sayfa akışında Makale kartını göster"
              helperText="Bu metin özellik listesinde başlık olarak görünür."
              multiline
              minRows={2}
              fullWidth
            />
            <TextField
              label="Bölüm"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="story, nartlive, reels, community ..."
              helperText="Liste bu bölüme göre gruplanır. Mevcut bölüm yoksa yeni oluşur."
              fullWidth
            />
            <TextField
              label="Teknik Anahtar"
              value={formData.flagKey}
              onChange={(e) => setFormData({ ...formData, flagKey: e.target.value })}
              placeholder="story.articles.enabled"
              helperText={
                editing
                  ? 'Düzenlemede değiştirilemez. Mobile kod bu anahtarı sorgular.'
                  : 'Mobile geliştiriciler tarafından belirlenir. Nokta ile hiyerarşik: bölüm.özellik.enabled'
              }
              disabled={!!editing}
              fullWidth
            />
            <Stack direction="row" alignItems="center" spacing={1}>
              <Switch
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              />
              <Typography fontWeight={600}>
                {formData.enabled
                  ? 'Başlangıçta görünür olsun'
                  : 'Başlangıçta gizli olsun'}
              </Typography>
            </Stack>
            {error && (
              <Typography color="error" fontSize={13}>
                {error}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Vazgeç</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editing ? 'Kaydet' : 'Ekle'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Özelliği Sil</DialogTitle>
        <DialogContent>
          <Typography>
            Bu özelliği silmek istediğinize emin misiniz? Mobile uygulamada ilgili widget yine
            görünür kalır (sistem "bilinmeyen anahtar" için varsayılan olarak açık davranır), sadece
            buradan kontrol edemezsiniz.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Vazgeç</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Sil
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default FeatureFlags;
