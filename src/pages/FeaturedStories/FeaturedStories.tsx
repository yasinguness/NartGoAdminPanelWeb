import { useEffect, useState } from 'react';
import {
  Autocomplete,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { PageContainer, PageHeader } from '../../components/Page';
import { LoadingState, ErrorState } from '../../components/Feedback';
import {
  FeaturedStoryPlacement,
  FeaturedStoryService,
  FeaturedStorySource,
  FeaturedStoryTargetType,
} from '../../services/featured/featuredStoryService';
import { businessService } from '../../services/business/businessService';
import { eventService } from '../../services/event/eventService';
import { bulletinService } from '../../services/bulletin/bulletinService';
import { articleService } from '../../services/article/articleService';
import { feedService } from '../../services/feed/feedService';

/** Normalised option used by the unified target picker. */
interface TargetOption {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
}

/**
 * Fetch a short (≤10 row) picker list for the given target type. Each service
 * already exposes a search/list endpoint; we normalise the response shape here
 * so the Autocomplete renders identically regardless of type. Errors surface
 * as empty results — the search input shows a "no match" state gracefully.
 */
async function fetchTargetOptions(
  type: FeaturedStoryTargetType,
  query: string,
): Promise<TargetOption[]> {
  try {
    switch (type) {
      case 'BUSINESS': {
        const resp = await businessService.getAllBusinesses({
          keyword: query,
          page: 0,
          size: 10,
        });
        const items = (resp?.data?.content ?? []) as Array<{
          id: string;
          name: string;
          logoUrl?: string;
          categoryName?: string;
        }>;
        return items.map((b) => ({
          id: b.id,
          title: b.name,
          subtitle: b.categoryName,
          imageUrl: b.logoUrl,
        }));
      }
      case 'EVENT': {
        const resp = await eventService.getAllEvents({
          keyword: query || undefined,
          page: 0,
          size: 10,
        });
        const items = ((resp as any)?.data?.content ?? []) as any[];
        return items.map((e) => ({
          id: e.id,
          title: e.name,
          subtitle: e.category?.name ?? e.eventTime,
          imageUrl: e.image ?? e.coverImageUrl ?? e.thumbnailUrl,
        }));
      }
      case 'REEL': {
        const resp = await feedService.getFeeds({ keyword: query, page: 0, size: 10 });
        const items = ((resp as any)?.data?.content ?? (resp as any)?.content ?? []) as any[];
        return items.map((f) => ({
          id: f.id,
          title: f.title ?? f.caption ?? f.id,
          subtitle: f.creatorUsername ?? f.creatorEmail,
          imageUrl: f.thumbnailUrl ?? f.imageUrl,
        }));
      }
      case 'BULLETIN': {
        const resp = await bulletinService.getBulletins({ keyword: query, page: 0, size: 10 });
        const items = ((resp as any)?.data?.content ?? (resp as any)?.content ?? []) as any[];
        return items.map((b) => ({
          id: b.id,
          title: b.title,
          subtitle: b.summary,
          imageUrl: undefined,
        }));
      }
      case 'ARTICLE': {
        const resp = await articleService.getArticles({ keyword: query, page: 0, size: 10 });
        const items = ((resp as any)?.data?.content ?? (resp as any)?.content ?? []) as any[];
        return items.map((a) => ({
          // ARTICLE placements use the slug as targetId so the mobile client
          // can deep-link to the article detail page.
          id: a.slug ?? a.id,
          title: a.title,
          subtitle: a.category,
          imageUrl: a.coverMedia?.url,
        }));
      }
    }
  } catch {
    return [];
  }
  return [];
}

const featuredService = FeaturedStoryService.getInstance();

const targetTypeLabel: Record<FeaturedStoryTargetType, string> = {
  BUSINESS: 'İşletme',
  EVENT: 'Etkinlik',
  REEL: 'Reels',
  BULLETIN: 'Topluluk Bülteni',
  ARTICLE: 'Blog/Makale',
};

interface FormState {
  targetType: FeaturedStoryTargetType;
  targetId: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  businessLogoUrl?: string;
  startDate: string;
  endDate: string;
  priority: number;
  source: FeaturedStorySource;
  countryCode: string;
}

const emptyForm = (): FormState => ({
  targetType: 'BUSINESS',
  targetId: '',
  title: '',
  subtitle: '',
  imageUrl: '',
  businessLogoUrl: '',
  startDate: '',
  endDate: '',
  priority: 0,
  source: 'MANUAL',
  countryCode: '',
});

const FeaturedStories = () => {
  const [placements, setPlacements] = useState<FeaturedStoryPlacement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FeaturedStoryPlacement | null>(null);
  const [formData, setFormData] = useState(emptyForm());

  const [targetOptions, setTargetOptions] = useState<TargetOption[]>([]);
  const [targetQuery, setTargetQuery] = useState('');
  const [targetSearching, setTargetSearching] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchPlacements = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await featuredService.list();
      setPlacements(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Öne çıkan içerikler yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlacements();
  }, []);

  // Debounced unified target search — refetches whenever type/query changes.
  useEffect(() => {
    if (!dialogOpen || editing) return;
    let cancelled = false;
    setTargetSearching(true);
    const timer = setTimeout(async () => {
      const options = await fetchTargetOptions(formData.targetType, targetQuery.trim());
      if (cancelled) return;
      setTargetOptions(options);
      setTargetSearching(false);
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [targetQuery, formData.targetType, dialogOpen, editing]);

  // Clear options immediately when target type changes so the old list
  // doesn't flash while the new search loads.
  useEffect(() => {
    setTargetOptions([]);
    setTargetQuery('');
  }, [formData.targetType]);

  const openCreate = () => {
    setEditing(null);
    setFormData(emptyForm());
    setTargetOptions([]);
    setTargetQuery('');
    setDialogOpen(true);
  };

  const openEdit = (row: FeaturedStoryPlacement) => {
    setEditing(row);
    setFormData({
      targetType: row.targetType,
      targetId: row.targetId,
      title: row.title ?? row.businessName ?? '',
      subtitle: row.subtitle ?? row.businessCategoryName ?? '',
      imageUrl: row.imageUrl ?? row.businessLogoUrl ?? '',
      businessLogoUrl: row.businessLogoUrl ?? row.imageUrl ?? '',
      startDate: row.startDate,
      endDate: row.endDate,
      priority: row.priority,
      source: row.source,
      countryCode: row.countryCode ?? '',
    });
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
  };

  const handleSubmit = async () => {
    if (!formData.targetId || !formData.startDate || !formData.endDate) {
      setError('Hedef içerik, başlangıç ve bitiş tarihi zorunlu');
      return;
    }
    if (formData.targetType !== 'BUSINESS' && !formData.title.trim()) {
      setError('İşletme dışındaki hedefler için başlık zorunlu');
      return;
    }
    try {
      if (editing) {
        await featuredService.update(editing.id, {
          title: formData.title || undefined,
          subtitle: formData.subtitle || undefined,
          imageUrl: formData.imageUrl || undefined,
          startDate: formData.startDate,
          endDate: formData.endDate,
          priority: formData.priority,
          source: formData.source,
          countryCode: formData.countryCode || undefined,
        });
      } else {
        await featuredService.create({
          targetType: formData.targetType,
          targetId: formData.targetId,
          title: formData.title || undefined,
          subtitle: formData.subtitle || undefined,
          imageUrl: formData.imageUrl || undefined,
          startDate: formData.startDate,
          endDate: formData.endDate,
          priority: formData.priority,
          source: formData.source,
          countryCode: formData.countryCode || undefined,
        });
      }
      closeDialog();
      await fetchPlacements();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kayıt başarısız');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await featuredService.remove(deleteId);
      setDeleteId(null);
      await fetchPlacements();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Silme başarısız');
    }
  };

  if (loading) {
    return <LoadingState message="Öne çıkan içerikler yükleniyor..." />;
  }
  if (error && !dialogOpen) {
    return (
      <PageContainer>
        <ErrorState
          title="Yüklenemedi"
          message={error}
          onRetry={fetchPlacements}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Öne Çıkan İçerikler"
        subtitle="Mobil hikaye akışında gösterilecek işletme, etkinlik, reels veya topluluk bülteni kartlarını yönet"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Yeni Yerleşim
          </Button>
        }
      />

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>İçerik</TableCell>
              <TableCell align="center">Tür</TableCell>
              <TableCell>Aralık</TableCell>
              <TableCell align="center">Öncelik</TableCell>
              <TableCell align="center">Kaynak</TableCell>
              <TableCell align="center">Ülke</TableCell>
              <TableCell align="right">İşlemler</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {placements.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography color="text.secondary" py={2}>
                    Henüz öne çıkan içerik yok.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {placements.map((row) => {
              const displayTitle = row.title ?? row.businessName ?? row.targetId;
              const displaySubtitle = row.subtitle ?? row.businessCategoryName ?? '';
              const displayImage = row.imageUrl ?? row.businessLogoUrl ?? undefined;
              return (
                <TableRow key={row.id} hover>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1.5}>
                      <Avatar src={displayImage} sx={{ width: 32, height: 32 }}>
                        {displayTitle?.[0]?.toUpperCase() ?? '?'}
                      </Avatar>
                      <Box>
                        <Typography fontWeight={600} fontSize={14}>
                          {displayTitle}
                        </Typography>
                        {displaySubtitle && (
                          <Typography variant="caption" color="text.secondary">
                            {displaySubtitle}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </TableCell>
                  <TableCell align="center">
                    <Chip size="small" label={targetTypeLabel[row.targetType]} />
                  </TableCell>
                  <TableCell>{`${row.startDate} → ${row.endDate}`}</TableCell>
                  <TableCell align="center">
                    <Chip size="small" label={row.priority} color={row.priority > 0 ? 'primary' : 'default'} />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small"
                      label={row.source === 'MANUAL' ? 'Manuel' : 'Ücretli'}
                      color={row.source === 'PAID' ? 'warning' : 'default'}
                    />
                  </TableCell>
                  <TableCell align="center">{row.countryCode || 'Global'}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Düzenle">
                        <IconButton size="small" onClick={() => openEdit(row)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Sil">
                        <IconButton size="small" color="error" onClick={() => setDeleteId(row.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Yerleşimi Düzenle' : 'Yeni Öne Çıkan İçerik'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {!editing && (
              <TextField
                select
                label="İçerik Türü"
                value={formData.targetType}
                onChange={(e) =>
                  setFormData((p) => ({
                    ...p,
                    targetType: e.target.value as FeaturedStoryTargetType,
                    // Clear target-specific fields when type changes
                    targetId: '',
                    title: '',
                    subtitle: '',
                    imageUrl: '',
                    businessLogoUrl: '',
                  }))
                }
                fullWidth
              >
                <MenuItem value="BUSINESS">İşletme</MenuItem>
                <MenuItem value="EVENT">Etkinlik</MenuItem>
                <MenuItem value="REEL">Reels</MenuItem>
                <MenuItem value="BULLETIN">Topluluk Bülteni</MenuItem>
                <MenuItem value="ARTICLE">Blog/Makale</MenuItem>
              </TextField>
            )}

            {!editing && (
              <Autocomplete
                options={targetOptions}
                getOptionLabel={(o) => o.title}
                loading={targetSearching}
                value={
                  targetOptions.find((o) => o.id === formData.targetId) ??
                  (formData.targetId
                    ? { id: formData.targetId, title: formData.title }
                    : null)
                }
                isOptionEqualToValue={(a, b) => a.id === b.id}
                onChange={(_, value) =>
                  setFormData((prev) => ({
                    ...prev,
                    targetId: value?.id ?? '',
                    title: value?.title ?? '',
                    subtitle: value?.subtitle ?? '',
                    imageUrl: value?.imageUrl ?? '',
                    businessLogoUrl: value?.imageUrl ?? '',
                  }))
                }
                onInputChange={(_, value) => setTargetQuery(value)}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Avatar
                        src={option.imageUrl}
                        variant={
                          formData.targetType === 'BUSINESS' ? 'circular' : 'rounded'
                        }
                        sx={{ width: 32, height: 32 }}
                      >
                        {option.title[0]?.toUpperCase() ?? '?'}
                      </Avatar>
                      <Box>
                        <Typography fontSize={14}>{option.title}</Typography>
                        {option.subtitle && (
                          <Typography variant="caption" color="text.secondary">
                            {option.subtitle}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={`${targetTypeLabel[formData.targetType]} seç`}
                    placeholder={`${targetTypeLabel[formData.targetType].toLowerCase()} ara...`}
                    helperText="Yazdıkça liste filtrelenir. Seçtiğinde başlık ve görsel otomatik dolar."
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {targetSearching ? <CircularProgress size={16} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            )}

            {editing && (
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Avatar
                  src={formData.imageUrl || formData.businessLogoUrl || undefined}
                  variant={formData.targetType === 'BUSINESS' ? 'circular' : 'rounded'}
                  sx={{ width: 48, height: 48 }}
                >
                  {formData.title?.[0]?.toUpperCase() ?? '?'}
                </Avatar>
                <Box>
                  <Typography fontWeight={600}>{formData.title}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {targetTypeLabel[formData.targetType]} · {formData.targetId}
                  </Typography>
                </Box>
              </Stack>
            )}

            {/* Görsel/başlık otomatik dolar. Kullanıcı isterse override edebilir (opsiyonel). */}
            <TextField
              label="Başlık (override)"
              value={formData.title}
              onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
              helperText="Boş bırakırsan seçilen içeriğin ismi kullanılır"
              fullWidth
            />
            <TextField
              label="Alt metin (opsiyonel)"
              value={formData.subtitle}
              onChange={(e) => setFormData((p) => ({ ...p, subtitle: e.target.value }))}
              fullWidth
            />
            <TextField
              label="Görsel URL (override)"
              value={formData.imageUrl}
              onChange={(e) => setFormData((p) => ({ ...p, imageUrl: e.target.value }))}
              helperText="Önerilen: kare 320×320 px (veya 2×/3× retina: 640/960). Boş bırakırsan seçilen içeriğin görseli kullanılır. Büyük dosyalar mobile'da geç yüklenir."
              fullWidth
            />

            {/* Canlı önizleme — admin kaydetmeden önce kartın mobile'da nasıl
                görüneceğini gözle doğrular. Story card altın ring + başlık +
                "Öne Çıkan" rozet ile eşleşir. */}
            <Box
              sx={{
                mt: 1,
                p: 2,
                borderRadius: 2,
                border: '1px dashed',
                borderColor: 'divider',
                bgcolor: 'background.default',
              }}
            >
              <Typography variant="overline" color="text.secondary" fontWeight={700}>
                Hikaye Kartı Önizleme
              </Typography>
              <Stack direction="row" spacing={2} alignItems="flex-start" mt={1}>
                <Box sx={{ width: 72 }}>
                  <Box
                    sx={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      p: '2px',
                      background:
                        'linear-gradient(135deg, #C9971A 0%, #DAA520 100%)',
                      position: 'relative',
                    }}
                  >
                    <Avatar
                      src={formData.imageUrl || undefined}
                      sx={{ width: '100%', height: '100%' }}
                    >
                      {formData.title?.[0]?.toUpperCase() ?? '?'}
                    </Avatar>
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -4,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        px: 0.75,
                        py: 0.25,
                        borderRadius: 0.75,
                        background:
                          'linear-gradient(135deg, #C9971A 0%, #DAA520 100%)',
                        color: 'white',
                        fontSize: 9,
                        fontWeight: 800,
                        letterSpacing: 0.2,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ⭐ ÖNE ÇIKAN
                    </Box>
                  </Box>
                  <Typography
                    fontSize={11}
                    fontWeight={500}
                    mt={0.5}
                    sx={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: 72,
                      textAlign: 'center',
                    }}
                  >
                    {formData.title || '(isim yok)'}
                  </Typography>
                </Box>
                <Box flex={1}>
                  <Typography fontSize={13} fontWeight={600}>
                    {formData.title || '—'}
                  </Typography>
                  {formData.subtitle && (
                    <Typography fontSize={12} color="text.secondary">
                      {formData.subtitle}
                    </Typography>
                  )}
                  <Typography fontSize={11} color="text.secondary" mt={0.5}>
                    Tıklayınca: {targetTypeLabel[formData.targetType]} detay sayfası
                  </Typography>
                  {formData.imageUrl && !/^https?:\/\//.test(formData.imageUrl) && (
                    <Typography fontSize={11} color="warning.main" mt={0.5}>
                      ⚠️ Görsel URL `http(s)://` ile başlamalı, aksi halde mobile'da yüklenmez.
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Box>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Başlangıç"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData((p) => ({ ...p, startDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="Bitiş"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData((p) => ({ ...p, endDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Öncelik"
                type="number"
                value={formData.priority}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, priority: Number(e.target.value) || 0 }))
                }
                helperText="Yüksek öncelik = daha önce gösterilir"
                fullWidth
              />
              <TextField
                select
                label="Kaynak"
                value={formData.source}
                onChange={(e) =>
                  setFormData((p) => ({ ...p, source: e.target.value as FeaturedStorySource }))
                }
                fullWidth
              >
                <MenuItem value="MANUAL">Manuel</MenuItem>
                <MenuItem value="PAID">Ücretli</MenuItem>
              </TextField>
            </Stack>

            <TextField
              label="Ülke Kodu"
              value={formData.countryCode}
              onChange={(e) =>
                setFormData((p) => ({ ...p, countryCode: e.target.value.toUpperCase() }))
              }
              helperText="Boş bırak = tüm ülkeler (global). Örn: TR, RU"
              inputProps={{ maxLength: 2 }}
              fullWidth
            />

            {error && (
              <Typography color="error" fontSize={13}>
                {error}
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeDialog}>İptal</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editing ? 'Güncelle' : 'Oluştur'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!deleteId} onClose={() => setDeleteId(null)}>
        <DialogTitle>Yerleşimi Sil</DialogTitle>
        <DialogContent>
          <Typography>Bu yerleşimi silmek istediğinize emin misiniz?</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>İptal</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>
            Sil
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
};

export default FeaturedStories;
