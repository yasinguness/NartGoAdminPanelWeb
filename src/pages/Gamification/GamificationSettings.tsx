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
  GamificationAuditItemDto,
  GamificationAuditPage,
  GamificationConfigDto,
  GamificationMonthlyRewardsDto,
  GamificationRulesDto,
  GamificationTogglesDto,
  MonthlyRewardRankDto,
} from '../../types/gamification/gamificationAdmin';
import { gamificationAdminService } from '../../services/gamification/gamificationAdminService';

const colorRegex = /^[A-Fa-f0-9]{6}$/;
const resetTimeRegex = /^([01]\d|2[0-3]):[0-5]\d UTC$/;

const getErrorMessage = (error: unknown): string => {
  const axiosError = error as AxiosError<{ message?: string }>;
  return axiosError?.response?.data?.message || (error instanceof Error ? error.message : 'Unknown error');
};

const toLocalDateTimeInputValue = (date: Date): string => {
  const pad = (num: number) => String(num).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const getMonthStart = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
};

const validateRules = (rules: GamificationRulesDto): string | null => {
  if (rules.dailySocialCapMaxXp < 0) return 'dailySocialCapMaxXp 0 veya üzeri olmalı';
  if (rules.maxXpPerAction < 0 || rules.maxXpPerAction > 500) return 'maxXpPerAction 0..500 aralığında olmalı';
  if (rules.referralMaxPerIpPerDay < 0) return 'referralMaxPerIpPerDay 0 veya üzeri olmalı';
  if (!resetTimeRegex.test(rules.dailySocialCapResetTime)) return 'dailySocialCapResetTime "HH:mm UTC" formatında olmalı';
  return null;
};

const validateAction = (action: GamificationActionAdminDto, maxXpPerAction: number): string | null => {
  if (action.xp < 0 || action.xp > 500) return `${action.reason} için xp 0..500 aralığında olmalı`;
  if (action.xp > maxXpPerAction) return `${action.reason} için xp, maxXpPerAction değerini aşamaz`;
  return null;
};

const validateMonthlyRewards = (monthlyRewards: GamificationMonthlyRewardsDto): string | null => {
  const rewards: Array<[string, MonthlyRewardRankDto]> = [
    ['rank1', monthlyRewards.rank1],
    ['rank2', monthlyRewards.rank2],
    ['rank3', monthlyRewards.rank3],
  ];
  for (const [rank, reward] of rewards) {
    if (!reward.title.trim()) return `${rank} için başlık zorunlu`;
    if (!reward.description.trim()) return `${rank} için açıklama zorunlu`;
    if (!reward.icon.trim()) return `${rank} için ikon zorunlu`;
    if (!colorRegex.test(reward.color)) return `${rank} için color 6 haneli HEX olmalı (örn: FFD700)`;
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
  const [audit, setAudit] = useState<GamificationAuditPage>({
    content: [],
    totalElements: 0,
    totalPages: 0,
    number: 0,
    size: 20,
    first: true,
    last: true,
    empty: true,
    hasNext: false,
    hasPrevious: false,
  });
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(1);
  const [auditSize] = useState(20);
  const [auditFrom, setAuditFrom] = useState<string>(toLocalDateTimeInputValue(getMonthStart()));
  const [auditTo, setAuditTo] = useState<string>(toLocalDateTimeInputValue(new Date()));

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

  const loadAudit = useCallback(async (page: number) => {
    try {
      setAuditLoading(true);
      const fromIso = auditFrom ? new Date(auditFrom).toISOString() : undefined;
      const toIso = auditTo ? new Date(auditTo).toISOString() : undefined;
      const auditPageResponse = await gamificationAdminService.getAudit({
        from: fromIso,
        to: toIso,
        page: page - 1,
        size: auditSize,
      });
      setAudit(auditPageResponse);
      setAuditPage((auditPageResponse.number ?? 0) + 1);
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' });
    } finally {
      setAuditLoading(false);
    }
  }, [auditFrom, auditTo, auditSize, enqueueSnackbar]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    loadAudit(1);
  }, [loadAudit]);

  const handleSaveAll = async () => {
    if (!config) return;
    const rulesError = validateRules(config.rules);
    if (rulesError) {
      enqueueSnackbar(rulesError, { variant: 'error' });
      return;
    }
    const rewardsError = validateMonthlyRewards(config.monthlyRewards);
    if (rewardsError) {
      enqueueSnackbar(rewardsError, { variant: 'error' });
      return;
    }
    const actionError = config.actions
      .map((action) => validateAction(action, config.rules.maxXpPerAction))
      .find((message): message is string => Boolean(message));
    if (actionError) {
      enqueueSnackbar(actionError, { variant: 'error' });
      return;
    }

    try {
      setSaving(true);
      const updated = await gamificationAdminService.updateConfig(config);
      setConfig(updated);
      enqueueSnackbar('Gamification ayarları kaydedildi', { variant: 'success' });
      await loadAudit(1);
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handlePatchAction = async () => {
    if (!config || !editingAction) return;
    const validationError = validateAction(editingAction, config.rules.maxXpPerAction);
    if (validationError) {
      enqueueSnackbar(validationError, { variant: 'error' });
      return;
    }

    try {
      const updated = await gamificationAdminService.patchAction(editingAction.reason, {
        xp: editingAction.xp,
        label: editingAction.label,
        description: editingAction.description,
        icon: editingAction.icon,
        category: editingAction.category,
        enabled: editingAction.enabled,
        dailyCap: editingAction.dailyCap,
      });
      setConfig((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          actions: prev.actions.map((action) => (action.reason === updated.reason ? updated : action)),
        };
      });
      setEditingAction(null);
      enqueueSnackbar(`"${updated.reason}" güncellendi`, { variant: 'success' });
      await loadAudit(1);
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' });
    }
  };

  const handleSaveRules = async () => {
    if (!config) return;
    const validationError = validateRules(config.rules);
    if (validationError) {
      enqueueSnackbar(validationError, { variant: 'error' });
      return;
    }

    try {
      const rules = await gamificationAdminService.updateRules(config.rules);
      setConfig((prev) => (prev ? { ...prev, rules } : prev));
      enqueueSnackbar('Kurallar kaydedildi', { variant: 'success' });
      await loadAudit(1);
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' });
    }
  };

  const handleSaveMonthlyRewards = async () => {
    if (!config) return;
    const validationError = validateMonthlyRewards(config.monthlyRewards);
    if (validationError) {
      enqueueSnackbar(validationError, { variant: 'error' });
      return;
    }

    try {
      const monthlyRewards = await gamificationAdminService.updateMonthlyRewards(config.monthlyRewards);
      setConfig((prev) => (prev ? { ...prev, monthlyRewards } : prev));
      enqueueSnackbar('Aylık ödüller kaydedildi', { variant: 'success' });
      await loadAudit(1);
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' });
    }
  };

  const handleSaveToggles = async () => {
    if (!config) return;
    try {
      const toggles = await gamificationAdminService.updateToggles(config.toggles);
      setConfig((prev) => (prev ? { ...prev, toggles } : prev));
      enqueueSnackbar('Toggle ayarları kaydedildi', { variant: 'success' });
      await loadAudit(1);
    } catch (e) {
      enqueueSnackbar(getErrorMessage(e), { variant: 'error' });
    }
  };

  const actionColumns = useMemo(() => [
    { id: 'reason', label: 'Reason' },
    { id: 'xp', label: 'XP', align: 'center' as const },
    { id: 'label', label: 'Label' },
    { id: 'category', label: 'Category' },
    {
      id: 'enabled',
      label: 'Enabled',
      align: 'center' as const,
      render: (row: GamificationActionAdminDto) => (row.enabled ? 'Yes' : 'No'),
    },
    {
      id: 'dailyCap',
      label: 'Daily Cap',
      align: 'center' as const,
      render: (row: GamificationActionAdminDto) => (row.dailyCap ? 'Yes' : 'No'),
    },
  ], []);

  const auditColumns = useMemo(() => [
    { id: 'createdAt', label: 'Date', render: (row: GamificationAuditItemDto) => new Date(row.createdAt).toLocaleString() },
    { id: 'actorEmail', label: 'Actor' },
    { id: 'action', label: 'Action' },
    { id: 'target', label: 'Target' },
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

  return (
    <PageContainer>
      <PageHeader
        title="Gamification"
        subtitle="Puan aksiyonları, kurallar, ödüller ve log yönetimi"
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
              Tümünü Kaydet
            </Button>
          </Stack>
        }
      />

      <PageSection
        title="Action Yönetimi"
        subtitle="Aksiyon bazında XP, etiket ve aktiflik ayarları"
      >
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

      <PageSection
        title="Kurallar"
        headerActions={
          <Button variant="contained" onClick={handleSaveRules}>
            Kuralları Kaydet
          </Button>
        }
      >
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <TextField
              type="number"
              label="dailySocialCapMaxXp"
              fullWidth
              value={config.rules.dailySocialCapMaxXp}
              onChange={(e) => setConfig((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  rules: { ...prev.rules, dailySocialCapMaxXp: Number(e.target.value) || 0 },
                };
              })}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              type="text"
              label="dailySocialCapResetTime"
              helperText='Örn: "00:00 UTC"'
              fullWidth
              value={config.rules.dailySocialCapResetTime}
              onChange={(e) => setConfig((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  rules: { ...prev.rules, dailySocialCapResetTime: e.target.value },
                };
              })}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              type="number"
              label="maxXpPerAction"
              fullWidth
              value={config.rules.maxXpPerAction}
              onChange={(e) => setConfig((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  rules: { ...prev.rules, maxXpPerAction: Number(e.target.value) || 0 },
                };
              })}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField
              type="number"
              label="referralMaxPerIpPerDay"
              fullWidth
              value={config.rules.referralMaxPerIpPerDay}
              onChange={(e) => setConfig((prev) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  rules: { ...prev.rules, referralMaxPerIpPerDay: Number(e.target.value) || 0 },
                };
              })}
            />
          </Grid>
        </Grid>
      </PageSection>

      <PageSection
        title="Aylık Ödüller"
        headerActions={
          <Button variant="contained" onClick={handleSaveMonthlyRewards}>
            Ödülleri Kaydet
          </Button>
        }
      >
        <Grid container spacing={2}>
          {(['rank1', 'rank2', 'rank3'] as const).map((rank) => (
            <Grid item xs={12} md={4} key={rank}>
              <Stack spacing={1.5}>
                <Typography variant="subtitle2">{rank.toUpperCase()}</Typography>
                <TextField
                  label="Title"
                  value={config.monthlyRewards[rank].title}
                  onChange={(e) => setConfig((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      monthlyRewards: {
                        ...prev.monthlyRewards,
                        [rank]: { ...prev.monthlyRewards[rank], title: e.target.value },
                      },
                    };
                  })}
                  fullWidth
                />
                <TextField
                  label="Description"
                  value={config.monthlyRewards[rank].description}
                  onChange={(e) => setConfig((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      monthlyRewards: {
                        ...prev.monthlyRewards,
                        [rank]: { ...prev.monthlyRewards[rank], description: e.target.value },
                      },
                    };
                  })}
                  fullWidth
                  multiline
                  rows={2}
                />
                <TextField
                  label="Icon"
                  value={config.monthlyRewards[rank].icon}
                  onChange={(e) => setConfig((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      monthlyRewards: {
                        ...prev.monthlyRewards,
                        [rank]: { ...prev.monthlyRewards[rank], icon: e.target.value },
                      },
                    };
                  })}
                  fullWidth
                />
                <TextField
                  label="Color (HEX)"
                  value={config.monthlyRewards[rank].color}
                  helperText="Örn: FFD700"
                  onChange={(e) => setConfig((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      monthlyRewards: {
                        ...prev.monthlyRewards,
                        [rank]: { ...prev.monthlyRewards[rank], color: e.target.value.toUpperCase() },
                      },
                    };
                  })}
                  fullWidth
                />
              </Stack>
            </Grid>
          ))}
        </Grid>
      </PageSection>

      <PageSection
        title="Toggle Yönetimi"
        headerActions={
          <Button variant="contained" onClick={handleSaveToggles}>
            Toggles Kaydet
          </Button>
        }
      >
        <Grid container spacing={1}>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.toggles.gamificationEnabled}
                  onChange={(e) => setConfig((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      toggles: { ...prev.toggles, gamificationEnabled: e.target.checked },
                    };
                  })}
                />
              }
              label="gamificationEnabled"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.toggles.referralEnabled}
                  onChange={(e) => setConfig((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      toggles: { ...prev.toggles, referralEnabled: e.target.checked },
                    };
                  })}
                />
              }
              label="referralEnabled"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.toggles.streakEnabled}
                  onChange={(e) => setConfig((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      toggles: { ...prev.toggles, streakEnabled: e.target.checked },
                    };
                  })}
                />
              }
              label="streakEnabled"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.toggles.businessReportEnabled}
                  onChange={(e) => setConfig((prev) => {
                    if (!prev) return prev;
                    return {
                      ...prev,
                      toggles: { ...prev.toggles, businessReportEnabled: e.target.checked },
                    };
                  })}
                />
              }
              label="businessReportEnabled"
            />
          </Grid>
        </Grid>
      </PageSection>

      <PageSection
        title="Audit Log"
        subtitle="Admin değişiklik geçmişi"
        headerActions={
          <Stack direction="row" spacing={1}>
            <TextField
              type="datetime-local"
              size="small"
              value={auditFrom}
              onChange={(e) => setAuditFrom(e.target.value)}
            />
            <TextField
              type="datetime-local"
              size="small"
              value={auditTo}
              onChange={(e) => setAuditTo(e.target.value)}
            />
            <Button variant="outlined" onClick={() => loadAudit(1)} disabled={auditLoading}>
              Filtrele
            </Button>
          </Stack>
        }
      >
        <DataTable
          columns={auditColumns}
          data={audit.content}
          loading={auditLoading}
          pagination={{
            page: auditPage,
            pageSize: auditSize,
            total: audit.totalElements,
            onPageChange: (page) => loadAudit(page),
          }}
        />
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
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editingAction.enabled}
                        onChange={(e) => setEditingAction((prev) => (prev ? { ...prev, enabled: e.target.checked } : prev))}
                      />
                    }
                    label="Enabled"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={editingAction.dailyCap}
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
          <Button variant="contained" onClick={handlePatchAction}>
            Kaydet
          </Button>
        </DialogActions>
      </Dialog>
    </PageContainer>
  );
}
