import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Grid,
  Button,
  Avatar,
  Stack,
  MenuItem,
  Divider,
  ListItemIcon,
  ListItemText,
  TextField,
  Checkbox,
  IconButton,
  Collapse,
  Card,
  InputAdornment,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Block as BlockIcon,
  CheckCircle as ActiveIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  GetApp as ExportIcon,
  PersonAdd as AddIcon,
  Group as GroupIcon,
  VerifiedUser as VerifiedIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useUsers } from '../hooks/useUsers';
import { useSnackbar } from 'notistack';
import {
  UserDTO,
  UserStatusEnum,
  AccountType,
  Language,
  LanguageDisplayNames,
  AdminUserStats,
} from '../types/users/userModel';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

import { PageContainer, PageHeader } from '../components/Page';
import { DataTable, StatusChip, StatCard } from '../components/Data';
import { FilterSelect } from '../components/Filter';
import { ConfirmDialog } from '../components/Feedback';
import { ActionMenu } from '../components/Actions';
import { userService } from '../services/user/userService';

export default function Users() {
  const navigate = useNavigate();
  const theme = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();

  // URL to State
  const page = Number(searchParams.get('page')) || 1;
  const keyword = searchParams.get('keyword') || '';
  const status = (searchParams.get('status') as UserStatusEnum) || '';
  const accountType = (searchParams.get('accountType') as AccountType) || '';
  const currentCity = searchParams.get('currentCity') || '';
  const currentDistrict = searchParams.get('currentDistrict') || '';
  const language = (searchParams.get('language') as Language) || '';

  // Local state
  const [search, setSearch] = useState(keyword);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [stats, setStats] = useState<AdminUserStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<UserDTO | null>(null);

  const hasActiveFilters = !!(accountType || status || currentCity || currentDistrict || language);

  // Stats Fetch
  useEffect(() => {
    setLoadingStats(true);
    userService
      .getUserStats()
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoadingStats(false));
  }, []);

  // Hook
  const { data, isLoading, refetch, toggleUserStatus, deleteAccount } = useUsers({
    page: page - 1,
    size: 10,
    keyword: keyword || undefined,
    accountType: accountType || undefined,
    status: status || undefined,
    language: language || undefined,
    currentCity: currentCity || undefined,
    currentDistrict: currentDistrict || undefined,
  });

  // Sync Search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== keyword) {
        updateFilter({ keyword: search, page: 1 });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [search, keyword]);

  // Handlers
  const updateFilter = useCallback(
    (newParams: Record<string, any>) => {
      const current = Object.fromEntries(searchParams.entries());
      const merged = { ...current, ...newParams };
      Object.keys(merged).forEach((key) => {
        if (merged[key] === '' || merged[key] === null || merged[key] === undefined) {
          delete merged[key];
        }
      });
      setSearchParams(merged);
    },
    [searchParams, setSearchParams],
  );

  const handleUserAction = async (userId: string, targetStatus: UserStatusEnum) => {
    try {
      await toggleUserStatus({ userId, status: targetStatus });
      enqueueSnackbar('Durum başarıyla güncellendi', { variant: 'success' });
    } catch {
      enqueueSnackbar('Durum güncellenemedi', { variant: 'error' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteUser) return;
    try {
      await deleteAccount(deleteUser.id);
      enqueueSnackbar('Hesap başarıyla silindi', { variant: 'success' });
      setDeleteDialogOpen(false);
      refetch();
    } catch {
      enqueueSnackbar('Hesap silinemedi', { variant: 'error' });
    }
  };

  const handleSelectUser = (id: string) => {
    setSelectedUsers((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.content) {
      setSelectedUsers(data.content.map((u) => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const getDisplayName = (user: UserDTO) => {
    return user.displayName || `${user.firstName} ${user.lastName}`.trim() || user.email || 'Bilinmeyen';
  };

  const columns = [
    {
      id: 'selection',
      label: (
        <Checkbox
          size="small"
          onChange={(e) => handleSelectAll(e.target.checked)}
          checked={selectedUsers.length > 0 && selectedUsers.length === data?.content.length}
          indeterminate={selectedUsers.length > 0 && selectedUsers.length < (data?.content?.length ?? 0)}
        />
      ),
      render: (user: UserDTO) => (
        <Checkbox
          size="small"
          checked={selectedUsers.includes(user.id)}
          onChange={() => handleSelectUser(user.id)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      width: 50,
    },
    {
      id: 'user',
      label: 'Kullanıcı',
      render: (user: UserDTO) => (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Avatar
            src={user.imageUrl}
            variant="rounded"
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              border: `2px solid ${theme.palette.divider}`,
              fontSize: 14,
              fontWeight: 600,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
            }}
          >
            {user.firstName ? user.firstName[0] : '?'}
          </Avatar>
          <Box>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {getDisplayName(user)}
              </Typography>
              {(user.role || []).includes('ADMIN') && (
                <VerifiedIcon sx={{ fontSize: 14, color: 'primary.main' }} />
              )}
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {user.email}
            </Typography>
          </Box>
        </Stack>
      ),
    },
    {
      id: 'status',
      label: 'Durum',
      render: (user: UserDTO) => <StatusChip status={user.userStatus} />,
    },
    {
      id: 'account',
      label: 'Hesap Türü',
      render: (user: UserDTO) => (
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: user.accountType === AccountType.BUSINESS ? 'secondary.main' : 'info.main',
            }}
          />
          <Typography variant="body2" color="text.secondary">
            {user.accountType === AccountType.BUSINESS ? 'İşletme' : 'Bireysel'}
          </Typography>
        </Stack>
      ),
    },
    {
      id: 'registration',
      label: 'Kayıt Tarihi',
      render: (user: UserDTO) => (
        <Typography variant="body2" color="text.secondary">
          {user.createdAt ? format(new Date(user.createdAt), 'dd MMM yyyy', { locale: tr }) : '-'}
        </Typography>
      ),
    },
    {
      id: 'location',
      label: 'Konum',
      render: (user: UserDTO) => (
        <Typography variant="body2" color="text.secondary">
          {user.currentCity || '-'}
        </Typography>
      ),
    },
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Kullanıcı Yönetimi"
        subtitle="Platformdaki tüm kullanıcıları izleyin, rollerini ve durumlarını yönetin."
        breadcrumbs={[{ label: 'Panel', href: '/dashboard' }, { label: 'Kullanıcılar' }]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Dışa Aktar
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
            >
              Yeni Kullanıcı
            </Button>
          </Stack>
        }
      />

      {/* Stats Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Toplam Kullanıcı"
            value={stats?.total ?? 0}
            icon={<GroupIcon />}
            loading={loadingStats}
            onClick={() => updateFilter({ status: '', page: 1 })}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Aktif"
            value={stats?.active ?? 0}
            color="success"
            icon={<ActiveIcon />}
            loading={loadingStats}
            onClick={() => updateFilter({ status: UserStatusEnum.ACTIVE, page: 1 })}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Bekleyen"
            value={stats?.pending ?? 0}
            color="warning"
            icon={<HistoryIcon />}
            loading={loadingStats}
            onClick={() => updateFilter({ status: UserStatusEnum.PENDING, page: 1 })}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Engellenen"
            value={stats?.banned ?? 0}
            color="error"
            icon={<BlockIcon />}
            loading={loadingStats}
            onClick={() => updateFilter({ status: UserStatusEnum.BLOCKED, page: 1 })}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard
            title="Bu Ay Yeni"
            value={stats?.newThisMonth ?? 0}
            color="info"
            trend={{ value: 12, label: 'geçen aya göre' }}
            loading={loadingStats}
          />
        </Grid>
      </Grid>

      {/* Search & Filter Bar */}
      <Card
        elevation={0}
        sx={{
          mb: 3,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 3,
          overflow: 'visible',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ p: 2 }}>
          <TextField
            placeholder="İsim, e-posta veya telefon ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{
              flexGrow: 1,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                bgcolor: 'background.default',
                '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.02) },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                </InputAdornment>
              ),
              ...(search && {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearch('')}>
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </InputAdornment>
                ),
              }),
            }}
          />
          <FilterSelect
            label="Hesap Türü"
            value={accountType}
            onChange={(v) => updateFilter({ accountType: v, page: 1 })}
            options={[
              { value: AccountType.INDIVIDUAL, label: 'Bireysel' },
              { value: AccountType.BUSINESS, label: 'İşletme' },
            ]}
            showAllOption
          />
          <FilterSelect
            label="Durum"
            value={status}
            onChange={(v) => updateFilter({ status: v, page: 1 })}
            options={Object.values(UserStatusEnum).map((s) => ({ value: s, label: s }))}
            showAllOption
          />
          <IconButton
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            sx={{
              bgcolor: showAdvancedFilters
                ? alpha(theme.palette.primary.main, 0.1)
                : 'background.default',
              color: showAdvancedFilters ? 'primary.main' : 'text.secondary',
              border: `1px solid ${showAdvancedFilters ? alpha(theme.palette.primary.main, 0.3) : theme.palette.divider}`,
              borderRadius: 2,
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: alpha(theme.palette.primary.main, 0.08),
              },
            }}
          >
            <FilterIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Collapse in={showAdvancedFilters}>
          <Box
            sx={{
              px: 2,
              pb: 2,
              pt: 0,
            }}
          >
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="Şehir"
                  value={currentCity}
                  onChange={(e) => updateFilter({ currentCity: e.target.value, page: 1 })}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  label="İlçe"
                  value={currentDistrict}
                  onChange={(e) => updateFilter({ currentDistrict: e.target.value, page: 1 })}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FilterSelect
                  label="Dil"
                  value={language}
                  onChange={(v) => updateFilter({ language: v, page: 1 })}
                  options={Object.entries(LanguageDisplayNames).map(([v, l]) => ({
                    value: v,
                    label: l,
                  }))}
                  showAllOption
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Button
                  fullWidth
                  variant="text"
                  color="inherit"
                  startIcon={<CloseIcon sx={{ fontSize: 16 }} />}
                  onClick={() =>
                    updateFilter({
                      currentCity: '',
                      currentDistrict: '',
                      language: '',
                      page: 1,
                    })
                  }
                  sx={{ textTransform: 'none', borderRadius: 2 }}
                >
                  Filtreleri Temizle
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </Card>

      {/* Bulk Actions Floating Bar */}
      <Collapse in={selectedUsers.length > 0}>
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
            color: 'white',
            p: 1.5,
            borderRadius: 3,
            mb: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: `0 10px 30px ${alpha(theme.palette.primary.main, 0.3)}`,
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {selectedUsers.length} Kullanıcı Seçildi
            </Typography>
            <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
            <Button
              size="small"
              color="inherit"
              startIcon={<BlockIcon />}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Engelle
            </Button>
            <Button
              size="small"
              color="inherit"
              startIcon={<DeleteIcon />}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Sil
            </Button>
          </Stack>
          <Button
            size="small"
            color="inherit"
            onClick={() => setSelectedUsers([])}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            İptal
          </Button>
        </Box>
      </Collapse>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={data?.content || []}
        loading={isLoading}
        onRowClick={(user) => navigate(`/users/${user.id}`)}
        pagination={{
          page,
          pageSize: 10,
          total: data?.totalElements || 0,
          onPageChange: (p) => updateFilter({ page: p }),
        }}
        renderRowActions={(user: UserDTO) => (
          <ActionMenu>
            <MenuItem onClick={() => navigate(`/users/${user.id}`)}>
              <ListItemIcon>
                <EditIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Düzenle / Görüntüle</ListItemText>
            </MenuItem>
            <MenuItem
              onClick={() =>
                handleUserAction(
                  user.id,
                  user.userStatus === UserStatusEnum.ACTIVE
                    ? UserStatusEnum.BLOCKED
                    : UserStatusEnum.ACTIVE,
                )
              }
            >
              <ListItemIcon>
                {user.userStatus === UserStatusEnum.ACTIVE ? (
                  <BlockIcon fontSize="small" color="error" />
                ) : (
                  <ActiveIcon fontSize="small" color="success" />
                )}
              </ListItemIcon>
              <ListItemText>
                {user.userStatus === UserStatusEnum.ACTIVE ? 'Kullanıcıyı Engelle' : 'Engeli Kaldır'}
              </ListItemText>
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => {
                setDeleteUser(user);
                setDeleteDialogOpen(true);
              }}
              sx={{ color: 'error.main' }}
            >
              <ListItemIcon>
                <DeleteIcon fontSize="small" color="error" />
              </ListItemIcon>
              <ListItemText>Hesabı Sil</ListItemText>
            </MenuItem>
          </ActionMenu>
        )}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Hesabı Kalıcı Olarak Sil"
        message={`${deleteUser?.firstName} ${deleteUser?.lastName} kullanıcısının hesabı silinecektir. Bu işlem geri alınamaz.`}
        severity="error"
        confirmLabel="Evet, Sil"
      />
    </PageContainer>
  );
}
