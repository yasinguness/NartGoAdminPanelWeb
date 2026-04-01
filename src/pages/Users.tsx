import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Tooltip,
  IconButton,
  Collapse,
} from '@mui/material';
import {
  Block as BlockIcon,
  CheckCircle as ActiveIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
  Delete as DeleteIcon,
  FilterList as FilterIcon,
  Search as SearchIcon,
  MoreVert as MoreIcon,
  GetApp as ExportIcon,
  PersonAdd as AddIcon,
  Group as GroupIcon,
  VerifiedUser as VerifiedIcon,
  Warning as WarningIcon,
  AttachMoney as PremiumIcon,
} from '@mui/icons-material';
import { useUsers } from '../hooks/useUsers';
import { useSnackbar } from 'notistack';
import { 
    UserDTO, 
    UserStatusEnum, 
    AccountType, 
    Language, 
    LanguageDisplayNames,
    AdminUserStats 
} from '../types/users/userModel';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

// New components
import { PageContainer, PageHeader } from '../components/Page';
import { DataTable, StatusChip, StatCard } from '../components/Data';
import { FilterBar, FilterSelect } from '../components/Filter';
import { ConfirmDialog } from '../components/Feedback';
import { FormGrid } from '../components/Form';
import { ActionMenu } from '../components/Actions';
import { userService } from '../services/user/userService';

export default function Users() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { enqueueSnackbar } = useSnackbar();
  
  // URL to State
  const page = Number(searchParams.get('page')) || 1;
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status') as UserStatusEnum || '';
  const accountType = searchParams.get('accountType') as AccountType || '';
  const currentCity = searchParams.get('currentCity') || '';
  const currentDistrict = searchParams.get('currentDistrict') || '';
  const language = searchParams.get('language') as Language || '';

  // Local state for UI
  const [search, setSearch] = useState(keyword);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [stats, setStats] = useState<AdminUserStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<UserDTO | null>(null);

  // Stats Fetch
  useEffect(() => {
    setLoadingStats(true);
    userService.getUserStats()
      .then(res => setStats(res.data))
      .catch(err => console.error('Failed to fetch stats', err))
      .finally(() => setLoadingStats(false));
  }, []);

  // Hook
  const {
    data,
    isLoading,
    refetch,
    toggleUserStatus,
    deleteAccount,
  } = useUsers({
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
  const updateFilter = useCallback((newParams: Record<string, any>) => {
    const current = Object.fromEntries(searchParams.entries());
    const merged = { ...current, ...newParams };
    
    // Remove empty values
    Object.keys(merged).forEach(key => {
      if (merged[key] === '' || merged[key] === null || merged[key] === undefined) {
        delete merged[key];
      }
    });

    setSearchParams(merged);
  }, [searchParams, setSearchParams]);

  const handleUserAction = async (userId: string, targetStatus: UserStatusEnum) => {
    try {
      await toggleUserStatus({ userId, status: targetStatus });
      enqueueSnackbar('Durum başarıyla güncellendi', { variant: 'success' });
    } catch (error) {
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
    } catch (error) {
      enqueueSnackbar('Hesap silinemedi', { variant: 'error' });
    }
  };

  const handleSelectUser = (id: string) => {
    setSelectedUsers(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && data?.content) {
      setSelectedUsers(data.content.map(u => u.id));
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
      label: <Checkbox size="small" onChange={(e) => handleSelectAll(e.target.checked)} checked={selectedUsers.length > 0 && selectedUsers.length === data?.content.length} />,
      render: (user: UserDTO) => (
        <Checkbox 
          size="small" 
          checked={selectedUsers.includes(user.id)} 
          onChange={() => handleSelectUser(user.id)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      width: 50
    },
    {
      id: 'user',
      label: 'Kullanıcı',
      render: (user: UserDTO) => (
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            src={user.imageUrl}
            variant="rounded"
            sx={{ width: 42, height: 42, borderRadius: 1.5, border: '2px solid', borderColor: 'divider' }}
          >
            {user.firstName ? user.firstName[0] : '?'}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {getDisplayName(user)}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {user.email}
              {(user.role || []).includes('ADMIN') && <VerifiedIcon sx={{ fontSize: 14, color: 'primary.main' }} />}
            </Typography>
          </Box>
        </Stack>
      )
    },
    {
      id: 'status',
      label: 'Durum',
      render: (user: UserDTO) => <StatusChip status={user.userStatus} />
    },
    {
      id: 'account',
      label: 'Hesap Türü',
      render: (user: UserDTO) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box 
            sx={{ 
                width: 8, 
                height: 8, 
                borderRadius: '50%', 
                bgcolor: user.accountType === AccountType.BUSINESS ? 'secondary.main' : 'info.main' 
            }} 
          />
          <Typography variant="body2" color="text.secondary">
            {user.accountType === AccountType.BUSINESS ? 'İşletme' : 'Bireysel'}
          </Typography>
        </Box>
      )
    },
    {
      id: 'registration',
      label: 'Kayıt Tarihi',
      render: (user: UserDTO) => (
        <Typography variant="body2" color="text.secondary">
          {user.createdAt ? format(new Date(user.createdAt), 'dd MMM yyyy', { locale: tr }) : '-'}
        </Typography>
      )
    },
    {
        id: 'location',
        label: 'Konum',
        render: (user: UserDTO) => (
            <Typography variant="body2" color="text.secondary">
                {user.currentCity || '-'}
            </Typography>
        )
    }
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Kullanıcı Yönetimi"
        subtitle="Platformdaki tüm kullanıcıları izleyin, rollerini ve durumlarını yönetin."
        breadcrumbs={[
          { label: 'Panel', href: '/dashboard' },
          { label: 'Kullanıcılar' }
        ]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<ExportIcon />}>Dışa Aktar</Button>
            <Button variant="contained" startIcon={<AddIcon />}>Yeni Kullanıcı</Button>
          </Stack>
        }
      />

      {/* Stats Row */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard 
            title="Toplam Kullanıcı" 
            value={stats?.total ?? 0} 
            icon={<GroupIcon sx={{ color: 'primary.main' }} />}
            loading={loadingStats}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard 
            title="Aktif" 
            value={stats?.active ?? 0} 
            color="success"
            icon={<ActiveIcon sx={{ color: 'success.main' }} />}
            loading={loadingStats}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard 
            title="Bekleyen" 
            value={stats?.pending ?? 0} 
            color="warning"
            icon={<HistoryIcon sx={{ color: 'warning.main' }} />}
            loading={loadingStats}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={2.4}>
          <StatCard 
            title="Engellenen" 
            value={stats?.banned ?? 0} 
            color="error"
            icon={<BlockIcon sx={{ color: 'error.main' }} />}
            loading={loadingStats}
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

      {/* Filter and Actions Bar */}
      <Box sx={{ mb: 3, position: 'relative' }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <TextField
            placeholder="İsim, e-posta veya telefon ile ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ flexGrow: 1, '& .MuiOutlinedInput-root': { borderRadius: 2, bgcolor: 'background.paper' } }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />,
            }}
          />
          <FilterSelect
            label="Hesap Türü"
            value={accountType}
            onChange={(v) => updateFilter({ accountType: v, page: 1 })}
            options={[
              { value: AccountType.INDIVIDUAL, label: 'Bireysel' },
              { value: AccountType.BUSINESS, label: 'İşletme' }
            ]}
            showAllOption
          />
          <FilterSelect
            label="Durum"
            value={status}
            onChange={(v) => updateFilter({ status: v, page: 1 })}
            options={Object.values(UserStatusEnum).map(s => ({ value: s, label: s }))}
            showAllOption
          />
          <IconButton 
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            sx={{ 
                bgcolor: showAdvancedFilters ? 'primary.light' : 'background.paper',
                color: showAdvancedFilters ? 'primary.main' : 'text.secondary',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2
            }}
          >
            <FilterIcon fontSize="small" />
          </IconButton>
        </Stack>

        <Collapse in={showAdvancedFilters}>
            <Box sx={{ p: 2, mb: 2, bgcolor: 'background.default', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={3}>
                        <TextField 
                            fullWidth 
                            size="small" 
                            label="Şehir" 
                            value={currentCity} 
                            onChange={(e) => updateFilter({ currentCity: e.target.value, page: 1 })} 
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <TextField 
                            fullWidth 
                            size="small" 
                            label="İlçe" 
                            value={currentDistrict} 
                            onChange={(e) => updateFilter({ currentDistrict: e.target.value, page: 1 })} 
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <FilterSelect
                            label="Dil"
                            value={language}
                            onChange={(v) => updateFilter({ language: v, page: 1 })}
                            options={Object.entries(LanguageDisplayNames).map(([v, l]) => ({ value: v, label: l }))}
                            showAllOption
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Button 
                            fullWidth 
                            variant="text" 
                            color="inherit" 
                            onClick={() => updateFilter({ currentCity: '', currentDistrict: '', language: '', page: 1 })}
                        >
                            Filtreleri Temizle
                        </Button>
                    </Grid>
                </Grid>
            </Box>
        </Collapse>

        {/* Bulk Actions Floating Bar */}
        <Collapse in={selectedUsers.length > 0}>
            <Box 
              sx={{ 
                position: 'sticky', 
                top: 0, 
                zIndex: 10, 
                bgcolor: 'primary.dark', 
                color: 'white', 
                p: 1.5, 
                borderRadius: 2, 
                mb: 2, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.3)'
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{selectedUsers.length} Kullanıcı Seçildi</Typography>
                <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
                <Button size="small" color="inherit" startIcon={<BlockIcon />}>Engelle</Button>
                <Button size="small" color="inherit" startIcon={<DeleteIcon />}>Sil</Button>
              </Stack>
              <Button size="small" color="inherit" onClick={() => setSelectedUsers([])}>İptal</Button>
            </Box>
        </Collapse>
      </Box>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={data?.content || []}
        loading={isLoading}
        onRowClick={(user) => navigate(`/users/${user.id}`)}
        pagination={{
            page: page,
            pageSize: 10,
            total: data?.totalElements || 0,
            onPageChange: (p) => updateFilter({ page: p }),
        }}
        renderRowActions={(user: UserDTO) => (
          <ActionMenu>
            <MenuItem onClick={() => navigate(`/users/${user.id}`)}>
              <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Düzenle / Görüntüle</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleUserAction(user.id, user.userStatus === UserStatusEnum.ACTIVE ? UserStatusEnum.BLOCKED : UserStatusEnum.ACTIVE)}>
              <ListItemIcon>
                {user.userStatus === UserStatusEnum.ACTIVE ? <BlockIcon fontSize="small" color="error" /> : <ActiveIcon fontSize="small" color="success" />}
              </ListItemIcon>
              <ListItemText>{user.userStatus === UserStatusEnum.ACTIVE ? 'Kullanıcıyı Engelle' : 'Engeli Kaldır'}</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => { setDeleteUser(user); setDeleteDialogOpen(true); }} sx={{ color: 'error.main' }}>
              <ListItemIcon><DeleteIcon fontSize="small" color="error" /></ListItemIcon>
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
