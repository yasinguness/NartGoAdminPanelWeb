/**
 * Businesses — Premium Card-Based Redesign
 * Matching Events page pattern with glass cards, chip filters, stat cards.
 */
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box, Typography, Button, Stack, Avatar, TextField, Chip, IconButton, Menu, MenuItem, ListItemIcon, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions,
  alpha, Grid, Tooltip, Divider, Pagination,
} from '@mui/material';
import {
  Add as AddIcon, Search as SearchIcon, Business as BusinessIcon,
  Verified as VerifiedIcon, Star as StarIcon, Visibility as ViewIcon,
  Favorite as FavoriteIcon, Delete as DeleteIcon,
  MoreVert as MoreIcon, LocationOn as LocationIcon,
  CheckCircle as CheckIcon,
  Refresh as RefreshIcon, StarBorder as StarBorderIcon, EventRepeat as ExtendIcon, StarHalf as UnfeatureIcon,
} from '@mui/icons-material';
import { debounce } from 'lodash';
import { useSnackbar } from 'notistack';
import { useBusinessQuery } from '../../hooks/useBusinessQuery';
import { useBusinessStore } from '../../store/businesses/businessStore';
import { useBusinessCategory } from '../../hooks/useBusinessCategory';
import { BusinessDto, BusinessStatus } from '../../types/businesses/businessModel';
import { PageContainer, PageHeader } from '../../components/Page';
import { featuredAdminService, featuredErrorText, formatDate, type FeaturedList, type FeaturedItem } from '../../services/business/featuredAdminService';
import FeatureDialog, { type FeatureTarget } from './FeatureDialog';

// ─── PREMIUM STYLES ──────────────────────────────────────
const glassCardSx = {
  bgcolor: 'background.paper',
  border: '1px solid', borderColor: 'divider', borderRadius: 3,
  overflow: 'hidden',
  transition: 'all 0.2s ease',
  cursor: 'pointer',
  '&:hover': {
    borderColor: 'primary.light',
    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
    transform: 'translateY(-2px)',
  },
};

const statCardSx = (color: string) => ({
  p: 2.5, borderRadius: 3, bgcolor: 'background.paper',
  border: '1px solid',
  position: 'relative' as const, overflow: 'hidden',
  background: `linear-gradient(135deg, ${alpha(color, 0.06)} 0%, ${alpha(color, 0.02)} 100%)`,
  borderColor: alpha(color, 0.12),
  transition: 'all 0.2s ease',
  '&:hover': {
    borderColor: alpha(color, 0.25),
    boxShadow: `0 8px 24px ${alpha(color, 0.12)}`,
  },
});

// ─── FILTERS ──────────────────────────────────────────
type FilterKey = 'all' | 'active' | 'inactive' | 'pending' | 'verified' | 'featured';

const FILTERS: { id: FilterKey; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'active', label: 'Aktif' },
  { id: 'inactive', label: 'Pasif' },
  { id: 'pending', label: 'Beklemede' },
  { id: 'verified', label: 'Doğrulanmış' },
  { id: 'featured', label: 'Öne Çıkan' },
];

// ─── COMPONENT ──────────────────────────────────────────
export default function Businesses() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { categories } = useBusinessCategory();
  const businessStore = useBusinessStore();

  // State
  const [page, setPage] = useState(1);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchParams] = useSearchParams();
  // ?filter=featured: panel ana sayfasındaki "öne çıkarma bitiyor" kartından gelir.
  const [activeFilter, setActiveFilter] = useState<FilterKey>(() => {
    const f = searchParams.get('filter');
    return FILTERS.some((x) => x.id === f) ? (f as FilterKey) : 'all';
  });
  const [selectedCategory, setSelectedCategory] = useState('');

  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuBusiness, setMenuBusiness] = useState<BusinessDto | null>(null);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Öne çıkarma: liste sunucudan (sayfadan bağımsız, süresi dolanlar hariç), yalnız genel öne çıkarma.
  const [featured, setFeatured] = useState<FeaturedList | null>(null);
  const [featureTarget, setFeatureTarget] = useState<FeatureTarget | null>(null);
  const [unfeatureTarget, setUnfeatureTarget] = useState<{ id: string; name: string } | null>(null);
  const loadFeatured = useCallback(() => {
    featuredAdminService.list().then(setFeatured).catch((e) => enqueueSnackbar(featuredErrorText(e), { variant: 'error' }));
  }, [enqueueSnackbar]);
  useEffect(() => { loadFeatured(); }, [loadFeatured]);
  const featuredById = useMemo(() => new Map((featured?.items ?? []).map((f) => [f.id, f])), [featured]);
  const openFeature = (id: string, name: string) => setFeatureTarget({ id, name, activeUntil: featuredById.get(id)?.featuredEndDate ?? null });

  // Query
  const queryParams = useMemo(() => ({
    page: page - 1, size: 12, keyword: searchKeyword,
    categoryId: selectedCategory || undefined,
    status: activeFilter === 'active' ? BusinessStatus.ACTIVE
      : activeFilter === 'inactive' ? BusinessStatus.INACTIVE
      : activeFilter === 'pending' ? BusinessStatus.PENDING : undefined,
    includeUnverified: true, includeInactive: true,
  }), [page, searchKeyword, selectedCategory, activeFilter]);

  const resp = useBusinessQuery(queryParams);
  const businesses: BusinessDto[] = resp.data || [];
  const totalElements = resp.totalElements || 0;
  const totalPages = Math.ceil(totalElements / 12);
  const maxViewCount = Math.max(...businesses.map(b => b.viewCount || 0), 1);

  // Debounced search
  const debouncedSearch = useMemo(
    () => debounce((v: string) => { setSearchKeyword(v); setPage(1); }, 500),
    []
  );

  // Stats
  const stats = useMemo(() => ({
    total: totalElements,
    verified: businesses.filter(b => b.verified).length,
    featured: featured?.count ?? 0,
    totalViews: businesses.reduce((sum, b) => sum + (b.viewCount || 0), 0),
  }), [businesses, totalElements, featured]);

  // Filter by verified (client-side for current page)
  const filteredBusinesses = useMemo(() => {
    if (activeFilter === 'verified') return businesses.filter(b => b.verified);
    return businesses;
  }, [businesses, activeFilter]);

  // ─── HANDLERS ─────────────────────────────────────
  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>, b: BusinessDto) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
    setMenuBusiness(b);
  };

  const handleVerify = async (b: BusinessDto) => {
    try {
      await businessStore.verifyBusiness(b.id);
      enqueueSnackbar(b.verified ? 'Doğrulama kaldırıldı' : 'İşletme doğrulandı', { variant: 'success' });
      resp.refetch();
    } catch { enqueueSnackbar('İşlem başarısız', { variant: 'error' }); }
    setAnchorEl(null);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await businessStore.hardDeleteBusiness(deletingId);
      enqueueSnackbar('İşletme kalıcı olarak silindi', { variant: 'success' });
      resp.refetch();
    } catch { enqueueSnackbar('Silme işlemi başarısız', { variant: 'error' }); }
    setDeleteOpen(false); setDeletingId(null);
  };

  const afterFeatureChange = () => { loadFeatured(); resp.refetch(); };

  const handleUnfeature = async () => {
    if (!unfeatureTarget) return;
    try {
      await featuredAdminService.unfeature(unfeatureTarget.id);
      enqueueSnackbar(`${unfeatureTarget.name}: öne çıkarma iptal edildi.`, { variant: 'success' });
      afterFeatureChange();
    } catch (e) { enqueueSnackbar(featuredErrorText(e), { variant: 'error' }); }
    setUnfeatureTarget(null);
  };

  // ─── RENDER ───────────────────────────────────────
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', pb: 8 }}>
      <PageContainer>
        <PageHeader
          title="İşletme Yönetimi"
          subtitle="İş ortaklarınızı, aboneliklerinizi ve öne çıkan listelemeleri yönetin."
          actions={
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => resp.refetch()}
                sx={{ borderRadius: 2.5, textTransform: 'none', fontWeight: 600 }}>
                Yenile
              </Button>
              <Button variant="contained" startIcon={<AddIcon />}
                onClick={() => navigate('/businesses/new')}
                sx={{ borderRadius: 2.5, px: 3, textTransform: 'none', fontWeight: 700,
                  boxShadow: '0 4px 14px 0 rgba(30, 107, 60, 0.39)',
                }}>
                Yeni İşletme Ekle
              </Button>
            </Stack>
          }
          breadcrumbs={[
            { label: 'Kontrol Paneli', href: '/' },
            { label: 'İşletmeler', active: true },
          ]}
        />

        {/* ═══ STAT CARDS ═══ */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[
            { label: 'Toplam İşletme', value: stats.total, icon: <BusinessIcon />, color: '#1e6b3c' },
            { label: 'Doğrulanmış', value: stats.verified, icon: <VerifiedIcon />, color: '#3b82f6' },
            { label: featured?.endingSoon ? `Öne Çıkan · ${featured.endingSoon} tanesi 7 günde bitiyor` : 'Öne Çıkan', value: stats.featured, icon: <StarIcon />, color: '#f59e0b' },
            { label: 'Toplam Görüntülenme', value: stats.totalViews.toLocaleString('tr-TR'), icon: <ViewIcon />, color: '#8b5cf6' },
          ].map((stat, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Box sx={statCardSx(stat.color)}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={1}>
                      {stat.label}
                    </Typography>
                    <Typography variant="h4" fontWeight={800} sx={{ mt: 0.75, color: stat.color }}>
                      {stat.value}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: alpha(stat.color, 0.12), color: stat.color, width: 48, height: 48, borderRadius: 2.5 }}>
                    {stat.icon}
                  </Avatar>
                </Stack>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* ═══ SEARCH & FILTERS ═══ */}
        <Box sx={{
          bgcolor: 'background.paper', p: 2, borderRadius: 3, mb: 3,
          border: '1px solid', borderColor: 'divider',
          display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', gap: 2,
        }}>
          <TextField
            fullWidth placeholder="İşletme adı, kategori veya konuma göre ara..."
            onChange={(e) => debouncedSearch(e.target.value)}
            size="small"
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.disabled', mr: 1, fontSize: 20 }} />,
              sx: { borderRadius: 2, bgcolor: 'background.default', '&:hover': { bgcolor: alpha('#000', 0.02) } },
            }}
          />
          <Stack direction="row" spacing={1} sx={{ flexShrink: 0, flexWrap: 'wrap' }}>
            {FILTERS.map((f) => (
              <Chip key={f.id} label={f.label}
                onClick={() => { setActiveFilter(f.id); setPage(1); }}
                color={activeFilter === f.id ? 'primary' : 'default'}
                variant={activeFilter === f.id ? 'filled' : 'outlined'}
                sx={{ fontWeight: 600, borderRadius: 2, px: 1, height: 36,
                  borderColor: activeFilter === f.id ? 'primary.main' : 'divider',
                }}
              />
            ))}
          </Stack>
        </Box>

        {/* ═══ CATEGORY CHIPS (optional) ═══ */}
        {categories.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ mb: 3, flexWrap: 'wrap', gap: 0.5 }}>
            <Chip label="Tüm Kategoriler" size="small"
              onClick={() => { setSelectedCategory(''); setPage(1); }}
              color={!selectedCategory ? 'primary' : 'default'}
              variant={!selectedCategory ? 'filled' : 'outlined'}
              sx={{ fontWeight: 600, fontSize: 11 }}
            />
            {categories.slice(0, 8).map((cat) => (
              <Chip key={cat.id} label={cat.name} size="small"
                onClick={() => { setSelectedCategory(cat.id); setPage(1); }}
                color={selectedCategory === cat.id ? 'primary' : 'default'}
                variant={selectedCategory === cat.id ? 'filled' : 'outlined'}
                sx={{ fontWeight: 500, fontSize: 11 }}
              />
            ))}
          </Stack>
        )}

        {/* ═══ BUSINESS LIST ═══ */}
        {activeFilter === 'featured' ? (
          <FeaturedPanel data={featured} onOpen={(id) => navigate(`/businesses/${id}`)}
            onExtend={(f) => setFeatureTarget({ id: f.id, name: f.name, activeUntil: f.featuredEndDate })}
            onCancel={(f) => setUnfeatureTarget({ id: f.id, name: f.name })} />
        ) : (
        <Stack spacing={2}>
          {resp.isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Box key={i} sx={{ height: 88, borderRadius: 4, bgcolor: 'background.paper', opacity: 0.5,
                animation: 'pulse 1.5s infinite',
                '@keyframes pulse': { '0%,100%': { opacity: 0.4 }, '50%': { opacity: 0.7 } },
              }} />
            ))
          ) : filteredBusinesses.length === 0 ? (
            <Box sx={{ py: 10, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 4 }}>
              <BusinessIcon sx={{ fontSize: 56, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h5" color="text.disabled" fontWeight={700}>İşletme Bulunamadı</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Arama veya filtrelerinizi değiştirmeyi deneyin.
              </Typography>
            </Box>
          ) : (
            filteredBusinesses.map((biz) => {
              const viewPct = maxViewCount > 0 ? Math.round(((biz.viewCount || 0) / maxViewCount) * 100) : 0;
              const hasIncompleteProfile = !biz.address?.city || !biz.ownerName;

              return (
                <Box key={biz.id} sx={glassCardSx} onClick={() => navigate(`/businesses/${biz.id}`)}>
                  <Box sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '64px 1.5fr 1fr 1.2fr 84px' },
                    gap: 3, alignItems: 'center', p: 2.5,
                  }}>
                    {/* Avatar */}
                    <Avatar
                      src={biz.profileImageUrl}
                      variant="rounded"
                      sx={{ width: 64, height: 64, borderRadius: 3, border: '1px solid', borderColor: 'divider',
                        bgcolor: alpha('#1e6b3c', 0.08), color: '#1e6b3c', fontWeight: 800, fontSize: 20,
                      }}
                    >
                      {biz.name?.[0]?.toUpperCase() || <BusinessIcon />}
                    </Avatar>

                    {/* Info */}
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Typography variant="subtitle1" fontWeight={800} noWrap>{biz.name}</Typography>
                        {biz.verified && (
                          <Tooltip title="Doğrulanmış İşletme">
                            <VerifiedIcon sx={{ fontSize: 16, color: '#3b82f6' }} />
                          </Tooltip>
                        )}
                      </Stack>
                      <Stack direction="row" spacing={2} sx={{ mt: 0.5, color: 'text.secondary' }}>
                        <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocationIcon sx={{ fontSize: 14 }} /> {biz.address?.city || 'Konum belirtilmemiş'}
                        </Typography>
                        <Chip label={biz.categoryName || 'Kategori yok'} size="small"
                          sx={{ height: 20, fontSize: 10, fontWeight: 700 }} />
                      </Stack>
                      {biz.ownerName && (
                        <Typography variant="caption" color="text.disabled" sx={{ mt: 0.3, display: 'block' }}>
                          Sahip: {biz.ownerName}
                        </Typography>
                      )}
                    </Box>

                    {/* Stats */}
                    <Box>
                      <Stack spacing={0.5}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <ViewIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                          <Typography variant="caption" fontWeight={600} sx={{ fontFamily: 'monospace', minWidth: 40 }}>
                            {(biz.viewCount || 0).toLocaleString()}
                          </Typography>
                          <Box sx={{ flex: 1, maxWidth: 60, height: 3, bgcolor: alpha('#1e6b3c', 0.1), borderRadius: 2, overflow: 'hidden' }}>
                            <Box sx={{ width: `${viewPct}%`, height: '100%', bgcolor: '#1e6b3c', borderRadius: 2 }} />
                          </Box>
                        </Stack>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <FavoriteIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                          <Typography variant="caption" color="text.secondary">{biz.favoriteCount || 0}</Typography>
                        </Stack>
                        {biz.averageRating ? (
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <StarIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
                            <Typography variant="caption" fontWeight={700}>{biz.averageRating.toFixed(1)}</Typography>
                            <Typography variant="caption" color="text.disabled">({biz.totalReviews})</Typography>
                          </Stack>
                        ) : (
                          <Typography variant="caption" color="text.disabled">Değerlendirme yok</Typography>
                        )}
                      </Stack>
                    </Box>

                    {/* Status Badges */}
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
                      <Chip
                        label={biz.status === BusinessStatus.ACTIVE ? 'Aktif' : biz.status === BusinessStatus.PENDING ? 'Beklemede' : 'Pasif'}
                        size="small"
                        color={biz.status === BusinessStatus.ACTIVE ? 'success' : biz.status === BusinessStatus.PENDING ? 'warning' : 'default'}
                        variant="outlined"
                        sx={{ fontWeight: 700, fontSize: 10, height: 22 }}
                      />
                      {featuredById.has(biz.id) && (
                        <Tooltip title={`${formatDate(featuredById.get(biz.id)!.featuredEndDate)} tarihine kadar`}>
                          <Chip icon={<StarIcon sx={{ fontSize: 14, color: '#b45309 !important' }} />} label={`Öne çıkan · ${remainingText(featuredById.get(biz.id)!)}`} size="small"
                            sx={{ fontWeight: 700, fontSize: 10, height: 22, bgcolor: alpha('#f59e0b', 0.1), color: '#b45309', borderColor: alpha('#f59e0b', 0.3), border: '1px solid' }}
                          />
                        </Tooltip>
                      )}
                      {hasIncompleteProfile && (
                        <Chip label="Eksik Profil" size="small"
                          sx={{ fontWeight: 700, fontSize: 10, height: 22, bgcolor: alpha('#f97316', 0.1), color: '#c2410c', borderColor: alpha('#f97316', 0.3), border: '1px solid' }}
                        />
                      )}
                    </Stack>

                    {/* Öne çıkar kısayolu + menü */}
                    <Stack direction="row" spacing={0.5} alignItems="center">
                    <Tooltip title={featuredById.has(biz.id) ? 'Öne çıkarma süresini değiştir' : 'Öne çıkar'}>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); openFeature(biz.id, biz.name); }}>
                        {featuredById.has(biz.id) ? <StarIcon fontSize="small" sx={{ color: '#f59e0b' }} /> : <StarBorderIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, biz)}
                      sx={{ '&:hover': { bgcolor: alpha('#000', 0.04) } }}>
                      <MoreIcon fontSize="small" />
                    </IconButton>
                    </Stack>
                  </Box>
                </Box>
              );
            })
          )}
        </Stack>
        )}

        {/* ═══ PAGINATION ═══ */}
        {activeFilter !== 'featured' && totalPages > 1 && (
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 3, px: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>
              {totalElements} işletme · Sayfa {page} / {totalPages}
            </Typography>
            <Pagination count={totalPages} page={page} onChange={(_, v) => setPage(v)} color="primary" shape="rounded" />
          </Stack>
        )}
      </PageContainer>

      {/* ═══ KEBAB MENU ═══ */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{ paper: { sx: { borderRadius: 3, minWidth: 200, boxShadow: '0 12px 32px rgba(0,0,0,0.12)' } } }}>
        <MenuItem onClick={() => { navigate(`/businesses/${menuBusiness?.id}`); setAnchorEl(null); }}>
          <ListItemIcon><ViewIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Detayları Gör</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { if (menuBusiness) handleVerify(menuBusiness); }}>
          <ListItemIcon><CheckIcon fontSize="small" color={menuBusiness?.verified ? 'error' : 'success'} /></ListItemIcon>
          <ListItemText>{menuBusiness?.verified ? 'Doğrulamayı Kaldır' : 'Doğrula'}</ListItemText>
        </MenuItem>
        {menuBusiness && featuredById.has(menuBusiness.id) ? [
          <MenuItem key="extend" onClick={() => { openFeature(menuBusiness.id, menuBusiness.name); setAnchorEl(null); }}>
            <ListItemIcon><ExtendIcon fontSize="small" sx={{ color: '#f59e0b' }} /></ListItemIcon>
            <ListItemText primary="Süreyi uzat / değiştir" secondary={`Bitiş: ${formatDate(featuredById.get(menuBusiness.id)!.featuredEndDate)}`} />
          </MenuItem>,
          <MenuItem key="cancel" onClick={() => { setUnfeatureTarget({ id: menuBusiness.id, name: menuBusiness.name }); setAnchorEl(null); }}>
            <ListItemIcon><UnfeatureIcon fontSize="small" /></ListItemIcon>
            <ListItemText>Öne çıkarmayı iptal et</ListItemText>
          </MenuItem>,
        ] : (
          <MenuItem onClick={() => { if (menuBusiness) openFeature(menuBusiness.id, menuBusiness.name); setAnchorEl(null); }}>
            <ListItemIcon><StarIcon fontSize="small" sx={{ color: '#f59e0b' }} /></ListItemIcon>
            <ListItemText>Öne çıkar</ListItemText>
          </MenuItem>
        )}
        <Divider />
        <MenuItem onClick={() => { setDeletingId(menuBusiness?.id || null); setDeleteOpen(true); setAnchorEl(null); }}
          sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Kalıcı Olarak Sil</ListItemText>
        </MenuItem>
      </Menu>

      {/* ═══ DELETE DIALOG ═══ */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>İşletmeyi Sil</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Bu işlem geri alınamaz. İşletme ve tüm ilişkili verileri kalıcı olarak silinecektir.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteOpen(false)} color="inherit">İptal</Button>
          <Button onClick={handleDelete} variant="contained" color="error" sx={{ fontWeight: 700 }}>
            Kalıcı Olarak Sil
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══ ÖNE ÇIKARMA ═══ */}
      <FeatureDialog target={featureTarget} onClose={() => setFeatureTarget(null)} onDone={afterFeatureChange} />
      <Dialog open={Boolean(unfeatureTarget)} onClose={() => setUnfeatureTarget(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Öne çıkarmayı iptal et</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            {unfeatureTarget?.name} hemen öne çıkanlardan kalkar; kalan süre geri gelmez. İstersen sonra yeniden öne çıkarabilirsin.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setUnfeatureTarget(null)} color="inherit">Vazgeç</Button>
          <Button onClick={() => void handleUnfeature()} variant="contained" color="error" sx={{ fontWeight: 700 }}>İptal et</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

const remainingText = (f: FeaturedItem) =>
  f.remainingDays == null ? 'süresiz' : f.remainingDays === 0 ? 'bugün bitiyor' : `${f.remainingDays} gün kaldı`;

/** Öne çıkanlar sekmesi: bitişi en yakın önce; uzat ve iptal tek tıkla. */
function FeaturedPanel({ data, onOpen, onExtend, onCancel }: {
  data: FeaturedList | null; onOpen: (id: string) => void; onExtend: (f: FeaturedItem) => void; onCancel: (f: FeaturedItem) => void;
}) {
  if (!data) return <Typography color="text.secondary" sx={{ py: 6, textAlign: 'center' }}>Yükleniyor…</Typography>;
  if (data.items.length === 0) {
    return (
      <Box sx={{ py: 10, textAlign: 'center', bgcolor: 'background.paper', borderRadius: 4, border: '1px solid', borderColor: 'divider' }}>
        <StarBorderIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
        <Typography variant="h6" fontWeight={700}>Şu an öne çıkan işletme yok</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>"Tümü" sekmesinde bir işletmenin yıldızına basarak öne çıkarabilirsin.</Typography>
      </Box>
    );
  }
  return (
    <Box sx={{ bgcolor: 'background.paper', borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
      {data.items.map((f, i) => {
        const total = f.featuredStartDate && f.featuredEndDate ? new Date(f.featuredEndDate).getTime() - new Date(f.featuredStartDate).getTime() : 0;
        const left = f.featuredEndDate ? new Date(f.featuredEndDate).getTime() - Date.now() : 0;
        const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((left / total) * 100))) : 100;
        const soon = f.remainingDays != null && f.remainingDays <= 7;
        return (
          <Box key={f.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '48px 1.6fr 1.4fr 0.8fr auto' }, gap: 2, alignItems: 'center', px: 2.5, py: 2,
            borderTop: i ? '1px solid' : 'none', borderColor: 'divider' }}>
            <Avatar src={f.profileImageUrl ?? undefined} variant="rounded" sx={{ width: 48, height: 48, borderRadius: 2 }}>{f.name?.[0]}</Avatar>
            <Box sx={{ cursor: 'pointer', minWidth: 0 }} onClick={() => onOpen(f.id)}>
              <Typography fontWeight={700} noWrap>{f.name}</Typography>
              <Typography variant="caption" color="text.secondary">{[f.categoryName, f.city].filter(Boolean).join(' · ') || '—'}{f.status && f.status !== 'ACTIVE' ? ' · pasif (öne çıkanlarda görünmez)' : ''}</Typography>
            </Box>
            <Box>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" fontWeight={700} color={soon ? 'warning.dark' : 'text.primary'}>{remainingText(f)}</Typography>
                <Typography variant="caption" color="text.secondary">{formatDate(f.featuredEndDate)}</Typography>
              </Stack>
              <Box sx={{ mt: 0.5, height: 6, borderRadius: 3, bgcolor: alpha('#f59e0b', 0.15), overflow: 'hidden' }}>
                <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: soon ? '#d97706' : '#f59e0b' }} />
              </Box>
              <Typography variant="caption" color="text.disabled">Başlangıç: {formatDate(f.featuredStartDate)}</Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{f.views.toLocaleString('tr-TR')} gösterim</Typography>
              <Typography variant="caption" color="text.secondary">{f.clicks.toLocaleString('tr-TR')} tıklama</Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" startIcon={<ExtendIcon />} onClick={() => onExtend(f)} sx={{ textTransform: 'none', borderRadius: 2 }}>Süreyi uzat</Button>
              <Button size="small" color="error" onClick={() => onCancel(f)} sx={{ textTransform: 'none', borderRadius: 2 }}>İptal et</Button>
            </Stack>
          </Box>
        );
      })}
    </Box>
  );
}
