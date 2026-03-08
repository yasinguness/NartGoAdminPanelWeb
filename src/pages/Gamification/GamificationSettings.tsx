import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { Edit as EditIcon, Refresh as RefreshIcon, Save as SaveIcon } from '@mui/icons-material';
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
} from '../../types/gamification/gamificationAdmin';
import { gamificationAdminService } from '../../services/gamification/gamificationAdminService';

const colorRegex = /^[A-Fa-f0-9]{6}$/;
const resetTimeRegex = /^([01]\d|2[0-3]):[0-5]\d UTC$/;

const getErrorMessage = (error: unknown): string => {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError?.response?.data?.message || (error instanceof Error ? error.message : 'Unknown error');
};

const validateDailySocialCap = (dailySocialCap: GamificationDailySocialCapDto): string | null => {
  if (dailySocialCap.maxXp < 0) return 'dailySocialCap.maxXp 0 veya üzeri olmalı';
  if (!resetTimeRegex.test(dailySocialCap.resetTime)) return 'dailySocialCap.resetTime "HH:mm UTC" formatında olmalı';
  if (!Array.isArray(dailySocialCap.affectedCategories) || dailySocialCap.affectedCategories.length === 0) {
    return 'dailySocialCap.affectedCategories en az 1 kategori içermeli';
  }
  return null;
};

const validateAction = (action: GamificationActionAdminDto, maxXpPerAction: number): string | null => {
  if (action.xp < 0 || action.xp > 500) return `${action.reason} için xp 0..500 aralığında olmalı`;
  if (action.xp > maxXpPerAction) return `${action.reason} için xp, maxXpPerAction değerini aşamaz`;
  return null;
};

const validateMonthlyRewards = (monthlyRewards: GamificationMonthlyRewardsDto): string | null => {
  const rewards = Array.isArray(monthlyRewards.rewards) ? monthlyRewards.rewards : [];
  if (rewards.length < 3) return 'monthlyRewards.rewards en az rank 1..3 içermeli';

  for (const reward of rewards) {
    if (!reward.title.trim()) return `rank ${reward.rank} için başlık zorunlu`;
    if (!reward.description.trim()) return `rank ${reward.rank} için açıklama zorunlu`;
    if (!reward.icon.trim()) return `rank ${reward.rank} için ikon zorunlu`;
    if (!colorRegex.test(reward.color)) return `rank ${reward.rank} için color 6 haneli HEX olmalı (örn: FFD700)`;
  }
  return null;
};

export default function GamificationSettings() {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<GamificationConfigDto | null>(null);
  const [editingAction, setEditingAction] = useState<GamificationActionAdminDto | null>(null);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await gamificationAdminService.getConfig();
      setConfig(data);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSaveAll = async () => {
    if (!config) return;

    if (config.maxXpPerAction < 0 || config.maxXpPerAction > 500) {
      enqueueSnackbar('maxXpPerAction 0..500 aralığında olmalı', { variant: 'error' });
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
      await gamificationAdminService.updateConfig(config);
      await loadConfig();
      enqueueSnackbar('Gamification ayarları kaydedildi', { variant: 'success' });
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
    { id: 'reason', label: 'Reason' },
    { id: 'xp', label: 'XP', align: 'center' as const },
    { id: 'label', label: 'Label' },
    { id: 'category', label: 'Category' },
    {
      id: 'dailyCap',
      label: 'Daily Cap',
      align: 'center' as const,
      render: (row: GamificationActionAdminDto) => (row.dailyCap ? 'Yes' : 'No'),
    },
  ], []);

  if (loading) {
    return <LoadingState message="Gamification ayarları yükleniyor..." />;
  }

  if (error || !config) {
    return (
      <PageContainer>
        <ErrorState
          title="Gamification ayarları yüklenemedi"
          message={error ?? 'Beklenmeyen bir hata oluştu'}
          onRetry={loadConfig}
        />
      </PageContainer>
    );
  }

  const sortedRewards = [...config.monthlyRewards.rewards].sort((a, b) => a.rank - b.rank);

  return (
    <PageContainer>
      <PageHeader
        title="Gamification"
        subtitle="Admin config: actions, daily social cap, monthly rewards"
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Gamification', active: true },
        ]}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<RefreshIcon />} onClick={() => loadConfig()}>
              Yenile
            </Button>
            <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveAll} disabled={saving}>
              Kaydet
            </Button>
          </Stack>
        }
      />

      <PageSection title="Action Yönetimi" subtitle="reason bazlı xp, label, description, icon, category, dailyCap">
        <DataTable
          columns={actionColumns}
          data={config.actions}
          renderRowActions={(row: GamificationActionAdminDto) => (
            <Button size="small" startIcon={<EditIcon />} onClick={() => setEditingAction({ ...row })}>
              Düzenle
            </Button>
          )}
        />
      </PageSection>

      <PageSection title="Daily Social Cap ve Limitler">
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              type="number"
              label="dailySocialCap.maxXp"
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
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              type="text"
              label="dailySocialCap.resetTime"
              helperText='Örn: "00:00 UTC"'
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
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              type="number"
              label="maxXpPerAction"
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
          </Grid>
          <Grid item xs={12}>
            <TextField
              type="text"
              label="dailySocialCap.affectedCategories"
              helperText="Virgül ile ayırarak girin (örn: social,community)"
              fullWidth
              value={config.dailySocialCap.affectedCategories.join(',')}
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
          </Grid>
        </Grid>
      </PageSection>

      <PageSection title="Aylık Ödüller" subtitle="monthlyRewards.rewards[rank=1..3]">
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary">
              Ay: {config.monthlyRewards.month ?? '-'} | Kalan gün: {config.monthlyRewards.daysRemaining ?? '-'}
            </Typography>
          </Grid>
          {sortedRewards.map((reward) => (
            <Grid item xs={12} md={4} key={reward.rank}>
              <Stack spacing={1.5}>
                <Typography variant="subtitle2">RANK {reward.rank}</Typography>
                <TextField
                  label="Title"
                  value={reward.title}
                  onChange={(e) => updateReward(reward.rank, (prev) => ({ ...prev, title: e.target.value }))}
                  fullWidth
                />
                <TextField
                  label="Description"
                  value={reward.description}
                  onChange={(e) => updateReward(reward.rank, (prev) => ({ ...prev, description: e.target.value }))}
                  fullWidth
                  multiline
                  rows={2}
                />
                <TextField
                  label="Icon"
                  value={reward.icon}
                  onChange={(e) => updateReward(reward.rank, (prev) => ({ ...prev, icon: e.target.value }))}
                  fullWidth
                />
                <TextField
                  label="Color (HEX)"
                  value={reward.color}
                  helperText="Örn: FFD700"
                  onChange={(e) => updateReward(reward.rank, (prev) => ({ ...prev, color: e.target.value.toUpperCase() }))}
                  fullWidth
                />
              </Stack>
            </Grid>
          ))}
        </Grid>
      </PageSection>

      <Dialog open={Boolean(editingAction)} onClose={() => setEditingAction(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Action Düzenle</DialogTitle>
        <DialogContent dividers>
          {editingAction && (
            <Box sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField label="Reason" value={editingAction.reason} disabled fullWidth />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    type="number"
                    label="XP"
                    value={editingAction.xp}
                    onChange={(e) => setEditingAction((prev) => (prev ? { ...prev, xp: Number(e.target.value) || 0 } : prev))}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Label"
                    value={editingAction.label}
                    onChange={(e) => setEditingAction((prev) => (prev ? { ...prev, label: e.target.value } : prev))}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Description"
                    value={editingAction.description}
                    onChange={(e) => setEditingAction((prev) => (prev ? { ...prev, description: e.target.value } : prev))}
                    fullWidth
                    multiline
                    rows={2}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Icon"
                    value={editingAction.icon}
                    onChange={(e) => setEditingAction((prev) => (prev ? { ...prev, icon: e.target.value } : prev))}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Category"
                    value={editingAction.category}
                    onChange={(e) => setEditingAction((prev) => (prev ? { ...prev, category: e.target.value } : prev))}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={Boolean(editingAction.dailyCap)}
                        onChange={(e) => setEditingAction((prev) => (prev ? { ...prev, dailyCap: e.target.checked } : prev))}
                      />
                    }
                    label="Daily Cap"
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditingAction(null)}>İptal</Button>
          <Button variant="contained" onClick={handleEditActionSave}>
            Uygula
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
