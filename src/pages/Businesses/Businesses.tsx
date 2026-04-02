/**
 * Businesses — Premium Card-Based Redesign
 * Matching Events page pattern with glass cards, chip filters, stat cards.
 */
import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Stack, Avatar, TextField, Chip,
  LinearProgress, IconButton, Menu, MenuItem, ListItemIcon, ListItemText,
  Dialog, DialogTitle, DialogContent, DialogActions,
  alpha, Grid, Tooltip, Divider, Pagination,
} from '@mui/material';
import {
  Add as AddIcon, Search as SearchIcon, Business as BusinessIcon,
  Verified as VerifiedIcon, Star as StarIcon, Visibility as ViewIcon,
  Favorite as FavoriteIcon, Edit as EditIcon, Delete as DeleteIcon,
  MoreVert as MoreIcon, LocationOn as LocationIcon,
  CheckCircle as CheckIcon, ArrowForwardIos as ChevronIcon,
  Refresh as RefreshIcon, Category as CategoryIcon,
} from '@mui/icons-material';
import { debounce } from 'lodash';
import { useSnackbar } from 'notistack';
import { useBusinessQuery } from '../../hooks/useBusinessQuery';
import { useBusinessStore } from '../../store/businesses/businessStore';
import { useBusinessCategory } from '../../hooks/useBusinessCategory';
import { BusinessDto, BusinessStatus } from '../../types/businesses/businessModel';
import { PageContainer, PageHeader } from '../../components/Page';

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
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuBusiness, setMenuBusiness] = useState<BusinessDto | null>(null);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Featured dialog
  const [featuredOpen, setFeaturedOpen] = useState(false);
  const [featuredBusiness, setFeaturedBusiness] = useState<BusinessDto | null>(null);
  const [featuredDays, setFeaturedDays] = useState(30);

  // Query
  const queryParams = useMemo(() => ({
    page: page - 1, size: 12, keyword: searchKeyword,
    categoryId: selectedCategory || undefined,
    status: activeFilter === 'active' ? BusinessStatus.ACTIVE
      : activeFilter === 'inactive' ? BusinessStatus.INACTIVE
      : activeFilter === 'pending' ? BusinessStatus.PENDING : undefined,
    featuredOnly: activeFilter === 'featured' || undefined,
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
    featured: businesses.filter(b => b.globallyFeatured || b.locallyFeatured).length,
    totalViews: businesses.reduce((sum, b) => sum + (b.viewCount || 0), 0),
  }), [businesses, totalElements]);

  // Filter by verified (client-side for current page)
  const filteredBusinesses = useMemo(() => {
    if (activeFilter === 'verified') return businesses.filter(b => b.verified);
    if (activeFilter === 'featured') return businesses.filter(b => b.globallyFeatured || b.locallyFeatured);
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

  const handleSetFeatured = async () => {
    if (!featuredBusiness) return;
    try {
      await businessStore.setBusinessAsGloballyFeatured(featuredBusiness.ownerId, featuredBusiness.id, featuredDays);
      enqueueSnackbar('İşletme öne çıkan olarak ayarlandı', { variant: 'success' });
      resp.refetch();
    } catch { enqueueSnackbar('İşlem başarısız', { variant: 'error' }); }
    setFeaturedOpen(false); setFeaturedBusiness(null);
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
            { label: 'Öne Çıkan', value: stats.featured, icon: <StarIcon />, color: '#f59e0b' },
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
                    gridTemplateColumns: { xs: '1fr', md: '64px 1.5fr 1fr 1.2fr 48px' },
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
                      {(biz.globallyFeatured || biz.locallyFeatured) && (
                        <Chip label="Öne Çıkan" size="small"
                          sx={{ fontWeight: 700, fontSize: 10, height: 22, bgcolor: alpha('#f59e0b', 0.1), color: '#b45309', borderColor: alpha('#f59e0b', 0.3), border: '1px solid' }}
                        />
                      )}
                      {hasIncompleteProfile && (
                        <Chip label="Eksik Profil" size="small"
                          sx={{ fontWeight: 700, fontSize: 10, height: 22, bgcolor: alpha('#f97316', 0.1), color: '#c2410c', borderColor: alpha('#f97316', 0.3), border: '1px solid' }}
                        />
                      )}
                    </Stack>

                    {/* Kebab Menu */}
                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, biz)}
                      sx={{ '&:hover': { bgcolor: alpha('#000', 0.04) } }}>
                      <MoreIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              );
            })
          )}
        </Stack>

        {/* ═══ PAGINATION ═══ */}
        {totalPages > 1 && (
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
        <MenuItem onClick={() => { setFeaturedBusiness(menuBusiness); setFeaturedOpen(true); setAnchorEl(null); }}>
          <ListItemIcon><StarIcon fontSize="small" sx={{ color: '#f59e0b' }} /></ListItemIcon>
          <ListItemText>Öne Çıkar</ListItemText>
        </MenuItem>
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

      {/* ═══ FEATURED DIALOG ═══ */}
      <Dialog open={featuredOpen} onClose={() => setFeaturedOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>İşletmeyi Öne Çıkar</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {featuredBusiness?.name} işletmesini global olarak öne çıkarmak için süre belirleyin.
          </Typography>
          <TextField
            fullWidth type="number" label="Süre (gün)" value={featuredDays}
            onChange={(e) => setFeaturedDays(Number(e.target.value))}
            helperText="İşletme bu süre boyunca öne çıkarılır"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setFeaturedOpen(false)} color="inherit">İptal</Button>
          <Button onClick={handleSetFeatured} variant="contained"
            sx={{ fontWeight: 700, bgcolor: '#f59e0b', '&:hover': { bgcolor: '#d97706' } }}>
            Öne Çıkar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
