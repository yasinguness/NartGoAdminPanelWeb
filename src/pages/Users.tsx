import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from '@mui/material';
import {
  Block as BlockIcon,
  CheckCircle as ActiveIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useUsers } from '../hooks/useUsers';
import { useSnackbar } from 'notistack';
import { UserDTO, UserStatusEnum, AccountType, Language, LanguageDisplayNames } from '../types/users/userModel';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

// New components
import { PageContainer, PageHeader } from '../components/Page';
import { DataTable, StatusChip, StatCard } from '../components/Data';
import { FilterBar, FilterSelect } from '../components/Filter';
import { ConfirmDialog } from '../components/Feedback';
import { FormGrid } from '../components/Form';
import { ActionMenu } from '../components/Actions';

export default function Users() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  
  // State
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  
  // Filters
  const [accountTypeFilter, setAccountTypeFilter] = useState<AccountType | ''>('');
  const [statusFilter, setStatusFilter] = useState<UserStatusEnum | ''>('');
  const [languageFilter, setLanguageFilter] = useState<Language | ''>('');
  const [countryCodeFilter, setCountryCodeFilter] = useState('');
  const [currentCityFilter, setCurrentCityFilter] = useState('');
  const [currentDistrictFilter, setCurrentDistrictFilter] = useState('');
  const [hometownCityFilter, setHometownCityFilter] = useState('');
  const [hometownVillageFilter, setHometownVillageFilter] = useState('');
  const [birthDateFrom, setBirthDateFrom] = useState<Date | null>(null);
  const [birthDateTo, setBirthDateTo] = useState<Date | null>(null);

  // Dialogs
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteUser, setDeleteUser] = useState<UserDTO | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Hook
  const {
    data,
    isLoading,
    refetch,
    toggleUserStatus,
    deleteAccount,
  } = useUsers({
    page: page - 1,
    size: rowsPerPage,
    keyword: debouncedSearch.length >= 2 ? debouncedSearch : undefined,
    accountType: accountTypeFilter || undefined,
    status: statusFilter || undefined,
    language: languageFilter || undefined,
    countryCode: countryCodeFilter || undefined,
    currentCity: currentCityFilter || undefined,
    currentDistrict: currentDistrictFilter || undefined,
    hometownCity: hometownCityFilter || undefined,
    hometownVillage: hometownVillageFilter || undefined,
    birthDateFrom: birthDateFrom ? birthDateFrom.toISOString().split('T')[0] : undefined,
    birthDateTo: birthDateTo ? birthDateTo.toISOString().split('T')[0] : undefined
  });

  // Handlers
  const handleUserAction = async (userId: string, action: 'block' | 'unblock') => {
    try {
      const status = action === 'block' ? UserStatusEnum.BLOCKED : UserStatusEnum.ACTIVE;
      await toggleUserStatus({ userId, status });
      enqueueSnackbar(`Kullanıcı başarıyla ${action === 'block' ? 'engellendi' : 'engeli kaldırıldı'}`, { variant: 'success' });
    } catch (error) {
      enqueueSnackbar(`Kullanıcı ${action === 'block' ? 'engellenemedi' : 'engeli kaldırılamadı'}`, { variant: 'error' });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteUser) return;
    try {
      await deleteAccount(deleteUser.id);
      enqueueSnackbar('Hesap başarıyla silindi', { variant: 'success' });
      setDeleteDialogOpen(false);
      await refetch();
    } catch (error) {
      enqueueSnackbar('Hesap silinemedi', { variant: 'error' });
    }
  };

  const clearFilters = () => {
    setAccountTypeFilter('');
    setStatusFilter('');
    setLanguageFilter('');
    setCountryCodeFilter('');
    setCurrentCityFilter('');
    setCurrentDistrictFilter('');
    setHometownCityFilter('');
    setHometownVillageFilter('');
    setBirthDateFrom(null);
    setBirthDateTo(null);
  };

  const getDisplayName = (user: UserDTO) => {
    const explicitDisplayName = (user.displayName ?? '').trim();
    if (explicitDisplayName) {
      return explicitDisplayName;
    }
    const firstName = (user.firstName ?? '').trim();
    const lastName = (user.lastName ?? '').trim();
    const fullName = `${firstName} ${lastName}`.trim();
    return fullName || user.email || 'Bilinmeyen Kullanıcı';
  };

  const getAvatarInitial = (user: UserDTO) => {
    const firstName = (user.firstName ?? '').trim();
    if (firstName.length > 0) {
      return firstName[0]?.toUpperCase();
    }
    const email = (user.email ?? '').trim();
    return email.length > 0 ? email[0]?.toUpperCase() : '?';
  };

  const columns = [
    {
      id: 'user',
      label: 'Kullanıcı',
      render: (user: UserDTO) => (
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            src={user.imageUrl}
            variant="rounded"
            sx={{ width: 40, height: 40, bgcolor: 'primary.light', border: 1, borderColor: 'divider' }}
          >
            {getAvatarInitial(user)}
          </Avatar>
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {getDisplayName(user)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user.phoneCode} {user.gsmNo}
            </Typography>
          </Box>
        </Stack>
      )
    },
    { id: 'email', label: 'E-posta' },
    {
      id: 'userStatus',
      label: 'Durum',
      render: (user: UserDTO) => <StatusChip status={user.userStatus} />
    },
    {
      id: 'accountType',
      label: 'Hesap',
      render: (user: UserDTO) => (
        <StatusChip
          status={user.accountType === AccountType.BUSINESS ? 'İşletme' : 'Bireysel'}
          color={user.accountType === AccountType.BUSINESS ? 'secondary' : 'default'}
        />
      )
    },
    {
      id: 'location',
      label: 'Şehir',
      render: (user: UserDTO) => user.currentAddress?.city || '-'
    }
  ];

  return (
    <PageContainer>
      <PageHeader
        title="Kullanıcılar"
        subtitle="Kullanıcı hesaplarını yönetin, durumları izleyin ve yetkileri güncelleyin"
        breadcrumbs={[
          { label: 'Kontrol Paneli', href: '/dashboard' },
          { label: 'Kullanıcılar' }
        ]}
        actions={
          <Button variant="contained" startIcon={<RefreshIcon />} onClick={() => refetch()}>
            Listeyi Yenile
          </Button>
        }
      />

      {/* Stats Summary */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="Toplam Kullanıcı" value={data?.totalElements ?? 0} color="primary" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Aktif"
            value={data?.content?.filter(u => u.userStatus === UserStatusEnum.ACTIVE).length ?? 0} 
            color="success" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Engelli"
            value={data?.content?.filter(u => u.userStatus === UserStatusEnum.BLOCKED).length ?? 0} 
            color="error" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Yöneticiler"
            value={data?.content?.filter(u => (u.role ?? []).some(r => r === 'ADMIN')).length ?? 0} 
            color="warning" 
          />
        </Grid>
      </Grid>

      {/* Enhanced Filter Bar */}
      <FilterBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Ad, E-posta veya Telefon ile ara...'
        }}
        filters={
          <>
            <FilterSelect
              label="Tür"
              value={accountTypeFilter}
              onChange={(v) => setAccountTypeFilter(v as AccountType | '')}
              options={[
                { value: AccountType.INDIVIDUAL, label: 'Bireysel' },
                { value: AccountType.BUSINESS, label: 'İşletme' }
              ]}
              showAllOption
              allOptionLabel="Tüm Türler"
            />
            <FilterSelect
              label="Durum"
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as UserStatusEnum | '')}
              options={Object.values(UserStatusEnum).map(s => ({ value: s, label: s }))}
              showAllOption
              allOptionLabel="Tüm Durumlar"
            />
          </>
        }
        advancedFilters={
          <FormGrid spacing={2}>
            <FilterSelect
              label="Dil"
              value={languageFilter}
              onChange={(v) => setLanguageFilter(v as Language)}
              options={Object.entries(LanguageDisplayNames).map(([v, l]) => ({ value: v, label: l }))}
            />
            <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker 
                  label="Doğum Tarihi Başlangıç"
                  value={birthDateFrom} 
                  onChange={setBirthDateFrom} 
                  slotProps={{ textField: { size: 'small', fullWidth: true } }} 
                />
                <DatePicker 
                  label="Doğum Tarihi Bitiş"
                  value={birthDateTo} 
                  onChange={setBirthDateTo} 
                  slotProps={{ textField: { size: 'small', fullWidth: true } }} 
                />
              </LocalizationProvider>
            </Stack>
            <Stack direction="row" spacing={2} sx={{ width: '100%' }}>
              <TextField
                placeholder="Şehir"
                value={currentCityFilter} 
                onChange={(e) => setCurrentCityFilter(e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                placeholder="İlçe"
                value={currentDistrictFilter} 
                onChange={(e) => setCurrentDistrictFilter(e.target.value)}
                size="small"
                fullWidth
              />
            </Stack>
          </FormGrid>
        }
        onClearFilters={clearFilters}
        activeFilterCount={[accountTypeFilter, statusFilter, languageFilter].filter(Boolean).length}
      />

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={data?.content || []}
        loading={isLoading}
        onRowClick={(user) => navigate(`/users/${user.id}`)}
        pagination={{
            page: page,
            pageSize: rowsPerPage,
            total: data?.totalElements || 0,
            onPageChange: setPage,
        }}
        renderRowActions={(user: UserDTO) => (
          <ActionMenu>
            <MenuItem onClick={() => navigate(`/users/${user.id}`)}>
              <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
              <ListItemText>Detayları Düzenle</ListItemText>
            </MenuItem>
            <MenuItem onClick={() => handleUserAction(user.id, user.userStatus === UserStatusEnum.ACTIVE ? 'block' : 'unblock')}>
              <ListItemIcon>
                {user.userStatus === UserStatusEnum.ACTIVE ? <BlockIcon fontSize="small" color="error" /> : <ActiveIcon fontSize="small" color="success" />}
              </ListItemIcon>
              <ListItemText>{user.userStatus === UserStatusEnum.ACTIVE ? 'Kullanıcıyı Engelle' : 'Engeli Kaldır'}</ListItemText>
            </MenuItem>
            <MenuItem>
                <ListItemIcon><HistoryIcon fontSize="small" /></ListItemIcon>
                <ListItemText>Geçmişi Görüntüle</ListItemText>
            </MenuItem>
            <Divider />
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
        title="Kullanıcı Hesabını Sil"
        message={`${deleteUser?.firstName} adlı kullanıcının hesabını kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`}
        severity="error"
        confirmLabel="Hesabı Sil"
      />
    </PageContainer>
  );
}
