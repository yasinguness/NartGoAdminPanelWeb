import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  InputAdornment,
  Stack,
  Switch,
  TextField,
  Typography,
  useTheme,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Star as StarIcon,
  EmojiEvents as TrophyIcon,
  AccessTime as TimeIcon,
  Block as BlockIcon,
  LooksOne as RankOneIcon,
  LooksTwo as RankTwoIcon,
  Looks3 as RankThreeIcon,
  Category as CategoryIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { AxiosError } from 'axios';
import { PageContainer, PageHeader, PageSection } from '../../components/Page';
import { DataTable } from '../../components/Data';
import { ErrorState, LoadingState } from '../../components/Feedback';
import {
  GamificationActionAdminDto,
  GamificationConfigDto,
  GamificationDailySocialCapDto,
  GamificationMonthlyRewardsDto,
  MonthlyRewardItemDto,
  GamificationConfigRecordDto,
} from '../../types/gamification/gamificationAdmin';
import { gamificationAdminService } from '../../services/gamification/gamificationAdminService';

const colorRegex = /^[A-Fa-f0-9]{6}$/;
const resetTimeRegex = /^([01]\d|2[0-3]):[0-5]\d UTC$/;


const getErrorMessage = (error: unknown): string => {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError?.response?.data?.message || (error instanceof Error ? error.message : 'Bilinmeyen bir hata oluştu');
};

const validateDailySocialCap = (dailySocialCap: GamificationDailySocialCapDto): string | null => {
  if (dailySocialCap.maxXp < 0) return 'Günlük maksimum sosyal puan 0 veya daha büyük olmalıdır.';
  if (!resetTimeRegex.test(dailySocialCap.resetTime)) return 'Sıfırlanma saati "HH:mm UTC" formatında olmalıdır (Örn: 00:00 UTC).';
  if (!Array.isArray(dailySocialCap.affectedCategories) || dailySocialCap.affectedCategories.length === 0) {
    return 'Lütfen limite dahil olacak en az bir kategori girin.';
  }
  return null;
};

const validateAction = (action: GamificationActionAdminDto, maxXpPerAction: number): string | null => {
  if (action.xp < 0 || action.xp > 500) return `${action.label || action.reason} için puan 0 ile 500 arasında olmalıdır.`;
  if (action.xp > maxXpPerAction) return `${action.label || action.reason} işleminden kazanılacak puan, genel barajı aşamaz.`;
  return null;
};

const validateMonthlyRewards = (monthlyRewards: GamificationMonthlyRewardsDto): string | null => {
  const rewards = Array.isArray(monthlyRewards.rewards) ? monthlyRewards.rewards : [];
  if (rewards.length < 3) return 'Aylık ödüller, sıralamadaki ilk 3 dereceyi içermelidir.';

  for (const reward of rewards) {
    if (!reward.title.trim()) return `${reward.rank}. derece için ödül başlığı zorunludur.`;
    if (!reward.description.trim()) return `${reward.rank}. derece için ödül açıklaması zorunludur.`;
    if (!reward.icon.trim()) return `${reward.rank}. derece için ikon kodu zorunludur.`;
    if (!colorRegex.test(reward.color)) return `${reward.rank}. derece için geçerli bir renk kodu girmelisiniz (örn: FFD700).`;
  }
  return null;
};

export default function GamificationSettings() {
  const { enqueueSnackbar } = useSnackbar();
  const theme = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allConfigs, setAllConfigs] = useState<GamificationConfigRecordDto[]>([]);
  const [selectedConfigKey, setSelectedConfigKey] = useState<string>('DEFAULT');
  const [config, setConfig] = useState<GamificationConfigDto | null>(null);
  const [editingAction, setEditingAction] = useState<GamificationActionAdminDto | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newConfigKey, setNewConfigKey] = useState('');

  const loadConfigData = useCallback(async (key: string) => {
    try {
      setLoading(true);
      const data = await gamificationAdminService.getConfigByKey(key);
      setConfig(data.config);
      setSelectedConfigKey(data.configKey);
    } catch (e) {
      enqueueSnackbar('Konfigürasyon yüklenemedi: ' + getErrorMessage(e), { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  const loadAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const records = await gamificationAdminService.getConfigs();
      setAllConfigs(records);
      
      const current = records.find(r => r.configKey === selectedConfigKey) || records.find(r => r.configKey === 'DEFAULT') || records[0];
      if (current) {
        setSelectedConfigKey(current.configKey);
        setConfig(current.config);
      }
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [selectedConfigKey]);

  useEffect(() => {
    loadAll();
  }, []);

  const handleConfigChange = (key: string) => {
    loadConfigData(key);
  };

  const handleSaveAll = async () => {
    if (!config || !selectedConfigKey) return;

    if (config.maxXpPerAction < 0 || config.maxXpPerAction > 500) {
      enqueueSnackbar('Tek işlemde kazanılabilecek maksimum puan 0 ile 500 arasında olmalıdır.', { variant: 'error' });
      return;
    }

    const capError = validateDailySocialCap(config.dailySocialCap);
    if (capError) {
      enqueueSnackbar(capError, { variant: 'error' });
      return;
    }

    const rewardsError = validateMonthlyRewards(config.monthlyRewards);
    if (rewardsError) {
      enqueueSnackbar(rewardsError, { variant: 'error' });
      return;
    }

    const actionError = config.actions
      .map((action) => validateAction(action, config.maxXpPerAction))
      .find((message): message is string => Boolean(message));
    if (actionError) {
      enqueueSnackbar(actionError, { variant: 'error' });
      return;
    }


    try {
      setSaving(true);
      await gamificationAdminService.updateConfigByKey(selectedConfigKey, config);
      enqueueSnackbar(`${selectedConfigKey} ayarları başarıyla kaydedildi!`, { variant: 'success' });
      loadAll();
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleCreateConfig = async () => {
    if (!newConfigKey.trim() || !config) return;
    
    try {
      setSaving(true);
      const key = newConfigKey.trim().toUpperCase();
      await gamificationAdminService.createConfig({
        configKey: key,
        config: config
      });
      enqueueSnackbar('Yeni konfigürasyon oluşturuldu: ' + key, { variant: 'success' });
      setIsCreateDialogOpen(false);
      setNewConfigKey('');
      setSelectedConfigKey(key);
      loadAll();
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfig = async (key: string) => {
    if (key === 'DEFAULT') return;
    
    if (!window.confirm(`${key} konfigürasyonunu silmek istediğinize emin misiniz?`)) return;

    try {
      setSaving(true);
      await gamificationAdminService.deleteConfig(key);
      enqueueSnackbar('Konfigürasyon silindi: ' + key, { variant: 'success' });
      if (selectedConfigKey === key) {
        setSelectedConfigKey('DEFAULT');
      }
      loadAll();
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };


  const handleEditActionSave = () => {
    if (!config || !editingAction) return;

    const validationError = validateAction(editingAction, config.maxXpPerAction);
    if (validationError) {
      enqueueSnackbar(validationError, { variant: 'error' });
      return;
    }

    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        actions: prev.actions.map((action) => (action.reason === editingAction.reason ? editingAction : action)),
      };
    });

    setEditingAction(null);
  };

  const updateReward = (rank: number, updater: (reward: MonthlyRewardItemDto) => MonthlyRewardItemDto) => {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        monthlyRewards: {
          ...prev.monthlyRewards,
          rewards: prev.monthlyRewards.rewards.map((reward) => (reward.rank === rank ? updater(reward) : reward)),
        },
      };
    });
  };

  const actionColumns = useMemo(() => [
    { id: 'reason', label: 'Sistem Kodu (Reason)' },
    { 
      id: 'xp', 
      label: 'Ödül Puanı', 
      align: 'center' as const,
      render: (row: GamificationActionAdminDto) => (
        <Chip
          icon={<StarIcon sx={{ fontSize: 16 }} />}
          label={`+${row.xp} XP`}
          color="primary"
          variant="outlined"
          size="small"
          sx={{ fontWeight: 'bold' }}
        />
      ),
    },
    { id: 'label', label: 'Görünen Etiket (Uygulama İçi)' },
    { 
      id: 'category', 
      label: 'Kategori',
      render: (row: GamificationActionAdminDto) => (
        <Chip label={row.category} size="small" sx={{ textTransform: 'capitalize' }} />
      ),
    },
    {
      id: 'dailyCap',
      label: 'Günlük Sınıra Tabi Mi?',
      align: 'center' as const,
      render: (row: GamificationActionAdminDto) => (
        <Chip 
          label={row.dailyCap ? 'Evet' : 'Hayır'} 
          color={row.dailyCap ? 'warning' : 'default'} 
          size="small" 
          variant={row.dailyCap ? 'filled' : 'outlined'}
        />
      ),
    },
  ], []);

  if (loading) {
    return <LoadingState message="Oyunlaştırma ayarları yükleniyor..." />;
  }

  if (error || !config) {
    return (
      <PageContainer>
        <ErrorState
          title="Ayarlar Yüklenemedi"
          message={error ?? 'Oyunlaştırma ayarları alınırken beklenmeyen bir hata oluştu.'}
          onRetry={loadConfig}
        />
      </PageContainer>
    );
  }

  const sortedRewards = [...config.monthlyRewards.rewards].sort((a, b) => a.rank - b.rank);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <RankOneIcon sx={{ fontSize: 32, color: '#FFD700' }} />;
      case 2:
        return <RankTwoIcon sx={{ fontSize: 32, color: '#C0C0C0' }} />;
      case 3:
        return <RankThreeIcon sx={{ fontSize: 32, color: '#CD7F32' }} />;
      default:
        return <TrophyIcon sx={{ fontSize: 32 }} />;
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Oyunlaştırma Ayarları"
        subtitle={`Uygulama içi kullanıcı aksiyonları ve ödül periyotlarını "${selectedConfigKey}" üzerinden yönetin.`}
        breadcrumbs={[
          { label: 'Gösterge Paneli', href: '/dashboard' },
          { label: 'Oyunlaştırma', active: true },
        ]}
        actions={
          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              select
              size="small"
              label="Aktif Konfigürasyon"
              value={selectedConfigKey}
              onChange={(e) => handleConfigChange(e.target.value)}
              SelectProps={{ native: true }}
              sx={{ minWidth: 200, bgcolor: 'background.paper' }}
            >
              {allConfigs.map((r) => (
                <option key={r.configKey} value={r.configKey}>
                  {r.configKey}
                </option>
              ))}
            </TextField>

            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setIsCreateDialogOpen(true)}
              sx={{ bgcolor: 'background.paper' }}
            >
              Yeni Ekle
            </Button>

            {selectedConfigKey !== 'DEFAULT' && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => handleDeleteConfig(selectedConfigKey)}
                sx={{ bgcolor: 'background.paper' }}
              >
                Sil
              </Button>
            )}

            <Button 
              variant="outlined" 
              startIcon={<RefreshIcon />} 
              onClick={loadAll}
              sx={{ bgcolor: 'background.paper' }}
            >
              Yenile
            </Button>

            <Button 
              variant="contained" 
              startIcon={<SaveIcon />} 
              onClick={handleSaveAll} 
              disabled={saving}
            >
              Değişiklikleri Kaydet
            </Button>
          </Stack>
        }
      />


      <PageSection 
        title="Puan Kazandıran Aksiyonlar" 
        subtitle="Kullanıcıların hangi işlemler sonucu ne kadar puan (XP) kazanacağını belirleyin."
      >
        <Card variant="outlined">
          <DataTable
            columns={actionColumns}
            data={config.actions}
            renderRowActions={(row: GamificationActionAdminDto) => (
              <Button size="small" startIcon={<EditIcon />} onClick={() => setEditingAction({ ...row })}>
                Düzenle
              </Button>
            )}
          />
        </Card>
      </PageSection>

      <PageSection 
        title="Günlük Limit (Social Cap) ve Genel Kısıtlamalar" 
        subtitle="Suistimalları önlemek için kullanıcıların günlük bazda sosyal etkileşimlerden alabileceği maksimum tecrübe puanlarını yapılandırın."
      >
        <Card variant="outlined">
          <CardContent sx={{ p: 4 }}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={4}>
                <Stack spacing={3}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <BlockIcon color="primary" />
                    <Typography variant="h6">Limit Değerleri</Typography>
                  </Box>
                  <TextField
                    type="number"
                    label="Günlük Maksimum Sosyal Puan"
                    helperText="Bir kullanıcının sosyal etkileşimlerle günlük kazanabileceği en fazla XP"
                    fullWidth
                    value={config.dailySocialCap.maxXp}
                    onChange={(e) => setConfig((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        dailySocialCap: { ...prev.dailySocialCap, maxXp: Number(e.target.value) || 0 },
                      };
                    })}
                  />
                  <TextField
                    type="number"
                    label="Tek İşlemde Maksimum Puan"
                    helperText="Herhangi bir uygulama içi aksiyonda alınabilecek limit değer"
                    fullWidth
                    value={config.maxXpPerAction}
                    onChange={(e) => setConfig((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        maxXpPerAction: Number(e.target.value) || 0,
                      };
                    })}
                  />
                </Stack>
              </Grid>

              <Grid item xs={12} md={4}>
                <Stack spacing={3}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <TimeIcon color="primary" />
                    <Typography variant="h6">Sıfırlanma Periyodu</Typography>
                  </Box>
                  <TextField
                    type="text"
                    label="Günlük Sıfırlanma Saati (UTC)"
                    helperText='Zamanı "HH:mm UTC" formatında belirtin (Örn: "00:00 UTC")'
                    fullWidth
                    value={config.dailySocialCap.resetTime}
                    onChange={(e) => setConfig((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        dailySocialCap: { ...prev.dailySocialCap, resetTime: e.target.value },
                      };
                    })}
                  />
                </Stack>
              </Grid>

              <Grid item xs={12} md={4}>
                <Stack spacing={3}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <CategoryIcon color="primary" />
                    <Typography variant="h6">Etkilenen Kategoriler</Typography>
                  </Box>
                  <TextField
                    type="text"
                    label="Kategoriler"
                    helperText="Günlük limitten etkilenecek kategorileri aralarına virgül koyarak yazın (örn: social,community)"
                    fullWidth
                    value={config.dailySocialCap.affectedCategories.join(', ')}
                    onChange={(e) => setConfig((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        dailySocialCap: {
                          ...prev.dailySocialCap,
                          affectedCategories: e.target.value
                            .split(',')
                            .map((value) => value.trim())
                            .filter(Boolean),
                        },
                      };
                    })}
                  />
                  {config.dailySocialCap.affectedCategories.length > 0 && (
                    <Box display="flex" gap={1} flexWrap="wrap">
                      {config.dailySocialCap.affectedCategories.map((cat, i) => (
                        <Chip key={i} label={cat} size="small" color="primary" variant="outlined" />
                      ))}
                    </Box>
                  )}
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </PageSection>

      <PageSection 
        title="Aylık Liderlik Tablosu Ödülleri" 
        subtitle="Aylık periyotlardaki liderlik sıralamasında dereceye giren ilk 3 kullanıcıya verilecek ödülleri belirleyin."
      >
        <Card variant="outlined" sx={{ mb: 3 }}>
          <CardContent sx={{ p: 4 }}>
            <Grid container spacing={4}>
              <Grid item xs={12} md={6}>
                <Stack spacing={3}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <TrophyIcon color="primary" />
                    <Typography variant="h6">Dönem Bilgileri</Typography>
                  </Box>
                  <TextField
                    label="Peryot Başlığı"
                    placeholder="Örn: 14 Günlük Dönem"
                    fullWidth
                    value={config.monthlyRewards.month}
                    onChange={(e) => setConfig((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        monthlyRewards: { ...prev.monthlyRewards, month: e.target.value },
                      };
                    })}
                  />
                  <TextField
                    label="Kampanya Başlığı"
                    placeholder="Örn: 14 Günlük Ödüller"
                    fullWidth
                    value={config.monthlyRewards.title}
                    onChange={(e) => setConfig((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        monthlyRewards: { ...prev.monthlyRewards, title: e.target.value },
                      };
                    })}
                  />
                  <TextField
                    label="Kampanya Açıklaması"
                    placeholder="Kullanıcılara gösterilecek genel kampanya açıklaması"
                    fullWidth
                    multiline
                    rows={2}
                    value={config.monthlyRewards.description}
                    onChange={(e) => setConfig((prev) => {
                      if (!prev) return prev;
                      return {
                        ...prev,
                        monthlyRewards: { ...prev.monthlyRewards, description: e.target.value },
                      };
                    })}
                  />
                </Stack>
              </Grid>

              <Grid item xs={12} md={6}>
                <Stack spacing={3}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <TimeIcon color="primary" />
                    <Typography variant="h6">Zamanlama ve Sıfırlama</Typography>
                  </Box>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        type="number"
                        label="Dönem Süresi (Gün)"
                        helperText="Toplam periyot süresi"
                        fullWidth
                        value={config.monthlyRewards.periodDays}
                        onChange={(e) => setConfig((prev) => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            monthlyRewards: { ...prev.monthlyRewards, periodDays: Number(e.target.value) || 0 },
                          };
                        })}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        type="number"
                        label="Sıfırlama Periyodu (Gün)"
                        helperText="Kaç günde bir sıfırlanacak?"
                        fullWidth
                        value={config.monthlyRewards.resetEveryDays}
                        onChange={(e) => setConfig((prev) => {
                          if (!prev) return prev;
                          return {
                            ...prev,
                            monthlyRewards: { ...prev.monthlyRewards, resetEveryDays: Number(e.target.value) || 0 },
                          };
                        })}
                      />
                    </Grid>
                  </Grid>
                  <TextField
                    label="Sıfırlanma Tarihi (Gözlem)"
                    value={config.monthlyRewards.resetAt || ''}
                    disabled
                    fullWidth
                    helperText="Backend tarafından hesaplanan bir sonraki sıfırlanma zamanı"
                  />
                  <Alert severity="info" sx={{ mt: 1 }}>
                    <strong>Kalan Süre:</strong> {config.monthlyRewards.daysRemaining || 0} gün kaldı
                  </Alert>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <StarIcon color="warning" fontSize="small" /> Derece Bazlı Ödül Tanımları
        </Typography>

        <Grid container spacing={3}>
          {sortedRewards.map((reward) => (
            <Grid item xs={12} md={4} key={reward.rank}>
              <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box 
                  sx={{ 
                    px: 3, 
                    py: 2, 
                    bgcolor: 'background.default', 
                    borderBottom: '1px solid', 
                    borderColor: 'divider',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5
                  }}
                >
                  {getRankIcon(reward.rank)}
                  <Typography variant="h6" fontWeight="bold">
                    {reward.rank}. Sıra Ödülü
                  </Typography>
                </Box>
                <CardContent sx={{ p: 3, flexGrow: 1 }}>
                  <Stack spacing={2.5}>
                    <TextField
                      label="Ödül Başlığı"
                      value={reward.title}
                      placeholder="Örn: 200₺ Hediye Çeki"
                      onChange={(e) => updateReward(reward.rank, (prev) => ({ ...prev, title: e.target.value }))}
                      fullWidth
                    />
                    <TextField
                      label="Ödül Açıklaması"
                      value={reward.description}
                      placeholder="Ödül detayları, nasıl kullanılacağı vb."
                      onChange={(e) => updateReward(reward.rank, (prev) => ({ ...prev, description: e.target.value }))}
                      fullWidth
                      multiline
                      rows={3}
                    />
                    <Stack direction="row" spacing={2}>
                      <TextField
                        label="İkon Sınıfı"
                        value={reward.icon}
                        placeholder="Örn: local_activity"
                        onChange={(e) => updateReward(reward.rank, (prev) => ({ ...prev, icon: e.target.value }))}
                        fullWidth
                      />
                      <TextField
                        label="Tema Rengi (HEX)"
                        value={reward.color}
                        placeholder="FFD700"
                        onChange={(e) => updateReward(reward.rank, (prev) => ({ ...prev, color: e.target.value.toUpperCase().replace(/^#/, '') }))}
                        fullWidth
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Box
                                sx={{
                                  width: 24,
                                  height: 24,
                                  borderRadius: '50%',
                                  backgroundColor: colorRegex.test(reward.color) ? `#${reward.color}` : 'transparent',
                                  border: '1px solid',
                                  borderColor: theme.palette.divider,
                                }}
                              />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </PageSection>


      <Dialog open={Boolean(editingAction)} onClose={() => setEditingAction(null)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Aksiyon Puanlamasını Düzenle</DialogTitle>
        <DialogContent dividers sx={{ p: 4 }}>
          {editingAction && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <TextField 
                  label="Sistem Kodu (Değiştirilemez)" 
                  value={editingAction.reason} 
                  disabled 
                  fullWidth 
                  helperText="Bu değer arka planda işlem eşleştirmesi için kullanılır."
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  type="number"
                  label="Kazanılacak Puan (XP)"
                  value={editingAction.xp}
                  onChange={(e) => setEditingAction((prev) => (prev ? { ...prev, xp: Number(e.target.value) || 0 } : prev))}
                  fullWidth
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><StarIcon color="primary" fontSize="small" /></InputAdornment>,
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Kullanıcıya Gösterilecek Etiket"
                  value={editingAction.label}
                  placeholder="Örn: İlk İşletme Yorumu"
                  onChange={(e) => setEditingAction((prev) => (prev ? { ...prev, label: e.target.value } : prev))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="Detaylı Açıklama"
                  value={editingAction.description}
                  placeholder="Kullanıcı bu puanı nasıl kazandığını açıklayan metin"
                  onChange={(e) => setEditingAction((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
                  fullWidth
                  multiline
                  rows={2}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="Kategori"
                  value={editingAction.category}
                  placeholder="Örn: social, contribution"
                  onChange={(e) => setEditingAction((prev) => (prev ? { ...prev, category: e.target.value } : prev))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  label="İlgili İkon"
                  value={editingAction.icon}
                  placeholder="Material icon adı, örn: rate_review"
                  onChange={(e) => setEditingAction((prev) => (prev ? { ...prev, icon: e.target.value } : prev))}
                  fullWidth
                />
              </Grid>
              <Grid item xs={12}>
                <Box p={2} border="1px solid" borderColor="divider" borderRadius={1} bgcolor="background.default">
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(editingAction.dailyCap)}
                        color="primary"
                        onChange={(e) => setEditingAction((prev) => (prev ? { ...prev, dailyCap: e.target.checked } : prev))}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="subtitle1" fontWeight="medium">Günlük Sosyal Limite Tabi Kıl</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Eğer aktifse, bu işlem "Günlük Maksimum Sosyal Puan" kotasından harcar. Belirtilen kotayı dolduran kullanıcı bu işlemden puan alamaz.
                        </Typography>
                      </Box>
                    }
                  />
                </Box>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditingAction(null)} color="inherit">
            İptal Et
          </Button>
          <Button variant="contained" onClick={handleEditActionSave} startIcon={<SaveIcon />}>
            Aksiyonu Kaydet
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog open={isCreateDialogOpen} onClose={() => setIsCreateDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Yeni Konfigürasyon Oluştur</DialogTitle>
        <DialogContent dividers>
          <Box py={2}>
            <TextField
              label="Konfigürasyon Anahtarı"
              placeholder="Örn: RAMAZAN_PAKETI"
              fullWidth
              value={newConfigKey}
              onChange={(e) => setNewConfigKey(e.target.value.toUpperCase().trim())}
              helperText="Bosluk bırakmayın. Mevcut ayarlarınız yeni kayda kopyalanacaktır."
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsCreateDialogOpen(false)}>İptal</Button>
          <Button
            variant="contained"
            onClick={handleCreateConfig}
            disabled={!newConfigKey.trim() || saving}
            startIcon={<SaveIcon />}
          >
            Oluştur ve Düzenle
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}

